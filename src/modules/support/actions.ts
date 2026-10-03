"use server";
import { z } from "zod";
import { db } from "@/infrastructure/db";
import { rateLimit } from "@/infrastructure/http/security";
import { failure, type ActionResult } from "@/infrastructure/errors";
import { supportTickets } from "./schema";
export async function submitContact(input: unknown): Promise<ActionResult> {
  try {
    const data = z
      .object({
        name: z.string().trim().min(2).max(100),
        email: z.email().max(254).toLowerCase(),
        message: z.string().trim().min(20).max(3000),
        website: z.string().max(200).default(""),
      })
      .strict()
      .parse(input);
    if (data.website) return { ok: true };
    await rateLimit("contact-global", 100, 3600);
    await rateLimit(`contact:${data.email}`, 3, 3600);
    await db
      .insert(supportTickets)
      .values({ name: data.name, email: data.email, message: data.message });
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}
