import { EmptyIllustration } from "@/components/visuals/empty-illustration";
import Link from "next/link";
import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { Plus, Search, UtensilsCrossed, Pencil } from "lucide-react";
import { workspace } from "@/modules/restaurants/queries";
import { catalog } from "@/modules/products/queries";
import { BranchSwitcher } from "@/components/shell/branch-switcher";
import { ActionForm } from "@/components/ui/action-form";
import { changeProductState } from "@/modules/products/actions";
import { formatMoney } from "@/modules/products/money";
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; restaurantId: string }>;
  searchParams: Promise<{ branch?: string; q?: string }>;
}) {
  const { locale, restaurantId } = await params;
  const query = await searchParams;
  const w = await workspace(restaurantId, "catalog:read", query.branch);
  const data = await catalog(restaurantId, w.menu.id);
  const t = await getTranslations();
  const base = `/${locale}/dashboard/${restaurantId}/products`;
  const filtered = data.products.filter(
    (p) =>
      !query.q ||
      p.translations.some((tr) =>
        tr.name
          .toLocaleLowerCase()
          .includes(query.q!.slice(0, 100).toLocaleLowerCase()),
      ),
  );
  return (
    <>
      <div className="page-title">
        <div>
          <h1>{t("products")}</h1>
          <p className="muted">
            {data.products.length} {t("productsCount").toLowerCase()}
          </p>
        </div>
        <div className="toolbar-actions">
          <BranchSwitcher branches={w.branches} selected={w.branch.id} />
          <Link
            className="button button-primary"
            href={`${base}/new?branch=${w.branch.id}`}
          >
            <Plus size={17} />
            {t("addProduct")}
          </Link>
        </div>
      </div>
      <section className="panel product-table-panel">
        <form className="search-bar">
          <Search size={17} />
          <input
            name="q"
            aria-label={t("search")}
            placeholder={t("searchProducts")}
            defaultValue={query.q}
          />
          <input type="hidden" name="branch" value={w.branch.id} />
          <button className="button button-outline button-sm">
            {t("search")}
          </button>
        </form>
        {filtered.length ? (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>{t("productName")}</th>
                  <th>{t("category")}</th>
                  <th>{t("price")}</th>
                  <th>{t("status")}</th>
                  <th>{t("action")}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => {
                  const tr =
                    p.translations.find(
                      (tr) => tr.locale === locale && tr.name,
                    ) ||
                    p.translations.find(
                      (tr) => tr.locale === w.settings.defaultLocale,
                    );
                  const cat = data.categories.find(
                    (c) => c.id === p.categoryId,
                  );
                  return (
                    <tr key={p.id}>
                      <td>
                        <Link
                          className="product-cell"
                          href={`${base}/${p.id}?branch=${w.branch.id}`}
                        >
                          {p.mediaIds[0] ? (
                            <Image
                              src={`/api/media/${p.mediaIds[0]}/320`}
                              alt=""
                              width={48}
                              height={48}
                              unoptimized
                            />
                          ) : (
                            <span className="product-placeholder">
                              <UtensilsCrossed size={19} />
                            </span>
                          )}
                          <span>
                            <strong>{tr?.name}</strong>
                            <small>
                              {p.featured
                                ? t("featured")
                                : tr?.description.slice(0, 55)}
                            </small>
                          </span>
                        </Link>
                      </td>
                      <td>{cat?.names[w.settings.defaultLocale]}</td>
                      <td className="money">
                        {formatMoney(p.priceMinor, p.currency, locale)}
                      </td>
                      <td>
                        <span
                          className={`badge ${p.available ? "badge-green" : "badge-red"}`}
                        >
                          {t(p.available ? "available" : "soldOut")}
                        </span>
                        {!p.published && (
                          <span className="badge">{t("draft")}</span>
                        )}
                      </td>
                      <td>
                        <div className="row-actions">
                          <Link
                            className="button button-ghost button-icon"
                            aria-label={t("edit")}
                            href={`${base}/${p.id}?branch=${w.branch.id}`}
                          >
                            <Pencil size={16} />
                          </Link>
                          <ActionForm
                            action={async () => {
                              "use server";
                              return changeProductState(restaurantId, {
                                id: p.id,
                                menuId: w.menu.id,
                                version: p.version,
                                available: !p.available,
                              });
                            }}
                            submitKey={p.available ? "soldOut" : "available"}
                          >
                            <span className="sr-only">{tr?.name}</span>
                          </ActionForm>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">
            <EmptyIllustration kind="product" />
            <h2>{t(query.q ? "noResults" : "noProducts")}</h2>
            <Link
              href={`${base}/new?branch=${w.branch.id}`}
              className="button button-primary"
            >
              {t("addProduct")}
            </Link>
          </div>
        )}
      </section>
    </>
  );
}
