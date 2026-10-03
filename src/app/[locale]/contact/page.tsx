import { getTranslations } from "next-intl/server";
import { MarketingShell } from "@/components/marketing-shell";
import { ActionForm } from "@/components/ui/action-form";
import { submitContact } from "@/modules/support/actions";
export default async function Page() {
  const t = await getTranslations();
  return (
    <MarketingShell>
      <div className="marketing-page-heading">
        <p className="eyebrow">Resmen</p>
        <h1>{t("contactTitle")}</h1>
        <p>{t("contactNote")}</p>
      </div>
      <section className="panel contact-panel">
        <ActionForm
          submitKey="sendMessage"
          action={async (f) => {
            "use server";
            return submitContact({
              name: f.get("name"),
              email: f.get("email"),
              message: f.get("message"),
              website: f.get("website"),
            });
          }}
        >
          <label>
            {t("name")}
            <input
              name="name"
              required
              minLength={2}
              maxLength={100}
              autoComplete="name"
            />
          </label>
          <label>
            {t("email")}
            <input
              name="email"
              required
              type="email"
              maxLength={254}
              autoComplete="email"
            />
          </label>
          <label>
            {t("message")}
            <textarea
              name="message"
              required
              minLength={20}
              maxLength={3000}
              rows={6}
            />
          </label>
          <label className="honeypot" aria-hidden="true">
            Website
            <input name="website" tabIndex={-1} autoComplete="off" />
          </label>
        </ActionForm>
      </section>
    </MarketingShell>
  );
}
