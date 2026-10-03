import { EmptyIllustration } from "@/components/visuals/empty-illustration";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { workspace } from "@/modules/restaurants/queries";
import { catalog } from "@/modules/products/queries";
import { ProductForm } from "@/modules/products/components/product-form";
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; restaurantId: string }>;
  searchParams: Promise<{ branch?: string }>;
}) {
  const { locale, restaurantId } = await params;
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
        <h1>{t("addProduct")}</h1>
      </div>
      {data.categories.length ? (
        <ProductForm
          restaurantId={restaurantId}
          menuId={w.menu.id}
          branchId={w.branch.id}
          categories={data.categories}
          groups={data.groups}
          currency={w.settings.currency}
          defaultLocale={w.settings.defaultLocale}
        />
      ) : (
        <section className="panel empty-state">
          <EmptyIllustration kind="category" />
          <h2>{t("categoryFirst")}</h2>
          <Link
            className="button button-primary"
            href={`/${locale}/dashboard/${restaurantId}/categories?branch=${w.branch.id}`}
          >
            {t("addCategory")}
          </Link>
        </section>
      )}
    </>
  );
}
