import Link from "next/link";
import { z } from "zod";
import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { workspace } from "@/modules/restaurants/queries";
import { qrWorkspace, qrDataUrl } from "@/modules/qr/server";
import { PrintButton } from "@/modules/qr/components/print-button";
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ restaurantId: string }>;
  searchParams: Promise<{ branch?: string; page?: string }>;
}) {
  const { restaurantId } = await params;
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
  const { codes, tables, totalPages } = await qrWorkspace(
    restaurantId,
    w.branch.id,
    page,
    50,
  );
  const t = await getTranslations();
  const cards = await Promise.all(
    codes
      .filter(
        (c) =>
          c.active &&
          (!c.tableId ||
            tables.some((table) => table.id === c.tableId && table.active)),
      )
      .map(async (c) => ({ ...c, image: await qrDataUrl(c.token) })),
  );
  return (
    <>
      <div className="page-title no-print">
        <h1>{t("printSheets")}</h1>
        <PrintButton />
      </div>
      <div className="qr-print-grid">
        {cards.map((c) => (
          <section className="qr-print-card" key={c.id}>
            <span className="eyebrow">{w.branch.name}</span>
            <h2>{w.restaurant.name}</h2>
            <p>{t("scanMenu")}</p>
            <Image
              src={c.image}
              alt={`${t("qr")} ${c.label}`}
              width={240}
              height={240}
              unoptimized
            />
            <strong>
              {c.kind === "TABLE" ? `${t("table")} ${c.label}` : c.label}
            </strong>
            <small>ravoq.</small>
          </section>
        ))}
      </div>
      <nav className="pagination no-print">
        {page > 1 && (
          <Link href={`?branch=${w.branch.id}&page=${page - 1}`}>
            {t("previous")}
          </Link>
        )}
        <span>
          {page} / {Math.max(1, totalPages)}
        </span>
        {page < totalPages && (
          <Link href={`?branch=${w.branch.id}&page=${page + 1}`}>
            {t("next")}
          </Link>
        )}
      </nav>
    </>
  );
}
