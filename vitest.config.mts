import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      // Next resolves "server-only" itself; tests run on the server side too.
      "server-only": fileURLToPath(
        new URL("./node_modules/next/dist/compiled/server-only/empty.js", import.meta.url),
      ),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.{ts,tsx}"],
    // next-intl imports "next/navigation" without an extension, which plain
    // Node ESM can't resolve; let Vite process it instead.
    server: { deps: { inline: ["next-intl"] } },
  },
});
