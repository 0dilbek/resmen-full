import { z } from "zod";
export const allergenCodes = [
  "gluten",
  "milk",
  "eggs",
  "nuts",
  "peanuts",
  "soy",
  "fish",
  "shellfish",
  "sesame",
  "mustard",
  "celery",
  "sulphites",
] as const;
export const moneyInput = z.string().regex(/^\d{1,8}(\.\d{1,2})?$/);
export const namesSchema = z
  .object({
    uz: z.string().trim().max(120),
    ru: z.string().trim().max(120),
    en: z.string().trim().max(120),
  })
  .strict();
const translation = z
  .object({
    name: z.string().trim().max(120),
    description: z.string().max(2000),
    ingredients: z.string().max(1000),
  })
  .strict();
export const productSchema = z
  .object({
    id: z.uuid().optional(),
    version: z.number().int().positive().optional(),
    menuId: z.uuid(),
    categoryId: z.uuid(),
    price: moneyInput,
    available: z.boolean(),
    published: z.boolean(),
    featured: z.boolean(),
    sortOrder: z.number().int().min(0).max(10000),
    allergens: z.array(z.enum(allergenCodes)).max(12),
    translations: z
      .object({ uz: translation, ru: translation, en: translation })
      .strict(),
    mediaIds: z.array(z.uuid()).max(5),
    modifierGroupIds: z.array(z.uuid()).max(10),
  })
  .strict();
export type ProductInput = z.infer<typeof productSchema>;
export const categorySchema = z
  .object({
    id: z.uuid().optional(),
    menuId: z.uuid(),
    names: namesSchema,
    visible: z.boolean(),
    sortOrder: z.number().int().min(0).max(10000),
  })
  .strict();
export const modifierSchema = z
  .object({
    id: z.uuid().optional(),
    menuId: z.uuid(),
    names: namesSchema,
    minSelections: z.number().int().min(0).max(20),
    maxSelections: z.number().int().min(1).max(20),
    options: z
      .array(
        z
          .object({
            id: z.uuid().optional(),
            names: namesSchema,
            price: moneyInput,
            available: z.boolean(),
          })
          .strict(),
      )
      .min(1)
      .max(20),
  })
  .strict()
  .refine(
    (v) =>
      v.minSelections <= v.maxSelections &&
      v.maxSelections <= v.options.length &&
      v.minSelections <= v.options.filter((o) => o.available).length,
  );
