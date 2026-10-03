import Image from "next/image";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { MarketingShell } from "@/components/marketing-shell";
import { templates, previewVersion } from "@/modules/templates/registry";
import {
  designCategories,
  premiumDefinition,
} from "@/modules/templates/premium/catalog";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ family?: string; category?: string }>;
}) {
  const locale = await getLocale();
  const t = await getTranslations();
  const query = await searchParams;
  const legacyFamily = [
    "minimal",
    "luxury",
    "coffee",
    "fastfood",
    "asian",
    "uzbek",
  ].includes(query.family ?? "")
    ? query.family
    : null;
  const family = query.category ?? (legacyFamily ? "legacy" : null);
  const families: readonly string[] = [...designCategories, "legacy"];
  const chosen = families.includes(family ?? "") ? family : null;
  return (
    <MarketingShell>
      <div className="marketing-page-heading">
        <p className="eyebrow">30 / 06</p>
        <h1>{t("templateGalleryTitle")}</h1>
        <p>{t("templateGalleryNote")}</p>
      </div>
      <nav className="category-pills">
        <Link
          href={`/${locale}/templates`}
          aria-current={!chosen ? "page" : undefined}
        >
          {t("all")}
        </Link>
        {families.map((f) => (
          <Link
            href={`?category=${f}`}
            key={f}
            aria-current={f === chosen ? "page" : undefined}
          >
            {t(`designCategory_${f}`)}
          </Link>
        ))}
      </nav>
      <div className="public-template-grid">
        {templates
          .filter((d) =>
            chosen === "legacy"
              ? !d.premium && (!legacyFamily || d.family === legacyFamily)
              : d.premium &&
                (!chosen || premiumDefinition(d.id)?.category === chosen),
          )
          .map((d) => (
            <article className="public-template-card" key={d.id}>
              <Link href={`/${locale}/templates/${d.id}`}>
                <div
                  className="template-shot"
                  style={{ background: d.background }}
                >
                  <Image
                    src={`/template-previews/${d.id}/${previewVersion(d)}/mobile.png`}
                    alt={d.name}
                    width={390}
                    height={650}
                    sizes="(max-width:600px) 90vw, 280px"
                  />
                </div>
                <div className="template-card-caption">
                  <div>
                    <span className="eyebrow">
                      {d.premium
                        ? t(
                            `designCategory_${premiumDefinition(d.id)!.category}`,
                          )
                        : t(`family_${d.family}`)}
                    </span>
                    <h2>{d.name}</h2>
                    <p>
                      {d.premium
                        ? t(`designDescription_${d.id}`)
                        : t("legacyDesignDescription")}
                    </p>
                  </div>
                  <span>{t("preview")} ↗</span>
                </div>
              </Link>
            </article>
          ))}
      </div>
    </MarketingShell>
  );
}
