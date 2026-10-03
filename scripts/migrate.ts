import { migrate } from "drizzle-orm/node-postgres/migrator";
try {
  process.loadEnvFile();
} catch {
  /* CI supplies environment variables. */
}
async function main() {
  const { db, pool } = await import("../src/infrastructure/db");
  try {
    await migrate(db, { migrationsFolder: "drizzle" });
    console.log("Migrations applied.");
  } finally {
    await pool.end();
  }
}
main().catch(() => {
  console.error(
    "Migration failed. Check database configuration and migration state.",
  );
  process.exitCode = 1;
});
