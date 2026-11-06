import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  createConversation,
  deleteAllConversations,
  deleteConversation,
  getConversation,
  insertMessage,
  listConversations,
  listMessages,
  recentMessages,
  renameConversation,
} from "@/server/db/repositories/conversations";
import {
  addMemory,
  countMemories,
  deleteMemoriesMatching,
  listMemories,
  searchMemories,
} from "@/server/db/repositories/memories";
import { getProfile, updateProfile } from "@/server/db/repositories/users";
import { setupTestEnvironment } from "../support/test-env";

let cleanup: () => void;
beforeAll(() => {
  cleanup = setupTestEnvironment();
});
afterAll(() => cleanup());

describe("Unterhaltungen", () => {
  it("speichert Nachrichten und liefert Anzahl und Vorschau", async () => {
    const conversation = await createConversation("default", "Test");
    await insertMessage({ conversationId: conversation.id, role: "user", content: "Hallo", createdAt: 1000 });
    await insertMessage({ conversationId: conversation.id, role: "assistant", content: "Guten Tag!", createdAt: 1001 });

    const list = await listConversations("default");
    const entry = list.find((c) => c.id === conversation.id);
    expect(entry).toMatchObject({ title: "Test", messageCount: 2, preview: "Guten Tag!" });

    const messages = await listMessages(conversation.id);
    expect(messages.map((m) => m.role)).toEqual(["user", "assistant"]);
    expect((await recentMessages(conversation.id, 1)).map((m) => m.content)).toEqual(["Guten Tag!"]);
  });

  it("trennt Daten verschiedener Benutzer", async () => {
    const own = await createConversation("default", "Meins");
    expect(await getConversation("someone-else", own.id)).toBeNull();
    expect(await renameConversation("someone-else", own.id, "Gekapert")).toBe(false);
    expect(await deleteConversation("someone-else", own.id)).toBe(false);
  });

  it("benennt um und löscht samt Nachrichten", async () => {
    const conversation = await createConversation("default", "Alt");
    await insertMessage({ conversationId: conversation.id, role: "user", content: "x" });
    expect(await renameConversation("default", conversation.id, "Neu")).toBe(true);
    expect((await getConversation("default", conversation.id))?.title).toBe("Neu");
    expect(await deleteConversation("default", conversation.id)).toBe(true);
    expect(await listMessages(conversation.id)).toEqual([]);
  });

  it("löscht den gesamten Verlauf eines Benutzers", async () => {
    await createConversation("default", "A");
    await deleteAllConversations("default");
    expect(await listConversations("default")).toEqual([]);
  });
});

describe("Gedächtnis", () => {
  it("speichert, erkennt Duplikate und sucht", async () => {
    const first = await addMemory("default", "Trinkt Kaffee schwarz", "praeferenz");
    expect(first.status).toBe("created");
    const duplicate = await addMemory("default", "  trinkt   kaffee SCHWARZ ");
    expect(duplicate.status).toBe("duplicate");
    expect(await countMemories("default")).toBe(1);
    expect((await searchMemories("default", "kaffee")).length).toBe(1);
  });

  it("behandelt LIKE-Sonderzeichen wörtlich", async () => {
    await addMemory("default", "Rabatt von 50% auf alles");
    await addMemory("default", "Mag Tee");
    expect((await searchMemories("default", "%")).map((m) => m.content)).toEqual(["Rabatt von 50% auf alles"]);
    expect(await searchMemories("default", "_")).toEqual([]);
  });

  it("vergisst passende Fakten", async () => {
    const deleted = await deleteMemoriesMatching("default", "Tee");
    expect(deleted.map((m) => m.content)).toEqual(["Mag Tee"]);
    expect((await listMemories("default")).some((m) => m.content === "Mag Tee")).toBe(false);
  });
});

describe("Profil", () => {
  it("liefert Standardwerte und speichert Änderungen bereinigt", async () => {
    const initial = await getProfile("default");
    expect(initial.personality).toBe("classic");
    const updated = await updateProfile("default", { userName: "  Tony  ", homeCity: "Malibu" });
    expect(updated).toMatchObject({ userName: "Tony", homeCity: "Malibu", language: "de-DE" });
    expect(await getProfile("default")).toEqual(updated);
  });

  it("verliert bei gleichzeitigen Änderungen keine Felder", async () => {
    await Promise.all([
      updateProfile("default", { userName: "Pepper" }),
      updateProfile("default", { personality: "witty" }),
      updateProfile("default", { formOfAddress: "Chefin" }),
      updateProfile("default", { homeCity: "New York" }),
    ]);
    expect(await getProfile("default")).toMatchObject({
      userName: "Pepper",
      personality: "witty",
      formOfAddress: "Chefin",
      homeCity: "New York",
    });
  });
});
