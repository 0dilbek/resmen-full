import { notFound } from "next/navigation";
import { z } from "zod";
import { templateIds } from "@/modules/templates/registry";
import { TemplateRenderer } from "@/modules/templates/renderer";
import { demoMenu } from "@/modules/menus/demo";
import { isLocale } from "@/i18n/config";
export const metadata = { robots: { index: false, follow: false } };
export default async function Page({
  params,
}: {
  params: Promise<{ locale: string; templateId: string }>;
}) {
  const { locale, templateId } = await params;
  const selected = z.enum(templateIds).safeParse(templateId);
  if (!selected.success || !isLocale(locale)) notFound();
  return <TemplateRenderer data={demoMenu(locale, selected.data)} />;
}
