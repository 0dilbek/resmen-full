import { defineConfig } from "drizzle-kit";
try {
  process.loadEnvFile();
} catch {
  /* Environment can be supplied by CI. */
}
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/infrastructure/db/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "postgresql://ravoq@127.0.0.1:55432/ravoq",
  },
});
