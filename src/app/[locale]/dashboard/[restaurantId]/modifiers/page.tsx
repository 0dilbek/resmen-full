import { getTranslations } from "next-intl/server";
import { workspace } from "@/modules/restaurants/queries";
import { catalog } from "@/modules/products/queries";
import { ModifierForm } from "@/modules/modifiers/components/modifier-form";
import { BranchSwitcher } from "@/components/shell/branch-switcher";
import { inputMoney } from "@/modules/products/money";
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
        <h1>{t("modifiers")}</h1>
        <BranchSwitcher branches={w.branches} selected={w.branch.id} />
      </div>
      <div className="modifiers-grid">
        {data.groups.map((g) => (
          <section className="panel" key={g.id}>
            <h2>{g.names[w.settings.defaultLocale]}</h2>
            <ModifierForm
              restaurantId={restaurantId}
              menuId={w.menu.id}
              defaultLocale={w.settings.defaultLocale}
              initial={{
                id: g.id,
                menuId: w.menu.id,
                names: g.names,
                minSelections: g.minSelections,
                maxSelections: g.maxSelections,
                options: g.options.map((o) => ({
                  id: o.id,
                  names: o.names,
                  price: inputMoney(o.priceDeltaMinor),
                  available: o.available,
                })),
              }}
            />
          </section>
        ))}
        <section className="panel">
          <h2>{t("addModifier")}</h2>
          <ModifierForm
            restaurantId={restaurantId}
            menuId={w.menu.id}
            defaultLocale={w.settings.defaultLocale}
          />
        </section>
      </div>
    </>
  );
}
