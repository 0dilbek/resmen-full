import { notFound } from "next/navigation";
import { z } from "zod";
import { getTranslations } from "next-intl/server";
import { Brand } from "@/components/brand";
import { ReceiptRecovery } from "@/modules/orders/components/receipt-recovery";
export const metadata = { robots: { index: false, follow: false } };
export default async function Page({
  params,
}: {
  params: Promise<{ locale: string; orderId: string }>;
}) {
  const { locale, orderId } = await params;
  if (!z.uuid().safeParse(orderId).success) notFound();
  const t = await getTranslations();
  return (
    <main className="page-center">
      <Brand href={`/${locale}`} />
      <section className="panel">
        <h1>{t("yourOrder")}</h1>
        <ReceiptRecovery id={orderId} locale={locale} />
      </section>
    </main>
  );
}
