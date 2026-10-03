import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { z } from "zod";
import { AppError } from "@/infrastructure/errors";
import { db } from "@/infrastructure/db";
import { requireActor } from "@/modules/memberships/server";
import { requireMenu } from "@/modules/menus/server";
import { workspace } from "@/modules/restaurants/queries";
import { templateWorkspace } from "@/modules/templates/server";
import { previewConfigInput } from "@/modules/templates/preview-input";
import { checkThemeMedia } from "@/modules/templates/server";
import { defaultTheme } from "@/modules/templates/config";
import { templateIds } from "@/modules/templates/registry";
import { projectMenu } from "@/modules/menus/public";
import { TemplateRenderer } from "@/modules/templates/renderer";
import { isLocale } from "@/i18n/config";
export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false, follow: false } };
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; restaurantId: string; menuId: string }>;
  searchParams: Promise<{
    template?: string;
    config?: string;
    embedded?: string;
  }>;
}) {
  const { locale, restaurantId, menuId } = await params;
  if (!isLocale(locale) || !z.uuid().safeParse(menuId).success) notFound();
  const actor = await requireActor(restaurantId, "template:manage");
  const menu = await requireMenu(db, actor, menuId);
  const w = await workspace(restaurantId, "template:manage", menu.branchId);
  const draft = await templateWorkspace(restaurantId, menuId);
  const query = await searchParams;
  const selected = query.template
    ? z.enum(templateIds).safeParse(query.template)
    : null;
  if (selected && !selected.success) notFound();
  const supplied = query.config
    ? previewConfigInput.safeParse(query.config)
    : null;
  if (supplied && !supplied.success) notFound();
  const config = supplied?.success
    ? supplied.data
    : selected?.success
      ? defaultTheme(selected.data)
      : draft.draft;
  try {
    await db.transaction((tx) =>
      checkThemeMedia(tx, actor.restaurantId, menuId, config),
    );
  } catch (error) {
    if (error instanceof AppError && error.code === "NOT_FOUND") notFound();
    throw error;
  }
  const data = await projectMenu(
    { ...w, theme: { config, revisionId: "private-preview" } },
    locale,
    true,
  );
  const t = await getTranslations();
  return (
    <>
      {query.embedded !== "1" && (
        <div className="preview-toolbar">
          <strong>{t("privatePreview")}</strong>
          <span>{t("previewHint")}</span>
          <Link
            className="button button-outline button-sm"
            href={`/${locale}/dashboard/${restaurantId}/templates?branch=${menu.branchId}`}
          >
            {t("backToDesign")}
          </Link>
        </div>
      )}
      <TemplateRenderer data={data} />
    </>
  );
}
