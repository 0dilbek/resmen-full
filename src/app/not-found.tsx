import Link from "next/link";
import { getTranslations } from "next-intl/server";
export default async function NotFound() {
  const t = await getTranslations();
  return (
    <main className="page-center">
      <p className="eyebrow">404</p>
      <h1>{t("notFound")}</h1>
      <Link className="button button-primary" href="/">
        {t("home")}
      </Link>
    </main>
  );
}
