import { connection } from "next/server";
import { api } from "@/server/http/api";
import { getSystemStatus } from "@/server/status";

/** GET /api/status – Systemstatus für das HUD (Anbieter, Module, Speicher). */
export const GET = api(async (_request, { userId }) => {
  await connection();
  return Response.json(await getSystemStatus(userId));
});
