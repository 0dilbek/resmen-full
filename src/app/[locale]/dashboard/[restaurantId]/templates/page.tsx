import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { workspace } from "@/modules/restaurants/queries";
import { templateWorkspace } from "@/modules/templates/server";
import { DesignEditor } from "@/modules/templates/components/design-editor";
import { restoreDesign } from "@/modules/templates/actions";
import { setPublication } from "@/modules/menus/actions";
import { ActionForm } from "@/components/ui/action-form";
import { BranchSwitcher } from "@/components/shell/branch-switcher";
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ restaurantId: string }>;
  searchParams: Promise<{ branch?: string }>;
}) {
  const { restaurantId } = await params;
  const w = await workspace(
    restaurantId,
    "template:manage",
    (await searchParams).branch,
  );
  const design = await templateWorkspace(restaurantId, w.menu.id);
  const t = await getTranslations();
  return (
    <>
      <div className="page-title">
        <div>
          <h1>{t("templates")}</h1>
          <p className="muted">{t("templateIntro")}</p>
        </div>
        <BranchSwitcher branches={w.branches} selected={w.branch.id} />
      </div>
      <DesignEditor
        key={`${w.menu.id}-${design.draftVersion}`}
        restaurantId={restaurantId}
        menuId={w.menu.id}
        initial={design.draft}
        version={design.draftVersion}
        statuses={design.statuses}
      />
      <section className="panel">
        <h2>{t("menuPublication")}</h2>
        <p className="muted">{t("publishHint")}</p>
        <ActionForm
          action={async () => {
            "use server";
            return setPublication(restaurantId, {
              menuId: w.menu.id,
              published: !w.menu.published,
            });
          }}
          submitKey={w.menu.published ? "unpublishMenu" : "publishMenu"}
        />
        {w.menu.published && (
          <Link
            className="text-link"
            target="_blank"
            href={`/r/${w.restaurant.slug}/${w.branch.slug}/${w.settings.defaultLocale}`}
          >
            {t("openMenu")}
          </Link>
        )}
      </section>
      {design.history.length > 0 && (
        <section className="panel">
          <h2>{t("designHistory")}</h2>
          {design.history.map((revision) => (
            <div className="activity-row" key={revision.id}>
              <span>
                {revision.templateId} ·{" "}
                {revision.createdAt.toLocaleDateString("en-GB")}
              </span>
              <ActionForm
                action={async () => {
                  "use server";
                  return restoreDesign(restaurantId, {
                    menuId: w.menu.id,
                    revisionId: revision.id,
                    expectedVersion: design.draftVersion,
                  });
                }}
                submitKey="restoreDraft"
              />
            </div>
          ))}
        </section>
      )}
    </>
  );
}
