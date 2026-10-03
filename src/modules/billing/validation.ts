import { z } from "zod";
export const planLimitsSchema = z
  .object({
    branches: z.number().int().min(1).max(100),
    products: z.number().int().min(1).max(10000),
    members: z.number().int().min(1).max(1000),
    storageMb: z.number().int().min(1).max(100000),
    ordering: z.boolean(),
  })
  .strict();
export const freeLimits = {
  branches: 1,
  products: 100,
  members: 3,
  storageMb: 100,
  ordering: true,
};
export const planSchema = z
  .object({
    code: z.string().regex(/^[a-z0-9-]{2,40}$/),
    name: z.string().trim().min(2).max(80),
    priceMinor: z.string().regex(/^\d{1,12}$/),
    currency: z.enum(["UZS", "USD", "EUR"]),
    limits: planLimitsSchema,
  })
  .strict();
export const reasonSchema = z.string().trim().min(5).max(500);
