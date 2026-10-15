import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Unit tests run without the Lovable/TanStack Start build plugins.
export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    include: ["src/**/*.test.ts"],
    environment: "node",
  },
});
