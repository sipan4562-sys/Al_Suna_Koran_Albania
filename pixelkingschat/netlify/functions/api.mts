import type { Config, Context } from "@netlify/functions";
import { handle } from "../../server/core.ts";

// Netlify: Server-Kern mit Netlify Blobs als Speicher und Netlify AI Gateway
export default (req: Request, context: Context) => handle(req, { waitUntil: (p) => context.waitUntil(p) });

export const config: Config = {
  path: "/api/*",
  rateLimit: {
    windowLimit: 300,
    windowSize: 60,
    aggregateBy: ["ip", "domain"],
  },
};
