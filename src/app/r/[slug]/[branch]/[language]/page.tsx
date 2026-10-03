import { MenuAnalytics } from "@/modules/analytics/client";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import { getPublicMenu } from "@/modules/menus/public";
import { GuestOrdering } from "@/modules/orders/components/guest-order";
import { TemplateRenderer } from "@/modules/templates/renderer";
import { AppError } from "@/infrastructure/errors";
import { resolveQr } from "@/modules/qr/server";
import { env } from "@/infrastructure/env";
export const dynamic = "force-dynamic";
type Props = {
  params: Promise<{ slug: string; branch: string; language: string }>;
};
async function load(params: Props["params"]) {
  const p = await params;
  return getPublicMenu(p.slug, p.branch, p.language).catch((e) => {
    if (e instanceof AppError && e.status === 404) notFound();
    throw e;
  });
}
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { data } = await load(params);
  return {
    title: data.restaurant.name,
    description: data.restaurant.description,
    alternates: {
      canonical: new URL(data.identity.canonicalPath, env().APP_URL).toString(),
      languages: Object.fromEntries(
        data.enabledLocales.map((l) => [
          l,
          new URL(
            data.identity.canonicalPath.replace(/\/(uz|ru|en)$/, "/" + l),
            env().APP_URL,
          ).toString(),
        ]),
      ),
    },
  };
}
export default async function Page({
  params,
  searchParams,
}: Props & { searchParams: Promise<{ q?: string }> }) {
  const p = await params;
  const { data: baseData } = await load(params);
  const data = { ...baseData, context: { ...baseData.context } };
  if (`/r/${p.slug}/${p.branch}/${p.language}` !== data.identity.canonicalPath)
    redirect(data.identity.canonicalPath);
  const query = await searchParams;
  if (query.q) {
    const qr = await resolveQr(query.q).catch((e) => {
      if (e instanceof AppError) notFound();
      throw e;
    });
    if (
      qr.restaurant.id !== data.identity.restaurantId ||
      qr.branch.id !== data.identity.branchId
    )
      notFound();
    data.context = { ...data.context, tableLabel: qr.table?.label };
  }
  const messages = (
    await import(`../../../../../../messages/${data.locale}.json`)
  ).default;
  return (
    <NextIntlClientProvider locale={data.locale} messages={messages}>
      <GuestOrdering
        key={`${data.identity.menuId}-${query.q ?? "browse"}`}
        data={data}
        qrToken={query.q}
      >
        <MenuAnalytics slug={p.slug} branch={p.branch} locale={p.language} />
        <TemplateRenderer data={data} />
      </GuestOrdering>
    </NextIntlClientProvider>
  );
}
