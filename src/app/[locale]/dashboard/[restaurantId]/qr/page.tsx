import { z } from "zod";
import Image from "next/image";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { workspace } from "@/modules/restaurants/queries";
import { qrWorkspace, qrDataUrl, qrUrl } from "@/modules/qr/server";
import {
  createTable,
  createQr,
  setQrActive,
  setTableActive,
} from "@/modules/qr/actions";
import { ActionForm } from "@/components/ui/action-form";
import { BranchSwitcher } from "@/components/shell/branch-switcher";
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; restaurantId: string }>;
  searchParams: Promise<{ branch?: string; page?: string }>;
}) {
  const { locale, restaurantId } = await params;
  const w = await workspace(
    restaurantId,
    "qr:manage",
    (await searchParams).branch,
  );
  const page = z.coerce
    .number()
    .int()
    .min(1)
    .max(10000)
    .catch(1)
    .parse((await searchParams).page ?? 1);
  const data = await qrWorkspace(restaurantId, w.branch.id, page);
  const t = await getTranslations();
  const images = await Promise.all(
    data.codes.map(async (code) => ({
      code,
      image: await qrDataUrl(code.token),
    })),
  );
  return (
    <>
      <div className="page-title">
        <div>
          <h1>{t("qr")}</h1>
          <p className="muted">{t("qrStableHint")}</p>
        </div>
        <BranchSwitcher branches={w.branches} selected={w.branch.id} />
      </div>
      <div className="form-grid">
        <section className="panel">
          <h2>{t("addTable")}</h2>
          <ActionForm
            action={async (form) => {
              "use server";
              return createTable(restaurantId, {
                branchId: w.branch.id,
                label: String(form.get("label") ?? ""),
              });
            }}
            submitKey="addTable"
          >
            <label>
              {t("tableLabel")}
              <input name="label" required maxLength={40} placeholder="01" />
            </label>
          </ActionForm>
        </section>
        <section className="panel">
          <h2>{t("generalQr")}</h2>
          <ActionForm
            action={async (form) => {
              "use server";
              return createQr(restaurantId, {
                branchId: w.branch.id,
                label: String(form.get("label") ?? ""),
                kind: form.get("kind"),
              });
            }}
            submitKey="createQr"
          >
            <label>
              {t("qrLabel")}
              <input name="label" required maxLength={80} />
            </label>
            <label>
              {t("qrScope")}
              <select name="kind">
                <option value="BRANCH">{t("branch")}</option>
                {w.actor.allBranches && (
                  <option value="RESTAURANT">{t("restaurant")}</option>
                )}
              </select>
            </label>
          </ActionForm>
        </section>
      </div>
      {data.tables.length > 0 && (
        <section className="panel">
          <h2>{t("tables")}</h2>
          {data.tables.map((table) => (
            <div className="activity-row" key={table.id}>
              <strong>
                {t("table")} {table.label}
              </strong>
              <span className="badge">
                {t(table.active ? "active" : "inactive")}
              </span>
              <ActionForm
                action={async () => {
                  "use server";
                  return setTableActive(restaurantId, {
                    id: table.id,
                    active: !table.active,
                  });
                }}
                submitKey={table.active ? "archive" : "activate"}
              />
            </div>
          ))}
        </section>
      )}
      <div className="section-heading">
        <h2>{t("qrCodes")}</h2>
        <Link
          className="button button-outline"
          href={`/${locale}/dashboard/${restaurantId}/qr/print?branch=${w.branch.id}`}
        >
          {t("printSheets")}
        </Link>
      </div>
      <div className="qr-grid">
        {images.map(({ code, image }) => (
          <section className="panel qr-card" key={code.id}>
            <span className="badge">{t(code.kind.toLowerCase())}</span>
            <h3>{code.label}</h3>
            <Image
              src={image}
              width={240}
              height={240}
              alt={`${t("qr")} · ${code.label}`}
              unoptimized
            />
            <Link className="qr-url" href={qrUrl(code.token)} target="_blank">
              {qrUrl(code.token)}
            </Link>
            <div className="qr-downloads">
              <a
                className="button button-outline button-sm"
                href={`/api/qr/${restaurantId}/${code.id}?format=png`}
              >
                PNG
              </a>
              <a
                className="button button-outline button-sm"
                href={`/api/qr/${restaurantId}/${code.id}?format=svg`}
              >
                SVG
              </a>
            </div>
            <ActionForm
              action={async () => {
                "use server";
                return setQrActive(restaurantId, {
                  id: code.id,
                  active: !code.active,
                });
              }}
              submitKey={code.active ? "revokeQr" : "activate"}
            />
          </section>
        ))}
      </div>
      <nav className="pagination">
        {page > 1 && (
          <Link
            className="button button-outline"
            href={`?branch=${w.branch.id}&page=${page - 1}`}
          >
            {t("previous")}
          </Link>
        )}
        <span>
          {page} / {Math.max(1, data.totalPages)}
        </span>
        {page < data.totalPages && (
          <Link
            className="button button-outline"
            href={`?branch=${w.branch.id}&page=${page + 1}`}
          >
            {t("next")}
          </Link>
        )}
      </nav>
    </>
  );
}
