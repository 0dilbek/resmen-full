import { themeConfigSchema } from "@/modules/templates/config";
import { z } from "zod";
import { locales } from "@/i18n/config";
import { allergenCodes } from "@/modules/products/validation";
const money = z.string().regex(/^\d{1,12}$/);
const image = z
  .object({
    id: z.uuid(),
    url: z
      .string()
      .regex(
        /^(?:\/api\/media\/[a-f0-9-]{36}\/640|\/branding\/illustrations\/dish-(?:[1-9]|1[0-8])\.svg)$/,
      ),
    alt: z.string().max(180),
    width: z.number().int().positive(),
    height: z.number().int().positive(),
  })
  .strict();
export const menuDataSchema = z
  .object({
    theme: z
      .object({ config: themeConfigSchema, revisionId: z.string().max(80) })
      .strict(),
    contractVersion: z.literal(1),
    identity: z
      .object({
        restaurantId: z.uuid(),
        menuId: z.uuid(),
        branchId: z.uuid(),
        canonicalPath: z
          .string()
          .regex(
            /^\/(?:r\/[a-z0-9-]+\/[a-z0-9-]+\/(?:uz|ru|en)|(?:uz|ru|en)\/templates\/[a-z0-9-]+)$/,
          ),
      })
      .strict(),
    restaurant: z
      .object({
        name: z.string().max(120),
        description: z.string().max(2000),
        phone: z.string().max(40),
        address: z.string().max(300),
      })
      .strict(),
    context: z
      .object({
        tableLabel: z.string().max(40).optional(),
        branchName: z.string().max(100),
        timezone: z.string(),
        orderingEnabled: z.boolean(),
      })
      .strict(),
    locale: z.enum(locales),
    defaultLocale: z.enum(locales),
    enabledLocales: z.array(z.enum(locales)).min(1).max(3),
    currency: z.enum(["UZS", "USD", "EUR"]),
    contentRevision: z.number().int(),
    categories: z
      .array(
        z
          .object({
            id: z.uuid(),
            name: z.string().max(120),
            sortOrder: z.number().int(),
            productIds: z.array(z.uuid()).max(1000),
          })
          .strict(),
      )
      .max(100),
    products: z
      .array(
        z
          .object({
            id: z.uuid(),
            categoryId: z.uuid(),
            name: z.string().max(120),
            description: z.string().max(2000),
            ingredients: z.string().max(1000),
            priceMinor: money,
            available: z.boolean(),
            featured: z.boolean(),
            allergens: z.array(z.enum(allergenCodes)).max(12),
            images: z.array(image).max(5),
            modifierGroupIds: z.array(z.uuid()).max(10),
          })
          .strict(),
      )
      .max(1000),
    modifierGroups: z
      .array(
        z
          .object({
            id: z.uuid(),
            name: z.string().max(120),
            minSelections: z.number().int(),
            maxSelections: z.number().int(),
            options: z
              .array(
                z
                  .object({
                    id: z.uuid(),
                    name: z.string().max(120),
                    priceDeltaMinor: money,
                    available: z.boolean(),
                  })
                  .strict(),
              )
              .max(20),
          })
          .strict(),
      )
      .max(200),
  })
  .strict();
export type MenuData = z.infer<typeof menuDataSchema>;
export type MenuProduct = MenuData["products"][number];
