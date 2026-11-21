// Bündelt den Server-Kern + alle Abhängigkeiten in eine einzige Vercel-Funktion (api/main.mjs)
import { build } from "esbuild";
await build({
  entryPoints: ["server/vercel-entry.ts"],
  outfile: "api/main.mjs",
  bundle: true,
  platform: "node",
  target: "node20",
  format: "esm",
  minify: false,
  legalComments: "none",
  banner: { js: "import { createRequire as __cr } from 'module'; const require = __cr(import.meta.url);" },
});
console.log("api/main.mjs gebaut");
