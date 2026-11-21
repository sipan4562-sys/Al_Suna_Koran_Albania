// Läuft bei jedem Netlify-Build: gibt jeder neuen Version eine eindeutige Kennung,
// damit installierte Apps (Handy, PC, iOS) das Update automatisch erkennen.
import { readFileSync, writeFileSync } from "node:fs";

const v = (process.env.COMMIT_REF || "").slice(0, 7) + "-" + Date.now().toString(36);
const built = new Date().toISOString();
writeFileSync("public/version.json", JSON.stringify({ v, built }) + "\n");
for (const f of ["public/app.js", "public/sw.js"]) {
  const src = readFileSync(f, "utf8");
  writeFileSync(f, src.replaceAll("__PK_VERSION__", v));
}
console.log("Pixelkingschat-Version", v);
