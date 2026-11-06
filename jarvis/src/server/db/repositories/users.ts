import "server-only";
import { eq, sql } from "drizzle-orm";
import type { ProfileSettings } from "@/lib/shared/types";
import { sanitizeProfile } from "@/server/validation";
import { getDb } from "../client";
import { users } from "../schema";

/** Einzelbenutzer-Betrieb: alle Daten gehören diesem Benutzer. */
export const DEFAULT_USER_ID = "default";

export async function ensureUser(userId: string = DEFAULT_USER_ID): Promise<void> {
  const db = await getDb();
  const now = Date.now();
  await db
    .insert(users)
    .values({ id: userId, name: "", settings: "{}", createdAt: now, updatedAt: now })
    .onConflictDoNothing();
}

export async function getProfile(userId: string = DEFAULT_USER_ID): Promise<ProfileSettings> {
  const db = await getDb();
  const row = await db.query.users.findFirst({ where: eq(users.id, userId) });
  if (!row) {
    await ensureUser(userId);
    return sanitizeProfile({});
  }
  let parsed: unknown = {};
  try {
    parsed = JSON.parse(row.settings);
  } catch {
    parsed = {};
  }
  return sanitizeProfile(parsed);
}

/**
 * Teilaktualisierung des Profils. Die Zusammenführung passiert atomar in
 * SQLite (`json_patch`), damit sich gleichzeitige Änderungen nicht
 * gegenseitig überschreiben (kein Read-Modify-Write in JavaScript).
 */
export async function updateProfile(
  userId: string,
  patch: Partial<ProfileSettings>,
): Promise<ProfileSettings> {
  await ensureUser(userId);
  // Nur bekannte, gültige Felder übernehmen.
  const clean = sanitizeProfile({ ...(await getProfile(userId)), ...patch });
  const fields = Object.fromEntries(
    Object.keys(patch)
      .filter((key) => key in clean)
      .map((key) => [key, clean[key as keyof ProfileSettings]]),
  );
  const db = await getDb();
  await db
    .update(users)
    .set({
      settings: sql`json_patch(CASE WHEN json_valid(${users.settings}) THEN ${users.settings} ELSE '{}' END, ${JSON.stringify(fields)})`,
      ...(typeof fields.userName === "string" ? { name: fields.userName } : {}),
      updatedAt: Date.now(),
    })
    .where(eq(users.id, userId));
  return getProfile(userId);
}
