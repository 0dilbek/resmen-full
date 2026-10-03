import Image from "next/image";
import { getTranslations } from "next-intl/server";
import type { MenuData } from "@/modules/menus/contract";
import { ProductCard } from "@/modules/menus/components/default-menu";
export function Cover({ data }: { data: MenuData }) {
  const id = data.theme.config.coverMediaId;
  const source = id
    ? `/api/media/${id}/1440`
    : data.products.find((product) => product.images.length)?.images[0]?.url;
  return source ? (
    <Image
      src={source}
      alt=""
      width={1440}
      height={700}
      sizes="100vw"
      loading="eager"
      unoptimized
      className="template-cover"
    />
  ) : (
    <div className="template-cover cover-fallback" aria-hidden="true">
      <span>{data.restaurant.name.charAt(0)}</span>
    </div>
  );
}
export function Ornament() {
  return (
    <svg aria-hidden="true" viewBox="0 0 200 24" className="menu-ornament">
      <path
        d="M0 12h65l12-10 12 10-12 10-12-10m24 0 11-11 11 11-11 11-11-11m22 0 12-10 12 10-12 10-12-10h89"
        fill="none"
        stroke="currentColor"
        strokeWidth="1"
      />
    </svg>
  );
}
export async function Featured({ data }: { data: MenuData }) {
  const t = await getTranslations({ locale: data.locale });
  const items = data.products.filter((p) => p.featured);
  if (!items.length) return null;
  return (
    <aside className="template-featured">
      <h2>{t("chefsChoice")}</h2>
      <div className="featured-grid">
        {items.slice(0, 3).map((p) => (
          <ProductCard key={p.id} product={p} data={data} />
        ))}
      </div>
    </aside>
  );
}
export async function CategoryIndex({ data }: { data: MenuData }) {
  const t = await getTranslations({ locale: data.locale });
  return (
    <nav className="category-index" aria-label={t("categories")}>
      <span className="eyebrow">{t("menuIndex")}</span>
      {data.categories
        .filter((c) => c.productIds.length)
        .map((c, i) => (
          <a key={c.id} href={`#category-${c.id}`}>
            <small>{String(i + 1).padStart(2, "0")}</small>
            <span>{c.name}</span>
            <span aria-hidden="true">↗</span>
          </a>
        ))}
    </nav>
  );
}
