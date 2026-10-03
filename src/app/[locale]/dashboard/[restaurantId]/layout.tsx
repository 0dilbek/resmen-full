import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ExternalLink } from "lucide-react";
import { getSession } from "@/modules/auth/server";
import { requireActor } from "@/modules/memberships/server";
import { AppError } from "@/infrastructure/errors";
import { Navigation } from "@/components/shell/navigation";
import { LanguageSwitcher } from "@/components/language-switcher";
export default async function Layout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string; restaurantId: string }>;
}) {
  const { locale, restaurantId } = await params;
  const session = await getSession();
  if (!session) redirect(`/${locale}/login`);
  const actor = await requireActor(restaurantId, "restaurant:read").catch(
    (error) => {
      if (
        error instanceof AppError &&
        (error.code === "NOT_FOUND" || error.code === "FORBIDDEN")
      )
        notFound();
      throw error;
    },
  );
  const t = await getTranslations();
  return (
    <div className="dashboard-shell">
      <Navigation
        restaurantId={restaurantId}
        name={actor.restaurant.name}
        role={actor.membership.role}
        userName={session.user.name}
      />
      <div className="dashboard-main">
        <header className="workspace-header">
          <span>
            {actor.restaurant.name}
            <span className="breadcrumb-divider">/</span>
            <span className="muted">{t("workspace")}</span>
          </span>
          <div>
            <LanguageSwitcher />
            <Link
              className="button button-outline button-sm"
              target="_blank"
              href={`/r/${actor.restaurant.slug}`}
            >
              {t("openMenu")}
              <ExternalLink size={13} />
            </Link>
          </div>
        </header>
        <main className="dashboard-content">{children}</main>
      </div>
    </div>
  );
}
