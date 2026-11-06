import "server-only";
import { z } from "zod";
import { getEnv } from "@/server/config/env";
import type { ToolDefinition } from "@/server/ai/types";
import type { Skill } from "./types";

/**
 * Wetter über Open-Meteo (https://open-meteo.com) – kostenlos und ohne
 * API-Schlüssel für nicht-kommerzielle Nutzung.
 */

const WEATHER_CODES: Record<number, string> = {
  0: "klarer Himmel",
  1: "überwiegend klar",
  2: "teilweise bewölkt",
  3: "bedeckt",
  45: "Nebel",
  48: "gefrierender Nebel",
  51: "leichter Nieselregen",
  53: "Nieselregen",
  55: "starker Nieselregen",
  56: "gefrierender Nieselregen",
  57: "starker gefrierender Nieselregen",
  61: "leichter Regen",
  63: "Regen",
  65: "starker Regen",
  66: "gefrierender Regen",
  67: "starker gefrierender Regen",
  71: "leichter Schneefall",
  73: "Schneefall",
  75: "starker Schneefall",
  77: "Schneegriesel",
  80: "leichte Regenschauer",
  81: "Regenschauer",
  82: "heftige Regenschauer",
  85: "leichte Schneeschauer",
  86: "starke Schneeschauer",
  95: "Gewitter",
  96: "Gewitter mit leichtem Hagel",
  99: "Gewitter mit starkem Hagel",
};

export const describeWeatherCode = (code: number | undefined): string =>
  code === undefined ? "unbekannt" : (WEATHER_CODES[code] ?? "unbekannt");

interface GeoResult {
  name: string;
  latitude: number;
  longitude: number;
  country?: string;
  admin1?: string;
}

interface CacheEntry<T> {
  value: T;
  expires: number;
}

const geoCache = new Map<string, CacheEntry<GeoResult | null>>();
const forecastCache = new Map<string, CacheEntry<unknown>>();

function cacheGet<T>(cache: Map<string, CacheEntry<T>>, key: string): T | undefined {
  const entry = cache.get(key);
  if (!entry) return undefined;
  if (entry.expires < Date.now()) {
    cache.delete(key);
    return undefined;
  }
  return entry.value;
}

function cacheSet<T>(cache: Map<string, CacheEntry<T>>, key: string, value: T, ttlMs: number) {
  if (cache.size > 200) cache.delete(cache.keys().next().value as string);
  cache.set(key, { value, expires: Date.now() + ttlMs });
}

