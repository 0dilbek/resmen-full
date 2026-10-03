import { EmptyIllustration } from "@/components/visuals/empty-illustration";
import Image from "next/image";
import { MapPin, Phone, ArrowUpRight, UtensilsCrossed } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Brand } from "@/components/brand";
import { formatMoney } from "@/modules/products/money";
import type { MenuData, MenuProduct } from "../contract";
import {
  MenuInteraction,
  CategoryVisibility,
  ProductVisibility,
  ProductOpen,
  PublicLanguageLink,
} from "./interaction";
export async function MenuTopline({ data }: { data: MenuData }) {
  const t = await getTranslations({ locale: data.locale });
  return (
    <div className="menu-topline">
      <span className="eyebrow">
        {data.context.tableLabel
          ? `${t("table")} ${data.context.tableLabel}`
          : data.context.branchName}
      </span>
      <nav aria-label={t("language")} className="menu-languages">
        {data.enabledLocales.map((l) => (
          <PublicLanguageLink
            href={
              data.identity.canonicalPath.startsWith("/r/")
                ? data.identity.canonicalPath.replace(/\/(uz|ru|en)$/, "/" + l)
                : data.identity.canonicalPath.replace(
                    /^\/(uz|ru|en)\//,
                    `/${l}/`,
                  )
            }
            language={l}
            current={data.locale === l}
            key={l}
          />
        ))}
      </nav>
    </div>
  );
}
export async function MenuIdentity({ data }: { data: MenuData }) {
  const t = await getTranslations({ locale: data.locale });
  return (
    <div className="menu-identity">
      {data.theme.config.logoMediaId ? (
        <Image
          className="menu-logo"
          src={`/api/media/${data.theme.config.logoMediaId}/320`}
          alt={data.restaurant.name}
          width={80}
          height={80}
          unoptimized
        />
      ) : (
        <div className="menu-monogram" aria-hidden="true">
          {data.restaurant.name.charAt(0)}
        </div>
      )}
      <p className="eyebrow">{t("welcomeTable")}</p>
      <h1>{data.restaurant.name}</h1>
      {data.restaurant.description && (
        <p className="menu-intro">{data.restaurant.description}</p>
      )}
      <div className="menu-contact">
        {data.restaurant.address && (
          <span>
            <MapPin size={14} />
            {data.restaurant.address}
          </span>
        )}
        {data.restaurant.phone && (
          <a href={`tel:${data.restaurant.phone.replace(/[^+\d]/g, "")}`}>
            <Phone size={14} />
            {data.restaurant.phone}
          </a>
        )}
      </div>
    </div>
  );
}
export async function MenuHeader({ data }: { data: MenuData }) {
  return (
    <header className="menu-header">
      <MenuTopline data={data} />
      <MenuIdentity data={data} />
    </header>
  );
}
export async function CategoryNav({ data }: { data: MenuData }) {
  const t = await getTranslations({ locale: data.locale });
  return (
    <nav className="menu-category-nav" aria-label={t("categories")}>
      {data.categories
        .filter((c) => c.productIds.length)
        .map((c) => (
          <a href={`#category-${c.id}`} key={c.id}>
            {c.name}
          </a>
        ))}
    </nav>
  );
}
export async function ProductCard({
  product,
  data,
}: {
  product: MenuProduct;
  data: MenuData;
}) {
  const t = await getTranslations({ locale: data.locale });
  return (
    <ProductVisibility product={product}>
      <article
        className={`menu-product ${!product.available ? "unavailable" : ""}`}
      >
        <div className="menu-product-copy">
          {product.featured && (
            <span className="featured-label">{t("chefsChoice")}</span>
          )}
          <h3>
            <ProductOpen productId={product.id} name={product.name}>
              {product.name}
            </ProductOpen>
          </h3>
          {product.description && <p>{product.description}</p>}
          <div className="menu-product-bottom">
            <strong>
              {formatMoney(product.priceMinor, data.currency, data.locale)}
            </strong>
            {!product.available ? (
              <span className="sold-out">{t("soldOut")}</span>
            ) : (
              <ProductOpen
                productId={product.id}
                name={`${t("details")} · ${product.name}`}
              >
                <ArrowUpRight size={19} />
              </ProductOpen>
            )}
          </div>
        </div>
        {product.images[0] ? (
          <div className="menu-product-photo">
            <Image
              src={product.images[0].url}
              alt={product.images[0].alt || product.name}
              width={320}
              height={240}
              sizes="(max-width:600px) 112px, 240px"
              unoptimized
              loading="lazy"
            />
          </div>
        ) : (
          <div className="menu-product-placeholder" aria-hidden="true">
            <UtensilsCrossed size={25} />
          </div>
        )}
      </article>
    </ProductVisibility>
  );
}
export async function MenuSections({
  data,
  headingMedia = false,
}: {
  data: MenuData;
  headingMedia?: boolean;
}) {
  if (!data.products.length) {
    const t = await getTranslations({ locale: data.locale });
    return (
      <div className="menu-empty">
        <EmptyIllustration kind="menu" />
        <p>{t("publicEmpty")}</p>
      </div>
    );
  }
  return (
    <div className="menu-sections">
      {data.categories
        .filter((c) => c.productIds.length)
        .map((c, i) => {
          const items = data.products.filter((p) => p.categoryId === c.id);
          return (
            <CategoryVisibility key={c.id} products={items}>
              <section id={`category-${c.id}`} className="menu-category">
                {headingMedia && (
                  <div className="category-cover">
                    {items.find((p) => p.images.length)?.images[0] ? (
                      <Image
                        src={items.find((p) => p.images.length)!.images[0].url}
                        width={960}
                        height={300}
                        alt=""
                        unoptimized
                      />
                    ) : (
                      <span aria-hidden="true">{c.name.charAt(0)}</span>
                    )}
                  </div>
                )}
                <header className="menu-section-title">
                  <span aria-hidden="true">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <h2>{c.name}</h2>
                  <span className="menu-category-count">{items.length}</span>
                </header>
                <div className="menu-product-list">
                  {items.map((p) => (
                    <ProductCard key={p.id} product={p} data={data} />
                  ))}
                </div>
              </section>
            </CategoryVisibility>
          );
        })}
    </div>
  );
}
export async function MenuFooter({ data }: { data: MenuData }) {
  const t = await getTranslations({ locale: data.locale });
  return (
    <footer className="menu-footer">
      <p>{t("allergyNote")}</p>
      <Brand href={`/${data.locale}`} />
    </footer>
  );
}
export async function DefaultMenu({ data }: { data: MenuData }) {
  const t = await getTranslations({ locale: data.locale });
  return (
    <main className="public-menu template-minimal">
      <div className="menu-container">
        <MenuHeader data={data} />
        <CategoryNav data={data} />
        <MenuInteraction data={data}>
          {data.products.length ? (
            <MenuSections data={data} />
          ) : (
            <p className="menu-empty">{t("publicEmpty")}</p>
          )}
        </MenuInteraction>
        <MenuFooter data={data} />
      </div>
    </main>
  );
}
