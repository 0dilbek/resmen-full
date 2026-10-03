import "server-only";
import { and, eq } from "drizzle-orm";
import type { Transaction } from "@/infrastructure/db";
import { restaurantSettings } from "@/modules/restaurants/schema";
import { branches } from "@/modules/branches/schema";
import { products, productTranslations } from "@/modules/products/schema";
import { categories, categoryTranslations } from "@/modules/categories/schema";
import { AppError } from "@/infrastructure/errors";
export async function validatePublication(
  tx: Transaction,
  tenant: string,
  menuId: string,
  branchId: string,
) {
  const [settings] = await tx
    .select()
    .from(restaurantSettings)
    .where(eq(restaurantSettings.restaurantId, tenant));
  const [branch] = await tx
    .select()
    .from(branches)
    .where(
      and(
        eq(branches.restaurantId, tenant),
        eq(branches.id, branchId),
        eq(branches.active, true),
      ),
    );
  if (!branch || !settings) throw new AppError("INVALID_INPUT");
  const rows = await tx
    .select({
      productName: productTranslations.name,
      categoryName: categoryTranslations.name,
    })
    .from(products)
    .innerJoin(
      categories,
      and(
        eq(categories.restaurantId, products.restaurantId),
        eq(categories.id, products.categoryId),
        eq(categories.visible, true),
      ),
    )
    .leftJoin(
      productTranslations,
      and(
        eq(productTranslations.restaurantId, products.restaurantId),
        eq(productTranslations.productId, products.id),
        eq(productTranslations.locale, settings.defaultLocale),
      ),
    )
    .leftJoin(
      categoryTranslations,
      and(
        eq(categoryTranslations.restaurantId, categories.restaurantId),
        eq(categoryTranslations.categoryId, categories.id),
        eq(categoryTranslations.locale, settings.defaultLocale),
      ),
    )
    .where(
      and(
        eq(products.restaurantId, tenant),
        eq(products.menuId, menuId),
        eq(products.published, true),
        eq(products.archived, false),
      ),
    );
  if (!rows.length || rows.some((r) => !r.productName || !r.categoryName))
    throw new AppError("INVALID_INPUT");
}
