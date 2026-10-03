import { sql } from "drizzle-orm";
import { db } from "@/infrastructure/db";
import { env } from "@/infrastructure/env";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    env();
    const result = await db.execute<{ n: number }>(
      sql`select count(*)::int as n from drizzle.__drizzle_migrations`,
    );
    if (result.rows[0]?.n < 10) throw Error("Migrations incomplete");
    return Response.json(
      { status: "ok" },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return Response.json(
      { status: "unavailable" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
