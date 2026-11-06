import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const root = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@": path.join(root, "src"),
      // `server-only` wirft außerhalb von React-Server-Umgebungen – in Tests
      // wird es durch ein leeres Modul ersetzt.
      "server-only": path.join(root, "tests/support/empty-module.ts"),
    },
  },
  test: {
    include: ["tests/unit/**/*.test.ts"],
    environment: "node",
    testTimeout: 20_000,
    restoreMocks: true,
  },
});
