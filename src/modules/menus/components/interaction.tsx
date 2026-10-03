"use client";
import { createContext, useContext, useState, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { themeStyle } from "@/modules/templates/theme-style";
import { premiumDefinition } from "@/modules/templates/premium/catalog";
import { Dialog } from "@base-ui/react/dialog";
import { Search, X, UtensilsCrossed } from "lucide-react";
import { useTranslations } from "next-intl";
import type { MenuData, MenuProduct } from "../contract";
import { emitMenuEvent } from "@/modules/analytics/client";
import { OrderSelection } from "@/modules/orders/components/guest-order";
import { formatMoney } from "@/modules/products/money";
const MenuContext = createContext<{
  query: string;
  select: (id: string) => void;
}>({ query: "", select: () => {} });
export function MenuInteraction({
  data,
  children,
}: {
  data: MenuData;
  children: ReactNode;
}) {
  const t = useTranslations();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const product = data.products.find((p) => p.id === selected);
  return (
    <MenuContext
      value={{
        query,
        select: (id) => {
          setSelected(id);
          emitMenuEvent("PRODUCT_VIEW", id);
        },
      }}
    >
      <div className="menu-search">
        <Search size={18} />
        <label className="sr-only" htmlFor="menu-search">
          {t("searchMenu")}
        </label>
        <input
          id="menu-search"
          value={query}
          maxLength={120}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("searchMenu")}
        />
        {query && (
          <button aria-label={t("clearSearch")} onClick={() => setQuery("")}>
            <X size={18} />
          </button>
        )}
      </div>
      {query && !data.products.some((p) => matches(p, query)) && (
        <p className="menu-empty" role="status">
          {t("noSearchResults")}
        </p>
      )}
      {children}
      <Dialog.Root
        open={!!product}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      >
        <Dialog.Portal>
          <Dialog.Backdrop className="dialog-backdrop" />
          <Dialog.Popup
            className={`product-dialog menu-detail detail-${premiumDefinition(data.theme.config.templateId)?.composition ?? "classic"}`}
            style={themeStyle(data.theme.config)}
          >
            {product && (
              <>
                <Dialog.Close className="dialog-close" aria-label={t("close")}>
                  <X size={20} />
                </Dialog.Close>
                {product.images[0] && (
                  <Image
                    src={product.images[0].url}
                    width={640}
                    height={400}
                    alt={product.images[0].alt || product.name}
                    unoptimized
                    className="detail-image"
                  />
                )}
                <div className="detail-body">
                  <span className="eyebrow">
                    {
                      data.categories.find((c) => c.id === product.categoryId)
                        ?.name
                    }
                  </span>
                  <Dialog.Title>{product.name}</Dialog.Title>
                  <strong className="detail-price">
                    {formatMoney(
                      product.priceMinor,
                      data.currency,
                      data.locale,
                    )}
                  </strong>
                  <Dialog.Description>
                    {product.description || product.name}
                  </Dialog.Description>
                  {!product.available && (
                    <p className="badge">{t("soldOut")}</p>
                  )}
                  {product.ingredients && (
                    <section>
                      <h3>{t("ingredients")}</h3>
                      <p>{product.ingredients}</p>
                    </section>
                  )}
                  {product.allergens.length > 0 && (
                    <section>
                      <h3>{t("allergens")}</h3>
                      <div className="allergen-tags">
                        {product.allergens.map((a) => (
                          <span className="badge" key={a}>
                            {t(a)}
                          </span>
                        ))}
                      </div>
                    </section>
                  )}
                  <OrderSelection
                    key={product.id}
                    product={product}
                    data={data}
                    onAdded={() => setSelected(null)}
                  />
                </div>
              </>
            )}
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>
    </MenuContext>
  );
}
function matches(product: MenuProduct, query: string) {
  return `${product.name} ${product.description} ${product.ingredients}`
    .toLocaleLowerCase()
    .includes(query.trim().toLocaleLowerCase());
}
export function ProductVisibility({
  product,
  children,
}: {
  product: MenuProduct;
  children: ReactNode;
}) {
  const { query } = useContext(MenuContext);
  return (
    <div className="menu-product-wrap" hidden={!matches(product, query)}>
      {children}
    </div>
  );
}
export function CategoryVisibility({
  products,
  children,
}: {
  products: MenuProduct[];
  children: ReactNode;
}) {
  const { query } = useContext(MenuContext);
  return (
    <div hidden={!!query && !products.some((p) => matches(p, query))}>
      {children}
    </div>
  );
}
export function ProductOpen({
  productId,
  name,
  children,
}: {
  productId: string;
  name: string;
  children: ReactNode;
}) {
  const { select } = useContext(MenuContext);
  return (
    <button
      className="product-open"
      onClick={() => select(productId)}
      aria-label={name}
    >
      {children ?? <UtensilsCrossed size={18} />}
    </button>
  );
}

export function PublicLanguageLink({
  href,
  language,
  current,
}: {
  href: string;
  language: string;
  current: boolean;
}) {
  const params = useSearchParams();
  const q = params.get("q");
  const target =
    q && /^[A-Za-z0-9_-]{32}$/.test(q)
      ? `${href}?q=${encodeURIComponent(q)}`
      : href;
  return (
    <Link
      href={target}
      hrefLang={language}
      lang={language}
      aria-current={current ? "page" : undefined}
    >
      {language.toUpperCase()}
    </Link>
  );
}