async function fetchJson(url: string, signal: AbortSignal): Promise<unknown> {
  const response = await fetch(url, {
    signal: AbortSignal.any([signal, AbortSignal.timeout(8_000)]),
    headers: { Accept: "application/json", "User-Agent": "JARVIS-Assistant/1.0" },
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

export async function geocode(query: string, signal: AbortSignal): Promise<GeoResult | null> {
  const [namePart, ...hintParts] = query.split(",").map((p) => p.trim()).filter(Boolean);
  if (!namePart) return null;
  const hint = hintParts.join(" ").toLowerCase();
  const key = `${namePart.toLowerCase()}|${hint}`;
  const cached = cacheGet(geoCache, key);
  if (cached !== undefined) return cached;

  const url =
    "https://geocoding-api.open-meteo.com/v1/search?" +
    new URLSearchParams({ name: namePart, count: "5", language: "de", format: "json" });
  const data = (await fetchJson(url, signal)) as { results?: GeoResult[] };
  const results = data.results ?? [];
  const match =
    (hint &&
      results.find((r) =>
        [r.country, r.admin1].some((field) => field?.toLowerCase().includes(hint)),
      )) ||
    results[0] ||
    null;
  cacheSet(geoCache, key, match, 24 * 60 * 60 * 1000);
  return match;
}

const hhmm = (isoLocal: string | undefined) => (isoLocal ? isoLocal.slice(11, 16) : undefined);

interface ForecastResponse {
  current?: {
    time?: string;
    temperature_2m?: number;
    apparent_temperature?: number;
    relative_humidity_2m?: number;
    precipitation?: number;
    weather_code?: number;
    wind_speed_10m?: number;
    wind_gusts_10m?: number;
    is_day?: number;
  };
  daily?: {
    time?: string[];
    weather_code?: number[];
    temperature_2m_max?: number[];
    temperature_2m_min?: number[];
    precipitation_probability_max?: (number | null)[];
    precipitation_sum?: number[];
    sunrise?: string[];
    sunset?: string[];
    uv_index_max?: (number | null)[];
  };
  timezone?: string;
}

export async function fetchForecast(geo: GeoResult, days: number, signal: AbortSignal) {
  const key = `${geo.latitude.toFixed(2)},${geo.longitude.toFixed(2)}|${days}`;
  const cached = cacheGet(forecastCache, key) as ForecastResponse | undefined;
  const data =
    cached ??
    ((await fetchJson(
      "https://api.open-meteo.com/v1/forecast?" +
        new URLSearchParams({
          latitude: String(geo.latitude),
          longitude: String(geo.longitude),
          current:
            "temperature_2m,apparent_temperature,relative_humidity_2m,precipitation,weather_code,wind_speed_10m,wind_gusts_10m,is_day",
          daily:
            "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum,sunrise,sunset,uv_index_max",
          timezone: "auto",
          forecast_days: String(days),
          wind_speed_unit: "kmh",
        }),
      signal,
    )) as ForecastResponse);
  if (!cached) cacheSet(forecastCache, key, data, 10 * 60 * 1000);

  const d = data.daily ?? {};
  const daily = (d.time ?? []).map((date, i) => ({
    date,
    condition: describeWeatherCode(d.weather_code?.[i]),
    min_c: d.temperature_2m_min?.[i],
    max_c: d.temperature_2m_max?.[i],
    precipitation_probability_pct: d.precipitation_probability_max?.[i] ?? undefined,
    precipitation_mm: d.precipitation_sum?.[i],
    uv_index_max: d.uv_index_max?.[i] ?? undefined,
    sunrise: hhmm(d.sunrise?.[i]),
    sunset: hhmm(d.sunset?.[i]),
  }));

  const c = data.current ?? {};
  return {
    location: [geo.name, geo.admin1, geo.country].filter(Boolean).join(", "),
    timezone: data.timezone,
    current: {
      observed_at: c.time,
      temperature_c: c.temperature_2m,
      feels_like_c: c.apparent_temperature,
      condition: describeWeatherCode(c.weather_code),
      humidity_pct: c.relative_humidity_2m,
      precipitation_mm: c.precipitation,
      wind_kmh: c.wind_speed_10m,
      gusts_kmh: c.wind_gusts_10m,
      is_day: c.is_day === 1,
    },
    daily,
    source: "Open-Meteo",
  };
}

const WeatherInput = z.object({
  location: z
    .string()
    .trim()
    .min(1)
    .max(100)
    .optional()
    .describe(
      "Ort (Stadt, optional mit Land, z. B. 'Wien, Österreich'). Weglassen, um den Heimatort des Nutzers zu verwenden.",
    ),
  days: z
    .number()
    .int()
    .min(1)
    .max(7)
    .optional()
    .describe("Anzahl Vorhersagetage inklusive heute (1–7). Standard: 3."),
});

const getWeather: ToolDefinition<z.infer<typeof WeatherInput>> = {
  name: "get_weather",
  description:
    "Liefert aktuelles Wetter und eine Tagesvorhersage (bis 7 Tage) für einen Ort. " +
    "Nutze dieses Werkzeug immer, wenn nach Wetter, Temperatur, Regen, Wind oder Kleidung " +
    "passend zum Wetter gefragt wird. Rate niemals Wetterdaten.",
  schema: WeatherInput,
  label: (input) => (input.location ? `Wetter: ${input.location}` : "Wetter am Heimatort"),
  async run(input, ctx) {
    const place = input.location ?? ctx.profile.homeCity;
    if (!place) {
      return {
        ok: false,
        content: JSON.stringify({
          error:
            "No location given and the user has no home city configured. Ask the user for the city (they can also set a home city in the settings).",
        }),
        summary: "Kein Ort angegeben",
      };
    }
    const geo = await geocode(place, ctx.signal);
    if (!geo) {
      return {
        ok: false,
        content: JSON.stringify({ error: `Location not found: ${place}` }),
        summary: `Ort nicht gefunden: ${place}`,
      };
    }
    const forecast = await fetchForecast(geo, input.days ?? 3, ctx.signal);
    const t = forecast.current.temperature_c;
    return {
      ok: true,
      content: JSON.stringify(forecast),
      summary: `${geo.name}: ${t !== undefined ? `${Math.round(t)} °C, ` : ""}${forecast.current.condition}`,
    };
  },
};

export const weatherSkill: Skill = {
  id: "weather",
  name: "Wetter",
  description: "Aktuelle Wetterdaten und Vorhersagen (Open-Meteo)",
  status: () => (getEnv().SKILL_WEATHER ? "online" : "offline"),
  tools: [getWeather],
  promptHint:
    "Für Wetterfragen nutzt du das Werkzeug get_weather. Fehlt der Ort und ist kein Heimatort bekannt, frag kurz nach.",
};
