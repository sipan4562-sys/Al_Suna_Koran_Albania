import { connection } from "next/server";

/** GET /api/health – öffentlicher, minimaler Health-Check (z. B. für Docker). */
export async function GET() {
  await connection();
  return Response.json({ ok: true, time: new Date().toISOString() });
}
