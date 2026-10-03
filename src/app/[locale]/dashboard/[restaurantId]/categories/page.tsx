import { EmptyIllustration } from "@/components/visuals/empty-illustration";
import { getTranslations } from "next-intl/server";
import { workspace } from "@/modules/restaurants/queries";
import { catalog } from "@/modules/products/queries";
import { saveCategory } from "@/modules/categories/actions";
import { ActionForm } from "@/components/ui/action-form";
import { BranchSwitcher } from "@/components/shell/branch-switcher";
import { locales } from "@/i18n/config";
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
    "catalog:manage",
    (await searchParams).branch,
  );
  const data = await catalog(restaurantId, w.menu.id);
  const t = await getTranslations();
  return (
    <>
      <div className="page-title">
        <h1>{t("categories")}</h1>
        <BranchSwitcher branches={w.branches} selected={w.branch.id} />
      </div>
      {!data.categories.length && <EmptyIllustration kind="category" />}
      <div className="category-grid">
        {[...data.categories, undefined].map((cat, i) => (
          <section className="panel" key={cat?.id ?? "new"}>
            <h2>
              {cat ? cat.names[w.settings.defaultLocale] : t("addCategory")}
            </h2>
            <ActionForm
              action={async (form) => {
                "use server";
                return saveCategory(restaurantId, {
                  id: cat?.id,
                  menuId: w.menu.id,
                  names: Object.fromEntries(
                    locales.map((l) => [l, String(form.get(l) ?? "")]),
                  ),
                  visible: form.get("visible") === "on",
                  sortOrder: Number(form.get("sortOrder")),
                });
              }}
              submitKey={cat ? "save" : "addCategory"}
            >
              {locales.map((l) => (
                <label key={l}>
                  {t("categoryName")} · {l.toUpperCase()}
                  <input
                    name={l}
                    defaultValue={cat?.names[l] ?? ""}
                    maxLength={120}
                    required={l === w.settings.defaultLocale}
                  />
                </label>
              ))}
              <label>
                {t("sortOrder")}
                <input
                  name="sortOrder"
                  type="number"
                  min={0}
                  max={10000}
                  defaultValue={cat?.sortOrder ?? i}
                />
              </label>
              <label className="checkbox-label">
                <input
                  name="visible"
                  type="checkbox"
                  defaultChecked={cat?.visible ?? true}
                />
                {t("visible")}
              </label>
            </ActionForm>
          </section>
        ))}
      </div>
    </>
  );
}
