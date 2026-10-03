import { entitlement } from "@/modules/billing/server";
import { randomUUID } from "node:crypto";
import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/infrastructure/db";
import {
  assertOrigin,
  httpFailure,
  limitedBody,
  rateLimit,
} from "@/infrastructure/http/security";
import { requireActor, withTenant } from "@/modules/memberships/server";
import { requireMenu } from "@/modules/menus/server";
import { mediaAssets } from "@/modules/products/schema";
import { normalizeImage } from "@/infrastructure/storage/image";
import { putImage } from "@/infrastructure/storage";
import { AppError } from "@/infrastructure/errors";
export async function POST(request: Request) {
  try {
    assertOrigin(request);
    const url = new URL(request.url);
    const restaurantId = z.uuid().parse(url.searchParams.get("restaurantId"));
    const menuId = z.uuid().parse(url.searchParams.get("menuId"));
    const actor = await requireActor(restaurantId, "catalog:manage");
    await requireMenu(db, actor, menuId);
    await rateLimit(`upload:${restaurantId}:${actor.userId}`, 12);
    const bytes = await limitedBody(request, 8 * 1024 * 1024 + 65536);
    const form = await new Response(new Uint8Array(bytes), {
      headers: { "Content-Type": request.headers.get("content-type") ?? "" },
    })
      .formData()
      .catch(() => {
        throw new AppError("INVALID_INPUT", 400);
      });
    const file = form.get("image");
    if (!(file instanceof File) || file.size > 8 * 1024 * 1024)
      throw new AppError("INVALID_INPUT");
    const normalized = await normalizeImage(
      Buffer.from(await file.arrayBuffer()),
    );
    const id = randomUUID();
    const objectKey = `${restaurantId}/${id}`;
    await withTenant(restaurantId, "catalog:manage", async (tx, current) => {
      await requireMenu(tx, current, menuId);
      const [usage] = await tx
        .select({
          bytes: sql<number>`coalesce(sum(${mediaAssets.bytes}),0)::bigint`,
          count: sql<number>`count(*)::int`,
        })
        .from(mediaAssets)
        .where(eq(mediaAssets.restaurantId, restaurantId));
      if (
        Number(usage.bytes) +
          normalized.variants.reduce((sum, v) => sum + v.bytes.length, 0) >
          (await entitlement(tx, actor.restaurantId)).limits.storageMb *
            1024 *
            1024 ||
        usage.count >= 1000
      )
        throw new AppError("FORBIDDEN", 403);
      await tx.insert(mediaAssets).values({
        id,
        restaurantId,
        menuId,
        objectKey,
        bytes: normalized.variants.reduce((sum, v) => sum + v.bytes.length, 0),
        width: normalized.width,
        height: normalized.height,
        alt: z
          .string()
          .max(180)
          .parse(form.get("alt") ?? ""),
      });
    });
    for (const variant of normalized.variants)
      await putImage(`${objectKey}/${variant.width}.webp`, variant.bytes);
    await withTenant(restaurantId, "catalog:manage", async (tx, current) => {
      await requireMenu(tx, current, menuId);
      await tx
        .update(mediaAssets)
        .set({ state: "READY", updatedAt: new Date() })
        .where(
          and(
            eq(mediaAssets.restaurantId, restaurantId),
            eq(mediaAssets.id, id),
          ),
        );
    });
    return Response.json(
      { id, url: `/api/media/${id}/640` },
      { status: 201, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return httpFailure(error);
  }
}
