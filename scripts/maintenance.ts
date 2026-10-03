export {};
try {
  process.loadEnvFile();
} catch {
  /* Environment supplied by service manager. */
}
const { and, eq, lt, sql } = await import("drizzle-orm");
const { db, pool } = await import("../src/infrastructure/db/index");
const { mediaAssets } = await import("../src/modules/products/schema");
const { restaurants } = await import("../src/modules/restaurants/schema");
const { analyticsEvents } = await import("../src/modules/analytics/schema");
const { requestLimits } = await import("../src/infrastructure/http/schema");
const { deleteImage } = await import("../src/infrastructure/storage/index");
const { imageWidths } = await import("../src/infrastructure/storage/image");
let cleaned = 0;
try {
  const cutoff = new Date(Date.now() - 86400000);
  const candidates = await db
    .select({ id: mediaAssets.id, restaurantId: mediaAssets.restaurantId })
    .from(mediaAssets)
    .where(
      and(eq(mediaAssets.state, "PENDING"), lt(mediaAssets.createdAt, cutoff)),
    )
    .limit(100);
  for (const candidate of candidates) {
    await db.transaction(async (tx) => {
      await tx
        .select({ id: restaurants.id })
        .from(restaurants)
        .where(eq(restaurants.id, candidate.restaurantId))
        .for("update");
      const [asset] = await tx
        .select()
        .from(mediaAssets)
        .where(
          and(
            eq(mediaAssets.restaurantId, candidate.restaurantId),
            eq(mediaAssets.id, candidate.id),
            eq(mediaAssets.state, "PENDING"),
            lt(mediaAssets.createdAt, cutoff),
          ),
        );
      if (!asset) return;
      for (const width of imageWidths)
        await deleteImage(`${asset.objectKey}/${width}.webp`);
      await tx
        .delete(mediaAssets)
        .where(
          and(
            eq(mediaAssets.restaurantId, asset.restaurantId),
            eq(mediaAssets.id, asset.id),
            eq(mediaAssets.state, "PENDING"),
          ),
        );
      cleaned++;
    });
  }
  // Bounded batches avoid long table locks; the daily timer catches up over time.
  await db.execute(
    sql`delete from ${analyticsEvents} where id in (select id from ${analyticsEvents} where created_at < now()-interval '90 days' limit 10000)`,
  );
  await db.execute(
    sql`delete from ${requestLimits} where key in (select key from ${requestLimits} where expires_at < now()-interval '1 day' limit 10000)`,
  );
  console.info("Maintenance completed", { abandonedUploads: cleaned });
} finally {
  await pool.end();
}
