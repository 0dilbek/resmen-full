import { getTranslations } from "next-intl/server";
import { MarketingShell } from "@/components/marketing-shell";
export default async function Page() {
  const t = await getTranslations();
  return (
    <MarketingShell>
      <div className="marketing-page-heading">
        <p className="eyebrow">Resmen</p>
        <h1>{t("faq")}</h1>
      </div>
      <div className="faq-list">
        {[1, 2, 3, 4, 5, 6].map((n) => (
          <details className="panel" key={n}>
            <summary>{t(`faqQ${n}`)}</summary>
            <p>{t(`faqA${n}`)}</p>
          </details>
        ))}
      </div>
    </MarketingShell>
  );
}
