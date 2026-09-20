import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { "@": path.resolve(__dirname) } },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./projects/furry/src/test/setup.ts"],
    include: [
      "projects/furry/src/**/*.test.ts",
      "projects/furry/src/**/*.test.tsx",
      "app/**/*.test.ts",
      "app/**/*.test.tsx",
      "data/**/*.test.ts",
    ],
  },
});
