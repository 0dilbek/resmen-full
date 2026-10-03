import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { ArrowUpRight, MoveRight, QrCode, UtensilsCrossed } from "lucide-react";
import { Brand } from "@/components/brand";
import { LanguageSwitcher } from "@/components/language-switcher";
import { Scene3D } from "@/components/visuals/scene-3d";
import { ProductVisuals } from "@/components/visuals/product-visuals";
export default async function Home() {
  const t = await getTranslations();
  const locale = await getLocale();
  return (
    <>
      <header className="marketing-header">
        <Brand href={`/${locale}`} />
        <nav>
          <Link href={`/${locale}/features`}>{t("features")}</Link>
          <Link href={`/${locale}/templates`}>{t("templates")}</Link>
          <Link href={`/${locale}/pricing`}>{t("pricing")}</Link>
        </nav>
        <div className="header-actions">
          <LanguageSwitcher />
          <Link className="text-link" href={`/${locale}/login`}>
            {t("login")}
          </Link>
          <Link className="button button-primary" href={`/${locale}/register`}>
            {t("register")}
            <ArrowUpRight size={16} />
          </Link>
        </div>
      </header>
      <main>
        <section className="marketing-hero">
          <div className="hero-copy">
            <span className="eyebrow">
              <span className="dot" />
              {t("heroEyebrow")}
            </span>
            <h1>{t("heroTitle")}</h1>
            <p>{t("heroNote")}</p>
            <div className="hero-actions">
              <Link
                className="button button-primary"
                href={`/${locale}/register`}
              >
                {t("heroCta")}
                <MoveRight size={18} />
              </Link>
              <Link
                className="button button-outline"
                href={`/${locale}/templates/minimal-01`}
              >
                {t("demo")}
              </Link>
            </div>
            <small>{t("noCard")}</small>
          </div>
          <Scene3D>
            <div className="hero-scene">
              <div className="scene-orbit" />
              <div className="phone-mock">
                <div className="phone-speaker" />
                <div className="mock-cover">
                  <span>NAVRO‘Z</span>
                  <UtensilsCrossed size={44} />
                  <p>Toshkent · Est. 2016</p>
                </div>
                <div className="mock-body">
                  <small>{t("phoneTagline")}</small>
                  <h3>{t("phoneTitle")}</h3>
                  <div className="mock-tabs">
                    <span>{t("phoneMenu")}</span>
                    <span>{t("phoneSpecials")}</span>
                    <span>{t("phoneDrinks")}</span>
                  </div>
                  {["Osh", "Manti", "Somsa"].map((name, i) => (
                    <div className="mock-dish" key={name}>
                      <div className={`dish-dot dish-${i}`} />
                      <div>
                        <strong>{name}</strong>
                        <small>{t("phoneDishNote")}</small>
                        <b>
                          {[45000, 38000, 12000][i].toLocaleString("en")} UZS
                        </b>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="qr-stand">
                <QrCode size={72} />
                <b>NAVRO‘Z</b>
                <small>{t("phoneScan")}</small>
              </div>
              <div className="scene-note">
                <span className="dot" />
                {t("publish")}
                <span>✓</span>
              </div>
            </div>
          </Scene3D>
        </section>
        <section className="feature-strip">
          {["templates", "qr", "orders"].map((key, i) => (
            <div key={key}>
              <span>0{i + 1}</span>
              <h2>{t(key)}</h2>
              <MoveRight size={20} />
            </div>
          ))}
        </section>
        <ProductVisuals />
      </main>
      <footer className="marketing-footer">
        <Brand href={`/${locale}`} />
        <span>© {new Date().getFullYear()} Resmen</span>
        <Link href={`/${locale}/contact`}>{t("contact")}</Link>
      </footer>
    </>
  );
}
