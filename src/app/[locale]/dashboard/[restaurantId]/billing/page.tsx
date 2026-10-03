import { workspace } from "@/modules/restaurants/queries";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { billingSummary } from "@/modules/billing/server";
import { formatMoney } from "@/modules/products/money";
export default async function Page({
  params,
}: {
  params: Promise<{ restaurantId: string; locale: string }>;
}) {
  const { restaurantId, locale } = await params;
  await workspace(restaurantId, "billing:manage");
  const data = await billingSummary(restaurantId);
  const t = await getTranslations();
  return (
    <>
      <div className="page-title">
        <h1>{t("billing")}</h1>
        <Link className="button" href={`/${locale}/contact`}>
          {t("contact")}
        </Link>
      </div>
      <section className="panel">
        <p className="eyebrow">{t("currentPlan")}</p>
        <h2>{data.plan?.name ?? t("freePlan")}</h2>
        <p>
          {data.plan
            ? formatMoney(
                data.plan.priceMinor.toString(),
                data.plan.currency,
                locale,
              )
            : t("freePrice")}
        </p>
        {data.subscription && (
          <p>
            {t("expiresAt")}:{" "}
            {data.subscription.endsAt.toISOString().slice(0, 10)}
          </p>
        )}
        <p>{t("manualBillingHint")}</p>
        <dl className="limits-list">
          {Object.entries(data.limits).map(([k, v]) => (
            <div key={k}>
              <dt>{t(k === "ordering" ? "enableOrdering" : k)}</dt>
              <dd>{typeof v === "boolean" ? t(v ? "yes" : "no") : v}</dd>
            </div>
          ))}
        </dl>
      </section>
      <section className="panel">
        <h2>{t("payments")}</h2>
        {!data.payments.length && <p>{t("noRecords")}</p>}
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>{t("paymentReference")}</th>
                <th>{t("price")}</th>
                <th>{t("status")}</th>
                <th>{t("date")}</th>
              </tr>
            </thead>
            <tbody>
              {data.payments.map((p) => (
                <tr key={p.id}>
                  <td>{p.reference}</td>
                  <td>
                    {formatMoney(p.amountMinor.toString(), p.currency, locale)}
                  </td>
                  <td>{t(p.voided ? "voided" : "received")}</td>
                  <td>{p.createdAt.toISOString().slice(0, 10)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
