import "server-only";
import { and, desc, eq, inArray } from "drizzle-orm";
import { db, type Transaction } from "@/infrastructure/db";
import { AppError } from "@/infrastructure/errors";
import { mediaAssets } from "@/modules/products/schema";
import { requireActor } from "@/modules/memberships/server";
import { requireMenu } from "@/modules/menus/server";
import { templateConfigs, templateRevisions, templateCatalog } from "./schema";
import { defaultTheme, themeConfigSchema, type ThemeConfig } from "./config";
import type { TemplateId } from "./registry";
export async function publicTheme(tenant: string, menuId: string) {
  const [row] = await db
    .select({ revision: templateRevisions })
    .from(templateConfigs)
    .innerJoin(
      templateRevisions,
      and(
        eq(templateRevisions.restaurantId, templateConfigs.restaurantId),
        eq(templateRevisions.menuId, templateConfigs.menuId),
        eq(templateRevisions.id, templateConfigs.publishedRevisionId),
      ),
    )
    .where(
      and(
        eq(templateConfigs.restaurantId, tenant),
        eq(templateConfigs.menuId, menuId),
      ),
    );
  if (!row) return { config: defaultTheme(), revisionId: "default" };
  const parsed = themeConfigSchema.safeParse(row.revision.config);
  if (!parsed.success) {
    console.error("Invalid published template configuration", { menuId });
    return {
      config: defaultTheme(),
      revisionId: row.revision.id + "-fallback",
    };
  }
  const [catalog] = await db
    .select()
    .from(templateCatalog)
    .where(eq(templateCatalog.id, parsed.data.templateId));
  if (catalog?.status === "BLOCKED")
    return { config: defaultTheme(), revisionId: row.revision.id + "-blocked" };
  return { config: parsed.data, revisionId: row.revision.id };
}
export async function templateWorkspace(tenant: string, menuId: string) {
  const actor = await requireActor(tenant, "template:manage");
  await requireMenu(db, actor, menuId);
  const [config] = await db
    .select()
    .from(templateConfigs)
    .where(
      and(
        eq(templateConfigs.restaurantId, actor.restaurantId),
        eq(templateConfigs.menuId, menuId),
      ),
    );
  const history = await db
    .select({
      id: templateRevisions.id,
      templateId: templateRevisions.templateId,
      createdAt: templateRevisions.createdAt,
    })
    .from(templateRevisions)
    .where(
      and(
        eq(templateRevisions.restaurantId, actor.restaurantId),
        eq(templateRevisions.menuId, menuId),
      ),
    )
    .orderBy(desc(templateRevisions.createdAt))
    .limit(20);
  const statuses = await db.select().from(templateCatalog);
  return {
    draft: config ? themeConfigSchema.parse(config.draft) : defaultTheme(),
    draftVersion: config?.draftVersion ?? 0,
    publishedRevisionId: config?.publishedRevisionId ?? null,
    history,
    statuses,
  };
}
export async function checkTemplate(tx: Transaction, templateId: TemplateId) {
  const [row] = await tx
    .select()
    .from(templateCatalog)
    .where(eq(templateCatalog.id, templateId))
    .for("share");
  if (row && row.status !== "ACTIVE") throw new AppError("UNAVAILABLE", 409);
}
export async function checkThemeMedia(
  tx: Transaction,
  tenant: string,
  menuId: string,
  config: ThemeConfig,
) {
  const ids = [
    ...new Set(
      [config.logoMediaId, config.coverMediaId].filter(
        (id): id is string => !!id,
      ),
    ),
  ];
  if (!ids.length) return;
  const assets = await tx
    .select({ id: mediaAssets.id })
    .from(mediaAssets)
    .where(
      and(
        eq(mediaAssets.restaurantId, tenant),
        eq(mediaAssets.menuId, menuId),
        eq(mediaAssets.state, "READY"),
        inArray(mediaAssets.id, ids),
      ),
    );
  if (assets.length !== ids.length) throw new AppError("NOT_FOUND", 404);
}
