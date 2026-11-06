import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_PROFILE } from "@/lib/shared/types";
import { executeTool, toolJsonSchema } from "@/server/ai/tools";
import { memorySkill } from "@/server/skills/memory";
import { activeTools } from "@/server/skills/registry";
import { describeWeatherCode, weatherSkill } from "@/server/skills/weather";
import { resetEnvCache } from "@/server/config/env";
import { setupTestEnvironment } from "../support/test-env";

let cleanup: () => void;
beforeAll(() => {
  cleanup = setupTestEnvironment({ SKILL_WEATHER: "true" });
});
afterAll(() => cleanup());

const ctx = (homeCity = "") => ({
  userId: "default",
  profile: { ...DEFAULT_PROFILE, homeCity },
  timezone: "Europe/Berlin",
  signal: new AbortController().signal,
});

const getWeather = weatherSkill.tools[0];

function mockOpenMeteo() {
  const fetchMock = vi.fn(async (url: string) => {
    if (url.includes("geocoding-api")) {
      const name = new URL(url).searchParams.get("name");
      if (name === "Nirgendwo") return Response.json({});
      return Response.json({
        results: [
          { name: "Springfield", latitude: 39.8, longitude: -89.6, country: "Vereinigte Staaten", admin1: "Illinois" },
          { name: "Springfield", latitude: 42.1, longitude: -72.5, country: "Vereinigte Staaten", admin1: "Massachusetts" },
          { name: name ?? "Berlin", latitude: 52.52, longitude: 13.41, country: "Deutschland", admin1: "Berlin" },
        ],
      });
    }
    return Response.json({
      timezone: "Europe/Berlin",
      current: { time: "2026-11-06T19:00", temperature_2m: 8.4, apparent_temperature: 6.1, weather_code: 61, wind_speed_10m: 12, relative_humidity_2m: 81, precipitation: 0.3, is_day: 0 },
      daily: {
        time: ["2026-11-06"],
        weather_code: [63],
        temperature_2m_max: [10.2],
        temperature_2m_min: [4.1],
        precipitation_probability_max: [80],
        precipitation_sum: [3.2],
        sunrise: ["2026-11-06T07:14"],
        sunset: ["2026-11-06T16:32"],
        uv_index_max: [1.2],
      },
    });
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("Werkzeug-Infrastruktur", () => {
  it("erzeugt gültige JSON-Schemas", () => {
    const schema = toolJsonSchema(getWeather);
    expect(schema).toMatchObject({ type: "object", additionalProperties: false });
    expect(schema).not.toHaveProperty("$schema");
    expect(Object.keys(schema.properties)).toEqual(["location", "days"]);
  });

  it("aktiviert Werkzeuge abhängig von der Konfiguration", () => {
    expect(activeTools().map((t) => t.name)).toEqual(["forget_fact", "get_weather", "remember_fact", "search_memory"]);
    process.env.SKILL_WEATHER = "false";
    resetEnvCache();
    expect(activeTools().map((t) => t.name)).not.toContain("get_weather");
    process.env.SKILL_WEATHER = "true";
    resetEnvCache();
  });

  it("validiert Eingaben des Modells und meldet unbekannte Werkzeuge", async () => {
    const invalid = await executeTool(getWeather, "get_weather", "c1", { days: 99 }, ctx());
    expect(invalid.result.ok).toBe(false);
    expect(invalid.result.content).toContain("INVALID_INPUT");
    const unknown = await executeTool(undefined, "rm_rf", "c2", {}, ctx());
    expect(unknown.activity.status).toBe("error");
  });
});

describe("Wetter-Skill", () => {
  beforeEach(() => vi.unstubAllGlobals());

  it("liefert aktuelle Werte und Vorhersage", async () => {
    mockOpenMeteo();
    const run = await executeTool(getWeather, "get_weather", "w1", { location: "Hamburg", days: 1 }, ctx());
    expect(run.result.ok).toBe(true);
    const data = JSON.parse(run.result.content);
    expect(data.current).toMatchObject({ temperature_c: 8.4, condition: "leichter Regen" });
    expect(data.daily[0]).toMatchObject({ condition: "Regen", sunrise: "07:14", precipitation_probability_pct: 80 });
    expect(run.activity.detail).toContain("8 °C");
  });

  it("nutzt Länderhinweise zur Auswahl gleichnamiger Orte", async () => {
    mockOpenMeteo();
    const run = await executeTool(getWeather, "get_weather", "w2", { location: "Springfield, Massachusetts" }, ctx());
    expect(JSON.parse(run.result.content).location).toContain("Massachusetts");
  });

  it("fällt auf den Heimatort zurück bzw. fragt nach", async () => {
    const fetchMock = mockOpenMeteo();
    const home = await executeTool(getWeather, "get_weather", "w3", {}, ctx("Berlin"));
    expect(home.result.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalled();
    const none = await executeTool(getWeather, "get_weather", "w4", {}, ctx(""));
    expect(none.result.ok).toBe(false);
    expect(none.activity.detail).toBe("Kein Ort angegeben");
  });

  it("meldet unbekannte Orte", async () => {
    mockOpenMeteo();
    const run = await executeTool(getWeather, "get_weather", "w5", { location: "Nirgendwo" }, ctx());
    expect(run.result.ok).toBe(false);
    expect(run.activity.detail).toContain("Nirgendwo");
  });

  it("übersetzt WMO-Wettercodes", () => {
    expect(describeWeatherCode(0)).toBe("klarer Himmel");
    expect(describeWeatherCode(95)).toBe("Gewitter");
    expect(describeWeatherCode(1234)).toBe("unbekannt");
  });
});

describe("Gedächtnis-Skill", () => {
  it("merkt sich, findet und vergisst Fakten", async () => {
    const [remember, forget, search] = memorySkill.tools;
    const saved = await executeTool(remember, remember.name, "m1", { fact: "Der Nutzer heißt Tony." }, ctx());
    expect(saved.activity).toMatchObject({ status: "success", detail: "Gespeichert" });
    const found = await executeTool(search, search.name, "m2", { query: "Tony" }, ctx());
    expect(JSON.parse(found.result.content).results).toHaveLength(1);
    const removed = await executeTool(forget, forget.name, "m3", { query: "Tony" }, ctx());
    expect(JSON.parse(removed.result.content).deleted).toEqual(["Der Nutzer heißt Tony."]);
  });
});
