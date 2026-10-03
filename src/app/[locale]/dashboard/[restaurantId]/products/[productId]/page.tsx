import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { workspace } from "@/modules/restaurants/queries";
import { catalog } from "@/modules/products/queries";
import { ProductForm } from "@/modules/products/components/product-form";
import { inputMoney } from "@/modules/products/money";
import { productSchema } from "@/modules/products/validation";
import { locales } from "@/i18n/config";
import { ActionForm } from "@/components/ui/action-form";
import { changeProductState } from "@/modules/products/actions";
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; restaurantId: string; productId: string }>;
  searchParams: Promise<{ branch?: string }>;
}) {
  const { locale, restaurantId, productId } = await params;
  const w = await workspace(
    restaurantId,
    "catalog:manage",
    (await searchParams).branch,
  );
  const data = await catalog(restaurantId, w.menu.id);
  const product = data.products.find((p) => p.id === productId);
  if (!product) notFound();
  const initial = productSchema.parse({
    id: product.id,
    version: product.version,
    menuId: w.menu.id,
    categoryId: product.categoryId,
    price: inputMoney(product.priceMinor),
    available: product.available,
    published: product.published,
    featured: product.featured,
    sortOrder: product.sortOrder,
    allergens: product.allergens,
    mediaIds: product.mediaIds,
    modifierGroupIds: product.modifierGroupIds,
    translations: Object.fromEntries(
      locales.map((l) => {
        const tr = product.translations.find((t) => t.locale === l);
        return [
          l,
          {
            name: tr?.name ?? "",
            description: tr?.description ?? "",
            ingredients: tr?.ingredients ?? "",
          },
        ];
      }),
    ),
  });
  const t = await getTranslations();
  return (
    <>
      <div className="page-title">
        <h1>{t("editProduct")}</h1>
      </div>
      <ProductForm
        restaurantId={restaurantId}
        menuId={w.menu.id}
        branchId={w.branch.id}
        categories={data.categories}
        groups={data.groups}
        currency={w.settings.currency}
        defaultLocale={w.settings.defaultLocale}
        initial={initial}
      />
      <section className="archive-section">
        <ActionForm
          action={async () => {
            "use server";
            return changeProductState(restaurantId, {
              id: product!.id,
              menuId: w.menu.id,
              version: product!.version,
              archived: true,
            });
          }}
          submitKey="archive"
          redirectTo={`/${locale}/dashboard/${restaurantId}/products?branch=${w.branch.id}`}
        >
          <span className="sr-only">{t("archive")}</span>
        </ActionForm>
      </section>
    </>
  );
}
