import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { Check } from "lucide-react";
import { MarketingShell } from "@/components/marketing-shell";
import { freeLimits } from "@/modules/billing/validation";
export default async function Page() {
  const t = await getTranslations();
  const locale = await getLocale();
  return (
    <MarketingShell>
      <div className="marketing-page-heading">
        <p className="eyebrow">{t("pricing")}</p>
        <h1>{t("pricingTitle")}</h1>
        <p>{t("pricingNote")}</p>
      </div>
      <div className="pricing-grid">
        <article className="panel pricing-card">
          <span className="eyebrow">{t("freePlan")}</span>
          <h2>{t("freePrice")}</h2>
          <p>{t("starterNote")}</p>
          <ul>
            {[
              t("planBranches", { n: freeLimits.branches }),
              t("planProducts", { n: freeLimits.products }),
              t("planMembers", { n: freeLimits.members }),
              t("planStorage", { n: freeLimits.storageMb }),
              t("thirtyTemplates"),
              t("threeLanguages"),
              t("tableOrdering"),
            ].map((item) => (
              <li key={item}>
                <Check size={18} />
                {item}
              </li>
            ))}
          </ul>
          <Link className="button button-primary" href={`/${locale}/register`}>
            {t("heroCta")}
          </Link>
        </article>
        <article className="panel pricing-card">
          <span className="eyebrow">{t("growthPlan")}</span>
          <h2>{t("letsTalk")}</h2>
          <p>{t("growthNote")}</p>
          <ul>
            {["moreBranches", "moreCapacity", "personalSetup"].map((k) => (
              <li key={k}>
                <Check size={18} />
                {t(k)}
              </li>
            ))}
          </ul>
          <Link className="button button-outline" href={`/${locale}/contact`}>
            {t("contact")}
          </Link>
        </article>
      </div>
      <p className="muted">{t("manualBillingHint")}</p>
    </MarketingShell>
  );
}
