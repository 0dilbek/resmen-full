import { AppError } from "@/infrastructure/errors";
import { templateConfigs, templateRevisions } from "@/modules/templates/schema";
import { and, eq, or, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/infrastructure/db";
import {
  mediaAssets,
  productImages,
  products,
} from "@/modules/products/schema";
import { categories } from "@/modules/categories/schema";
import { menus } from "@/modules/menus/schema";
import { branches } from "@/modules/branches/schema";
import { restaurants } from "@/modules/restaurants/schema";
import { requireActor, requireBranch } from "@/modules/memberships/server";
import { getImage } from "@/infrastructure/storage";
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; width: string }> },
) {
  const { id, width } = await params;
  if (
    !z.uuid().safeParse(id).success ||
    !["320", "640", "960", "1440"].includes(width)
  )
    return new Response(null, { status: 404 });
  const [asset] = await db
    .select()
    .from(mediaAssets)
    .where(and(eq(mediaAssets.id, id), eq(mediaAssets.state, "READY")));
  if (!asset) return new Response(null, { status: 404 });
  const [published] = await db
    .select({ id: products.id })
    .from(productImages)
    .innerJoin(
      products,
      and(
        eq(products.restaurantId, productImages.restaurantId),
        eq(products.id, productImages.productId),
      ),
    )
    .innerJoin(
      categories,
      and(
        eq(categories.restaurantId, products.restaurantId),
        eq(categories.id, products.categoryId),
      ),
    )
    .innerJoin(
      menus,
      and(
        eq(menus.restaurantId, products.restaurantId),
        eq(menus.id, products.menuId),
      ),
    )
    .innerJoin(
      branches,
      and(
        eq(branches.restaurantId, menus.restaurantId),
        eq(branches.id, menus.branchId),
      ),
    )
    .innerJoin(restaurants, eq(restaurants.id, products.restaurantId))
    .where(
      and(
        eq(productImages.restaurantId, asset.restaurantId),
        eq(productImages.mediaId, id),
        eq(products.published, true),
        eq(products.archived, false),
        eq(categories.visible, true),
        eq(menus.published, true),
        eq(branches.active, true),
        eq(restaurants.status, "ACTIVE"),
      ),
    )
    .limit(1);
  const [branding] = published
    ? []
    : await db
        .select({ id: templateRevisions.id })
        .from(templateConfigs)
        .innerJoin(
          templateRevisions,
          and(
            eq(templateRevisions.restaurantId, templateConfigs.restaurantId),
            eq(templateRevisions.menuId, templateConfigs.menuId),
            eq(templateRevisions.id, templateConfigs.publishedRevisionId),
          ),
        )
        .innerJoin(
          menus,
          and(
            eq(menus.restaurantId, templateConfigs.restaurantId),
            eq(menus.id, templateConfigs.menuId),
          ),
        )
        .innerJoin(
          branches,
          and(
            eq(branches.restaurantId, menus.restaurantId),
            eq(branches.id, menus.branchId),
          ),
        )
        .innerJoin(restaurants, eq(restaurants.id, menus.restaurantId))
        .where(
          and(
            eq(templateConfigs.restaurantId, asset.restaurantId),
            eq(templateConfigs.menuId, asset.menuId),
            eq(menus.published, true),
            eq(branches.active, true),
            eq(restaurants.status, "ACTIVE"),
            or(
              sql`${templateRevisions.config}->>'logoMediaId' = ${id}`,
              sql`${templateRevisions.config}->>'coverMediaId' = ${id}`,
            ),
          ),
        )
        .limit(1);
  const isPublic = !!published || !!branding;
  if (!isPublic) {
    try {
      const actor = await requireActor(asset.restaurantId, "catalog:read");
      const [menu] = await db
        .select()
        .from(menus)
        .where(
          and(
            eq(menus.restaurantId, asset.restaurantId),
            eq(menus.id, asset.menuId),
          ),
        );
      if (!menu) return new Response(null, { status: 404 });
      requireBranch(actor, menu.branchId);
    } catch (error) {
      if (!(error instanceof AppError)) throw error;
      return new Response(null, {
        status: 404,
        headers: { "Cache-Control": "private, no-store" },
      });
    }
  }
  try {
    const bytes = await getImage(`${asset.objectKey}/${width}.webp`);
    return new Response(new Uint8Array(bytes), {
      headers: {
        "Content-Type": "image/webp",
        "Cache-Control": isPublic ? "public, max-age=300" : "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    console.error("Media unavailable", { assetId: id });
    return new Response(null, { status: 404 });
  }
}
