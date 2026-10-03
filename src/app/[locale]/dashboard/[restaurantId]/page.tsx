import Link from "next/link";
import { getTranslations } from "next-intl/server";
import {
  ArrowUpRight,
  UtensilsCrossed,
  Palette,
  QrCode,
  Check,
} from "lucide-react";
import { workspace } from "@/modules/restaurants/queries";
import { BranchSwitcher } from "@/components/shell/branch-switcher";
import { can } from "@/modules/memberships/policy";
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; restaurantId: string }>;
  searchParams: Promise<{ branch?: string }>;
}) {
  const { locale, restaurantId } = await params;
  const w = await workspace(
    restaurantId,
    "restaurant:read",
    (await searchParams).branch,
  );
  const t = await getTranslations();
  const base = `/${locale}/dashboard/${restaurantId}`;
  return (
    <>
      <div className="page-title">
        <div>
          <p className="eyebrow">{w.restaurant.name}</p>
          <h1>{t("dashboard")}</h1>
          <p className="muted">{w.branch.name}</p>
        </div>
        <BranchSwitcher branches={w.branches} selected={w.branch.id} />
      </div>
      <section className="welcome-panel">
        <div>
          <span className="eyebrow">{t("gettingStarted")}</span>
          <h2>{t("menuReady")}</h2>
          <p>{t("menuReadyNote")}</p>
          {can(w.actor.membership.role, "catalog:manage") && (
            <Link
              className="button button-primary"
              href={`${base}/products?branch=${w.branch.id}`}
            >
              {t("stepMenu")}
              <ArrowUpRight size={17} />
            </Link>
          )}
        </div>
        <div className="welcome-arch" aria-hidden="true">
          <UtensilsCrossed size={42} />
        </div>
      </section>
      <div className="section-heading">
        <h2>{t("gettingStarted")}</h2>
        <span className={`badge ${w.menu.published ? "badge-green" : ""}`}>
          {t(w.menu.published ? "live" : "draft")}
        </span>
      </div>
      <div className="onboarding-grid">
        {[
          {
            key: "stepMenu",
            path: "products",
            icon: UtensilsCrossed,
            permission: "catalog:manage",
          },
          {
            key: "stepDesign",
            path: "templates",
            icon: Palette,
            permission: "template:manage",
          },
          { key: "stepQr", path: "qr", icon: QrCode, permission: "qr:manage" },
        ]
          .filter((step) =>
            can(
              w.actor.membership.role,
              step.permission as
                "catalog:manage" | "template:manage" | "qr:manage",
            ),
          )
          .map((step, i) => (
            <Link
              className="panel onboarding-card"
              key={step.key}
              href={`${base}/${step.path}?branch=${w.branch.id}`}
            >
              <span className="step-number">0{i + 1}</span>
              <step.icon size={24} />
              <h3>{t(step.key)}</h3>
              <ArrowUpRight size={17} />
            </Link>
          ))}
      </div>
      {w.menu.published && (
        <p className="notice notice-success">
          <Check size={16} />
          {t("live")}
        </p>
      )}
    </>
  );
}
