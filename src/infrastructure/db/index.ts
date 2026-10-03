import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

const globalDb = globalThis as unknown as { ravoqPool?: Pool };
export const pool =
  globalDb.ravoqPool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 8,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  });
if (process.env.NODE_ENV !== "production") globalDb.ravoqPool = pool;
export const db = drizzle(pool, { schema });
export type Database = typeof db;
export type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];
