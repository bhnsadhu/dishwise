import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
    // `server-only` throws outside React Server bundles; tests run server code directly.
    alias: { "server-only": new URL("./src/test/empty.ts", import.meta.url).pathname },
  },
  test: {
    include: ["src/**/*.test.ts"],
    environment: "node",
  },
});
