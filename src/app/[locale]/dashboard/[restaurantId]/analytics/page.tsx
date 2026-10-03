import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { workspace } from "@/modules/restaurants/queries";
import { BranchSwitcher } from "@/components/shell/branch-switcher";
import { analyticsReport } from "@/modules/analytics/server";
import { formatMoney } from "@/modules/products/money";
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ restaurantId: string; locale: string }>;
  searchParams: Promise<{ branch?: string; days?: string }>;
}) {
  const { restaurantId, locale } = await params;
  const query = await searchParams;
  const w = await workspace(restaurantId, "analytics:read", query.branch);
  const report = await analyticsReport(
    restaurantId,
    w.branch.id,
    ["7", "30", "90"].includes(query.days ?? "") ? query.days : 30,
  );
  const t = await getTranslations();
  const max = Math.max(1, ...report.daily.map((d) => d.n));
  return (
    <>
      <div className="page-title">
        <div>
          <p className="eyebrow">{w.branch.name}</p>
          <h1>{t("analytics")}</h1>
        </div>
        <BranchSwitcher branches={w.branches} selected={w.branch.id} />
      </div>
      <nav className="category-pills">
        {[7, 30, 90].map((d) => (
          <Link
            key={d}
            aria-current={report.days === d ? "page" : undefined}
            href={`?branch=${w.branch.id}&days=${d}`}
          >
            {t("lastDays", { days: d })}
          </Link>
        ))}
      </nav>
      <p className="muted">{t("analyticsPrivacy")}</p>
      <div className="stat-grid">
        {["QR_SCAN", "MENU_VIEW", "PRODUCT_VIEW", "CART_ADD"].map((kind) => (
          <article className="panel" key={kind}>
            <p>{t(`event_${kind}`)}</p>
            <strong className="stat-number">
              {report.events.find((e) => e.kind === kind)?.n ?? 0}
            </strong>
          </article>
        ))}
      </div>
      <section className="panel">
        <h2>{t("dailyViews")} · UTC</h2>
        {!report.daily.length && <p>{t("noRecords")}</p>}
        <div className="bar-chart">
          {report.daily.map((d) => (
            <div className="bar-row" key={d.day}>
              <time>{d.day}</time>
              <div className="bar-track">
                <span style={{ width: `${(d.n / max) * 100}%` }} />
              </div>
              <strong>{d.n}</strong>
            </div>
          ))}
        </div>
      </section>
      <div className="split-content">
        <section className="panel">
          <h2>{t("popularProducts")}</h2>
          {!report.popular.length && <p>{t("noRecords")}</p>}
          {report.popular.map((p) => (
            <div className="activity-row" key={p.id}>
              <span>{p.name || p.id}</span>
              <strong>{p.n}</strong>
            </div>
          ))}
        </section>
        <section className="panel">
          <h2>{t("languageUsage")}</h2>
          {report.language.map((l) => (
            <div className="activity-row" key={l.locale}>
              <span>{l.locale.toUpperCase()}</span>
              <strong>{l.n}</strong>
            </div>
          ))}
        </section>
      </div>
      <section className="panel">
        <h2>{t("orders")}</h2>
        <p>{t("orderMetricsHint")}</p>
        {!report.sales.length && <p>{t("noRecords")}</p>}
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>{t("status")}</th>
                <th>{t("orders")}</th>
                <th>{t("total")}</th>
              </tr>
            </thead>
            <tbody>
              {report.sales.map((s) => (
                <tr key={`${s.status}-${s.currency}`}>
                  <td>{t(`status_${s.status}`)}</td>
                  <td>{s.n}</td>
                  <td>{formatMoney(s.total, s.currency, locale)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
