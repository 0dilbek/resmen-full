import sharp from "sharp";
import { mkdir, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
try {
  process.loadEnvFile();
} catch {
  /* Operator environment. */
}
async function main() {
  if (!["development", "test"].includes(process.env.APP_ENV ?? ""))
    throw new Error("Demo assets require development/test mode");
  const { db, pool } = await import("../src/infrastructure/db");
  const { products, mediaAssets, productImages } =
    await import("../src/modules/products/schema");
  const { menus } = await import("../src/modules/menus/schema");
  const tenant = "d0000000-0000-4000-8000-000000000001";
  const dishes = await db
    .select()
    .from(products)
    .where(eq(products.restaurantId, tenant))
    .orderBy(products.sortOrder);
  if (!dishes.length) throw new Error("Run db:seed first");
  const client =
    process.env.STORAGE_DRIVER === "s3"
      ? new S3Client({
          endpoint: process.env.S3_ENDPOINT,
          region: process.env.S3_REGION ?? "auto",
          forcePathStyle: true,
          credentials: {
            accessKeyId: process.env.S3_ACCESS_KEY_ID!,
            secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
          },
        })
      : null;
  await mkdir("public/branding/illustrations", { recursive: true });
  try {
    for (const [index, dish] of dishes.entries()) {
      const [existing] = await db
        .select()
        .from(productImages)
        .where(
          and(
            eq(productImages.restaurantId, tenant),
            eq(productImages.productId, dish.id),
          ),
        );
      if (existing) continue;
      const backgrounds = [
        "#e9dcc4",
        "#ddd4bf",
        "#d8e1d1",
        "#e7cbbb",
        "#d8dfcc",
        "#e6dfd1",
        "#d5ded2",
        "#ead7ad",
      ];
      const rice = Array.from({ length: 65 }, (_, i) => {
        const angle = i * 2.4,
          r = 18 + Math.sqrt(i) * 14,
          x = 480 + Math.cos(angle) * r,
          y = 330 + Math.sin(angle) * r * 0.7;
        return `<ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="14" ry="4" transform="rotate(${i * 37} ${x.toFixed(1)} ${y.toFixed(1)})" fill="${i % 3 ? "#d8a34c" : "#e9c27a"}"/>`;
      }).join("");
      const green = Array.from(
        { length: 12 },
        (_, i) =>
          `<ellipse cx="${390 + (i % 4) * 55}" cy="${270 + Math.floor(i / 4) * 55}" rx="42" ry="23" transform="rotate(${i * 43} ${390 + (i % 4) * 55} ${270 + Math.floor(i / 4) * 55})" fill="${i % 2 ? "#446d43" : "#759556"}"/>`,
      ).join("");
      const food =
        index === 0
          ? rice +
            '<path d="m410 295 53-28 28 39-34 34Z" fill="#81523a"/><path d="m505 340 46-18 20 30-40 27Z" fill="#956142"/><path d="m420 376 70-18" stroke="#ae6a27" stroke-width="12"/>'
          : index === 1
            ? '<path d="M480 220 355 410h250Z" fill="#c8914f" stroke="#ad773c" stroke-width="6"/><path d="m480 245-93 143h186Z" fill="#d9ac68"/>'
            : index === 2
              ? Array.from(
                  { length: 5 },
                  (_, i) =>
                    `<ellipse cx="${400 + (i % 3) * 80}" cy="${290 + Math.floor(i / 3) * 95}" rx="49" ry="35" fill="#eee1bd" stroke="#c2ac83" stroke-width="3"/><path d="m${370 + (i % 3) * 80} ${290 + Math.floor(i / 3) * 95}q30-32 60 0" fill="none" stroke="#b69d73" stroke-width="2"/>`,
                ).join("")
              : index === 3
                ? rice + green
                : index === 4
                  ? green +
                    '<circle cx="410" cy="310" r="30" fill="#bd4c39"/><circle cx="505" cy="290" r="35" fill="#d66845"/><circle cx="495" cy="380" r="30" fill="#bd4c39"/>'
                  : index === 5
                    ? '<ellipse cx="480" cy="325" rx="119" ry="78" fill="#f8f4dd"/><path d="m424 290 100 70m-85 0 70-65" stroke="#7a9656" stroke-width="8" stroke-linecap="round"/>'
                    : index === 6
                      ? '<circle cx="480" cy="327" r="100" fill="#d9c680"/><circle cx="480" cy="327" r="79" fill="#8b8e49"/><path d="M465 210q-30-45 0-65m40 65q-30-45 0-65" stroke="#f6f3e5" stroke-width="8" fill="none"/>'
                      : '<rect x="409" y="193" width="142" height="240" rx="35" fill="#f0d374" stroke="#f9f3d2" stroke-width="10"/><circle cx="480" cy="325" r="55" fill="#f9e59b" stroke="#f7f0c0" stroke-width="7"/><path d="m480 270 0 110m-55-55h110m-90-40 80 80m0-80-80 80" stroke="#f7f0c0" stroke-width="4"/>';
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 640"><rect width="960" height="640" fill="${backgrounds[index % 8]}"/><path d="M0 540 960 95v160L0 640Z" fill="#fff" opacity=".14"/><ellipse cx="490" cy="360" rx="232" ry="175" fill="#675f47" opacity=".13"/><ellipse cx="480" cy="325" rx="235" ry="180" fill="#f5f0df"/><ellipse cx="480" cy="325" rx="210" ry="156" fill="none" stroke="#255666" stroke-width="5"/><ellipse cx="480" cy="325" rx="195" ry="142" fill="none" stroke="#255666" stroke-width="2"/>${food}<path d="M760 170v290m-22-290v80h44v-80" stroke="#a5a696" fill="none" stroke-width="8" stroke-linecap="round"/></svg>`;
      await writeFile(
        `public/branding/illustrations/dish-${index + 1}.svg`,
        svg,
      );
      const id = randomUUID(),
        key = `${tenant}/${id}`;
      let total = 0;
      for (const width of [320, 640, 960, 1440]) {
        const bytes = await sharp(Buffer.from(svg))
          .resize({ width, withoutEnlargement: true })
          .webp({ quality: 85 })
          .toBuffer();
        total += bytes.length;
        if (client)
          await client.send(
            new PutObjectCommand({
              Bucket: process.env.S3_BUCKET,
              Key: `${key}/${width}.webp`,
              Body: bytes,
              ContentType: "image/webp",
            }),
          );
        else {
          await mkdir(`.local/uploads/${key}`, {
            recursive: true,
            mode: 0o700,
          });
          await writeFile(`.local/uploads/${key}/${width}.webp`, bytes, {
            mode: 0o600,
          });
        }
      }
      await db.transaction(async (tx) => {
        await tx.insert(mediaAssets).values({
          id,
          restaurantId: tenant,
          menuId: dish.menuId,
          objectKey: key,
          state: "READY",
          bytes: total,
          width: 960,
          height: 640,
          alt: "Original menu illustration",
        });
        await tx.insert(productImages).values({
          restaurantId: tenant,
          menuId: dish.menuId,
          productId: dish.id,
          mediaId: id,
        });
      });
    }
    await db
      .update(menus)
      .set({ catalogRevision: 2 })
      .where(eq(menus.restaurantId, tenant));
    console.log("Original demo illustrations prepared.");
  } finally {
    await pool.end();
  }
}
main().catch(() => {
  console.error(
    "Demo asset preparation failed. Check seed and storage configuration.",
  );
  process.exitCode = 1;
});
