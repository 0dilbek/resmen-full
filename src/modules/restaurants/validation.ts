import { z } from "zod";
export const slugSchema = z
  .string()
  .min(3)
  .max(50)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
export const createRestaurantSchema = z
  .object({ name: z.string().trim().min(2).max(100), slug: slugSchema })
  .strict();
export const profileSchema = z
  .object({
    name: z.string().trim().min(2).max(100),
    description: z.string().max(1200),
    phone: z.string().max(40),
    address: z.string().max(250),
    defaultLocale: z.enum(["uz", "ru", "en"]),
    enabledLocales: z
      .array(z.enum(["uz", "ru", "en"]))
      .min(1)
      .max(3),
    orderingEnabled: z.boolean(),
  })
  .strict()
  .refine((v) => v.enabledLocales.includes(v.defaultLocale), {
    path: ["defaultLocale"],
    message: "Default language must be enabled",
  });
