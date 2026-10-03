import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { Brand } from "./brand";
import { LanguageSwitcher } from "./language-switcher";
export async function MarketingShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  const t = await getTranslations();
  return (
    <>
      <header className="marketing-header">
        <Brand href={`/${locale}`} />
        <nav>
          {["features", "templates", "pricing"].map((k) => (
            <Link href={`/${locale}/${k}`} key={k}>
              {t(k)}
            </Link>
          ))}
        </nav>
        <div className="header-actions">
          <LanguageSwitcher />
          <Link className="button button-primary" href={`/${locale}/register`}>
            {t("register")}
          </Link>
        </div>
      </header>
      <main className="marketing-page">{children}</main>
      <footer className="marketing-footer">
        <Brand href={`/${locale}`} />
        <span>© {new Date().getFullYear()} Resmen</span>
        <nav>
          {["faq", "contact", "privacy"].map((k) => (
            <Link key={k} href={`/${locale}/${k}`}>
              {t(k)}
            </Link>
          ))}
        </nav>
      </footer>
    </>
  );
}
