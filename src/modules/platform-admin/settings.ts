import "server-only";
import { eq } from "drizzle-orm";
import { db, type Transaction } from "@/infrastructure/db";
import { platformSettings } from "./schema";
export async function systemSettings(reader: typeof db | Transaction = db) {
  const [settings] = await reader
    .select()
    .from(platformSettings)
    .where(eq(platformSettings.id, "global"));
  return (
    settings ?? {
      id: "global",
      registrationEnabled: true,
      orderingEnabled: true,
      analyticsEnabled: true,
    }
  );
}
