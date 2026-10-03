import { getTranslations } from "next-intl/server";
import { MarketingShell } from "@/components/marketing-shell";
export default async function Page() {
  const t = await getTranslations();
  return (
    <MarketingShell>
      <div className="marketing-page-heading">
        <h1>{t("privacy")}</h1>
      </div>
      <article className="panel prose">
        {[1, 2, 3, 4].map((n) => (
          <section key={n}>
            <h2>{t(`privacyTitle${n}`)}</h2>
            <p>{t(`privacyText${n}`)}</p>
          </section>
        ))}
      </article>
    </MarketingShell>
  );
}
