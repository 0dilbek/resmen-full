import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import {
  Palette,
  QrCode,
  ShoppingBag,
  Languages,
  Users,
  BarChart3,
} from "lucide-react";
import { MarketingShell } from "@/components/marketing-shell";
export default async function Page() {
  const t = await getTranslations();
  const locale = await getLocale();
  const features = [
    { key: "templates", Icon: Palette },
    { key: "qr", Icon: QrCode },
    { key: "orders", Icon: ShoppingBag },
    { key: "languages", Icon: Languages },
    { key: "team", Icon: Users },
    { key: "analytics", Icon: BarChart3 },
  ];
  return (
    <MarketingShell>
      <div className="marketing-page-heading">
        <p className="eyebrow">Resmen</p>
        <h1>{t("featuresTitle")}</h1>
        <p>{t("featuresNote")}</p>
      </div>
      <div className="marketing-cards">
        {features.map(({ key, Icon }, i) => (
          <article className="panel" key={key}>
            <Icon size={28} />
            <span className="eyebrow">0{i + 1}</span>
            <h2>{t(key)}</h2>
            <p>{t(`feature_${key}`)}</p>
          </article>
        ))}
      </div>
      <div className="marketing-cta">
        <h2>{t("readyToStart")}</h2>
        <Link className="button button-primary" href={`/${locale}/register`}>
          {t("heroCta")}
        </Link>
      </div>
    </MarketingShell>
  );
}
