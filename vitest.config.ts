import { defineConfig } from "vitest/config";
import path from "node:path";
try {
  process.loadEnvFile();
} catch {
  /* CI supplies environment variables. */
}
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve("src"),
      "server-only": path.resolve("tests/server-only.ts"),
    },
  },
  test: {
    include: ["src/**/*.test.ts", "tests/integration/**/*.test.ts"],
    env: { NODE_ENV: "test" },
    testTimeout: 15000,
    fileParallelism: false,
  },
});
