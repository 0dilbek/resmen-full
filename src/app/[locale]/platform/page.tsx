import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Brand } from "@/components/brand";
import { LanguageSwitcher } from "@/components/language-switcher";
import { ActionForm } from "@/components/ui/action-form";
import { AppError } from "@/infrastructure/errors";
import { platformOverview } from "@/modules/platform-admin/queries";
import { platformCommand } from "@/modules/platform-admin/actions";
import { formatMoney } from "@/modules/products/money";
export const metadata = { robots: { index: false, follow: false } };
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations();
  const data = await platformOverview(await searchParams).catch((e) => {
    if (e instanceof AppError) {
      if (e.code === "UNAUTHENTICATED")
        redirect(`/${locale}/login?callbackURL=/${locale}/platform`);
      notFound();
    }
    throw e;
  });
  const reason = (
    <label>
      {t("operationReason")}
      <input name="reason" required minLength={5} maxLength={500} />
    </label>
  );
  return (
    <>
      <header className="site-header">
        <Brand href={`/${locale}`} />
        <Link href={`/${locale}/dashboard`}>{t("dashboard")}</Link>
        <LanguageSwitcher />
      </header>
      <main className="platform-content">
        <div className="page-title">
          <div>
            <p className="eyebrow">Ravoq</p>
            <h1>{t("platformAdmin")}</h1>
            <p>{t("adminFreshHint")}</p>
          </div>
        </div>
        <div className="stat-grid">
          {Object.entries(data.counts).map(([k, v]) => (
            <article className="panel" key={k}>
              <p>{t(`adminCount_${k}`)}</p>
              <strong className="stat-number">{v}</strong>
            </article>
          ))}
        </div>
        <nav className="category-pills">
          {[
            "restaurants",
            "users",
            "plans",
            "subscriptions",
            "payments",
            "templates",
            "systemSettings",
            "support",
            "audit",
          ].map((k) => (
            <a href={`#${k}`} key={k}>
              {t(k)}
            </a>
          ))}
        </nav>
        <form className="toolbar">
          <label>
            {t("search")}
            <input name="q" defaultValue={data.q} maxLength={100} />
          </label>
          <button className="button button-outline">{t("search")}</button>
        </form>
        <section className="panel" id="restaurants">
          <h2>{t("restaurants")}</h2>
          {data.tenants.map((r) => (
            <details key={r.id}>
              <summary>
                <strong>{r.name}</strong> · {r.slug} · {t(`tenant_${r.status}`)}
              </summary>
              <p>{r.owners}</p>
              <p>
                <code>{r.id}</code>
              </p>
              <ActionForm
                action={async (f) => {
                  "use server";
                  return platformCommand({
                    kind: "restaurant",
                    id: r.id,
                    status: f.get("status"),
                    reason: f.get("reason"),
                  });
                }}
              >
                <label>
                  {t("status")}
                  <select name="status" defaultValue={r.status}>
                    {["DRAFT", "ACTIVE", "SUSPENDED"].map((s) => (
                      <option value={s} key={s}>
                        {t(`tenant_${s}`)}
                      </option>
                    ))}
                  </select>
                </label>
                {reason}
              </ActionForm>
            </details>
          ))}
        </section>
        <section className="panel" id="users">
          <h2>{t("users")}</h2>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>{t("name")}</th>
                  <th>{t("email")}</th>
                  <th>{t("verified")}</th>
                  <th>MFA</th>
                </tr>
              </thead>
              <tbody>
                {data.accounts.map((u) => (
                  <tr key={u.id}>
                    <td>{u.name}</td>
                    <td>{u.email}</td>
                    <td>{t(u.verified ? "yes" : "no")}</td>
                    <td>{t(u.mfa ? "yes" : "no")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
        <section className="panel" id="plans">
          <h2>{t("plans")}</h2>
          <p>{t("immutablePlans")}</p>
          {data.plans.map((p) => (
            <details key={p.id}>
              <summary>
                {p.name} ·{" "}
                {formatMoney(p.priceMinor.toString(), p.currency, locale)} ·{" "}
                {t(p.active ? "active" : "inactive")}
              </summary>
              <code>{p.id}</code>
              <ActionForm
                action={async (f) => {
                  "use server";
                  return platformCommand({
                    kind: "planStatus",
                    id: p.id,
                    active: !p.active,
                    reason: f.get("reason"),
                  });
                }}
              >
                {reason}
              </ActionForm>
            </details>
          ))}
          <details>
            <summary>{t("createPlan")}</summary>
            <ActionForm
              action={async (f) => {
                "use server";
                return platformCommand({
                  kind: "plan",
                  reason: f.get("reason"),
                  plan: {
                    code: f.get("planCode"),
                    name: f.get("name"),
                    priceMinor: f.get("priceMinor"),
                    currency: f.get("currency"),
                    limits: {
                      branches: Number(f.get("branches")),
                      products: Number(f.get("products")),
                      members: Number(f.get("members")),
                      storageMb: Number(f.get("storageMb")),
                      ordering: f.get("ordering") === "on",
                    },
                  },
                });
              }}
            >
              <label>
                {t("planCode")}
                <input name="code" required pattern="[a-z0-9-]{2,40}" />
              </label>
              <label>
                {t("name")}
                <input name="name" required maxLength={80} />
              </label>
              <label>
                {t("minorAmount")}
                <input
                  name="priceMinor"
                  inputMode="numeric"
                  pattern="[0-9]{1,12}"
                  required
                />
              </label>
              <label>
                {t("currency")}
                <select name="currency">
                  <option>UZS</option>
                  <option>USD</option>
                  <option>EUR</option>
                </select>
              </label>
              {["branches", "products", "members", "storageMb"].map((k) => (
                <label key={k}>
                  {t(k)}
                  <input type="number" min="1" name={k} required />
                </label>
              ))}
              <label className="check-label">
                <input type="checkbox" name="ordering" defaultChecked />
                {t("enableOrdering")}
              </label>
              {reason}
            </ActionForm>
          </details>
        </section>
        <section className="panel" id="subscriptions">
          <h2>{t("subscriptions")}</h2>
          <p>{t("manualBillingHint")}</p>
          <details>
            <summary>{t("assignPlan")}</summary>
            <ActionForm
              action={async (f) => {
                "use server";
                return platformCommand({
                  kind: "subscription",
                  restaurantId: f.get("restaurantId"),
                  planId: f.get("planId"),
                  endsAt: `${f.get("endsAt")}T23:59:59.000Z`,
                  reason: f.get("reason"),
                });
              }}
            >
              <label>
                {t("restaurantId")}
                <input name="restaurantId" required />
              </label>
              <label>
                {t("plans")}
                <select name="planId" required>
                  {data.plans
                    .filter((p) => p.active)
                    .map((p) => (
                      <option value={p.id} key={p.id}>
                        {p.name}
                      </option>
                    ))}
                </select>
              </label>
              <label>
                {t("expiresAt")} UTC
                <input name="endsAt" type="date" required />
              </label>
              {reason}
            </ActionForm>
          </details>
          {data.subscriptions.map((s) => (
            <details key={s.id}>
              <summary>
                {s.name} · {s.plan} · {t(`subscription_${s.status}`)}
              </summary>
              <p>
                <code>{s.id}</code> · {s.endsAt.toISOString().slice(0, 10)}
              </p>
              <ActionForm
                submitKey="cancelSubscription"
                action={async (f) => {
                  "use server";
                  return platformCommand({
                    kind: "cancelSubscription",
                    restaurantId: s.restaurantId,
                    id: s.id,
                    reason: f.get("reason"),
                  });
                }}
              >
                {reason}
              </ActionForm>
              <h3>{t("recordPayment")}</h3>
              <ActionForm
                action={async (f) => {
                  "use server";
                  return platformCommand({
                    kind: "payment",
                    restaurantId: s.restaurantId,
                    subscriptionId: s.id,
                    amountMinor: f.get("amount"),
                    reference: f.get("reference"),
                    reason: f.get("reason"),
                  });
                }}
              >
                <label>
                  {t("minorAmount")}
                  <input
                    name="amount"
                    inputMode="numeric"
                    pattern="[1-9][0-9]{0,11}"
                    required
                  />
                </label>
                <label>
                  {t("paymentReference")}
                  <input
                    name="reference"
                    required
                    minLength={3}
                    maxLength={100}
                  />
                </label>
                {reason}
              </ActionForm>
            </details>
          ))}
        </section>
        <section className="panel" id="payments">
          <h2>{t("payments")}</h2>
          {data.payments.map((p) => (
            <details key={p.id}>
              <summary>
                {p.reference} ·{" "}
                {formatMoney(p.amountMinor.toString(), p.currency, locale)} ·{" "}
                {t(p.voided ? "voided" : "received")}
              </summary>
              <code>{p.restaurantId}</code>
              {!p.voided && (
                <ActionForm
                  submitKey="voidPayment"
                  action={async (f) => {
                    "use server";
                    return platformCommand({
                      kind: "voidPayment",
                      restaurantId: p.restaurantId,
                      id: p.id,
                      reason: f.get("reason"),
                    });
                  }}
                >
                  {reason}
                </ActionForm>
              )}
            </details>
          ))}
        </section>
        <section className="panel" id="templates">
          <h2>{t("templates")}</h2>
          <p>{t("templateStatusHint")}</p>
          <div className="admin-template-grid">
            {data.templates.map((c) => (
              <details key={c.id}>
                <summary>
                  {c.id} · {t(`template_${c.status}`)}
                </summary>
                <ActionForm
                  action={async (f) => {
                    "use server";
                    return platformCommand({
                      kind: "template",
                      id: c.id,
                      status: f.get("status"),
                      reason: f.get("reason"),
                    });
                  }}
                >
                  <label>
                    {t("status")}
                    <select name="status" defaultValue={c.status}>
                      {["ACTIVE", "RETIRED", "BLOCKED"].map((s) => (
                        <option key={s} value={s}>
                          {t(`template_${s}`)}
                        </option>
                      ))}
                    </select>
                  </label>
                  {reason}
                </ActionForm>
              </details>
            ))}
          </div>
        </section>
        <section className="panel" id="systemSettings">
          <h2>{t("systemSettings")}</h2>
          <ActionForm
            action={async (f) => {
              "use server";
              return platformCommand({
                kind: "settings",
                registrationEnabled: f.get("registrationEnabled") === "on",
                orderingEnabled: f.get("orderingEnabled") === "on",
                analyticsEnabled: f.get("analyticsEnabled") === "on",
                reason: f.get("reason"),
              });
            }}
          >
            {(
              [
                "registrationEnabled",
                "orderingEnabled",
                "analyticsEnabled",
              ] as const
            ).map((k) => (
              <label className="check-label" key={k}>
                <input
                  type="checkbox"
                  name={k}
                  defaultChecked={data.settings[k]}
                />
                {t(k)}
              </label>
            ))}
            {reason}
          </ActionForm>
        </section>
        <section className="panel" id="support">
          <h2>{t("support")}</h2>
          {data.tickets.length === 0 && <p>{t("noRecords")}</p>}
          {data.tickets.map((s) => (
            <details key={s.id}>
              <summary>
                {s.name} · {s.email}
              </summary>
              <p className="preserve-lines">{s.message}</p>
              <ActionForm
                submitKey="resolveTicket"
                action={async (f) => {
                  "use server";
                  return platformCommand({
                    kind: "resolveTicket",
                    id: s.id,
                    reason: f.get("reason"),
                  });
                }}
              >
                {reason}
              </ActionForm>
            </details>
          ))}
        </section>
        <section className="panel" id="audit">
          <h2>{t("audit")}</h2>
          {data.audits.map((a) => (
            <details key={a.id}>
              <summary>
                {a.action} · {a.createdAt.toISOString()}
              </summary>
              <p>{a.reason}</p>
              <code>
                {a.actorId} · {a.restaurantId}
              </code>
            </details>
          ))}
        </section>
        <nav className="pagination" aria-label={t("pagination")}>
          {data.page > 1 && (
            <Link
              href={`?page=${data.page - 1}&q=${encodeURIComponent(data.q)}`}
            >
              {t("previous")}
            </Link>
          )}
          <span>
            {t("page")} {data.page}
          </span>
          <Link href={`?page=${data.page + 1}&q=${encodeURIComponent(data.q)}`}>
            {t("next")}
          </Link>
        </nav>
      </main>
    </>
  );
}
