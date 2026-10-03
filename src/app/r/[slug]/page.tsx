import { notFound, redirect } from "next/navigation";
import { publicGate } from "@/modules/menus/public";
import { AppError } from "@/infrastructure/errors";
export const dynamic = "force-dynamic";
export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const gate = await publicGate(slug).catch((e) => {
    if (e instanceof AppError && e.status === 404) notFound();
    throw e;
  });
  redirect(
    `/r/${gate.restaurant.slug}/${gate.branch.slug}/${gate.settings.defaultLocale}`,
  );
}
