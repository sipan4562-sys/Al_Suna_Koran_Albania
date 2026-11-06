import "server-only";
import type { SystemModule, SystemStatus } from "@/lib/shared/types";
import { getProviderSetup } from "@/server/ai/registry";
import { authEnabled } from "@/server/auth/session";
import { getEnv } from "@/server/config/env";
import { getStorageInfo } from "@/server/db/client";
import { countConversations } from "@/server/db/repositories/conversations";
import { countMemories } from "@/server/db/repositories/memories";
import { PLANNED_MODULES, skillModules } from "@/server/skills/registry";
import { serverSttProvider, serverTtsProvider } from "@/server/speech";
import packageJson from "../../package.json";

export async function getSystemStatus(userId: string): Promise<SystemStatus> {
  const env = getEnv();
  const setup = getProviderSetup();
  const storage = getStorageInfo();
  const tts = serverTtsProvider();
  const stt = serverSttProvider();

  let memoryCount = 0;
  let conversationCount = 0;
  let storageOk = true;
  try {
    [memoryCount, conversationCount] = await Promise.all([countMemories(userId), countConversations(userId)]);
  } catch (error) {
    storageOk = false;
    console.error("[jarvis] Datenbank nicht erreichbar:", error);
  }

  const webSearch = setup.primary.id === "anthropic" && env.ANTHROPIC_WEB_SEARCH;
  const modules: SystemModule[] = [
    {
      id: "core",
      name: "KI-Kern",
      description: setup.demo ? "Demo-Modus – kein API-Schlüssel" : `${setup.primary.label} · ${setup.primary.model}`,
      status: setup.demo ? "standby" : "online",
    },
    {
      id: "voice-out",
      name: "Sprachausgabe",
      description: tts ? `Neuronale Stimme (${tts === "openai" ? "OpenAI" : "ElevenLabs"})` : "Browser-Stimmen",
      status: "online",
    },
    {
      id: "voice-in",
      name: "Spracherkennung",
      description: stt ? "Browser + Server (OpenAI)" : "Browser (Web Speech API)",
      status: "online",
    },
    {
      id: "storage",
      name: "Datenspeicher",
      description: storageOk
        ? storage.persistent
          ? storage.driver === "remote"
            ? "Cloud-Datenbank (libSQL)"
            : "Lokale SQLite-Datenbank"
          : "Flüchtiger Speicher"
        : "Nicht erreichbar",
      status: storageOk ? (storage.persistent ? "online" : "standby") : "offline",
    },
    ...skillModules(),
    {
      id: "websearch",
      name: "Websuche",
      description: webSearch ? "Aktuelle Informationen aus dem Web" : "Aktivierbar mit ANTHROPIC_WEB_SEARCH",
      status: webSearch ? "online" : "standby",
    },
    ...PLANNED_MODULES,
  ];

  return {
    online: storageOk,
    version: packageJson.version,
    ai: {
      provider: setup.primary.id,
      providerLabel: setup.primary.label,
      model: setup.primary.model,
      fallback: setup.fallback ? `${setup.fallback.label} · ${setup.fallback.model}` : null,
      demo: setup.demo,
    },
    speech: { serverTts: tts, serverStt: stt },
    storage: { driver: storage.driver, persistent: storage.persistent },
    auth: { enabled: authEnabled() },
    modules,
    memoryCount,
    conversationCount,
    serverTime: new Date().toISOString(),
  };
}
