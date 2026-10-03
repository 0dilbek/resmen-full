import { getTranslations } from "next-intl/server";
import { Brand } from "@/components/brand";
import { LanguageSwitcher } from "@/components/language-switcher";
import { AuthForm } from "./auth-form";
export async function AuthPage({
  mode,
  token,
}: {
  mode: "login" | "register" | "forgot" | "reset";
  token?: string;
}) {
  const t = await getTranslations();
  return (
    <main className="auth-page">
      <aside className="auth-art">
        <Brand inverse />
        <div>
          <span className="eyebrow">{t("heroEyebrow")}</span>
          <h1>{t("heroTitle")}</h1>
          <p>{t("heroNote")}</p>
        </div>
        <div className="arch-art" aria-hidden="true">
          <div />
          <div />
          <div />
        </div>
      </aside>
      <section className="auth-main">
        <LanguageSwitcher />
        <div className="auth-card">
          <div className="mobile-brand">
            <Brand />
          </div>
          <h2>
            {t(
              mode === "login"
                ? "welcome"
                : mode === "register"
                  ? "createAccount"
                  : "resetPassword",
            )}
          </h2>
          <p className="muted">
            {t(mode === "register" ? "accountNote" : "welcomeNote")}
          </p>
          <AuthForm mode={mode} token={token} />
        </div>
      </section>
    </main>
  );
}
