// Vercel: Server-Kern mit Postgres (Supabase) als Speicher und Vercel AI Gateway für die Inhaltsprüfung
import { waitUntil } from "@vercel/functions";
import { getVercelOidcToken } from "@vercel/oidc";
import Anthropic from "@anthropic-ai/sdk";
import { handle } from "./core";

const anthropicFactory = async () =>
  new Anthropic({
    apiKey: process.env.AI_GATEWAY_API_KEY || (await getVercelOidcToken()),
    baseURL: "https://ai-gateway.vercel.sh",
    maxRetries: 3,
  });

async function main(req: Request) {
  const url = new URL(req.url);
  const p = url.searchParams.get("__p");
  const route = p ?? url.pathname.replace(/^\/api\/?/, "");
  return handle(req, { waitUntil, anthropicFactory }, route);
}
export const GET = main;
export const POST = main;
export const PUT = main;
export const DELETE = main;
