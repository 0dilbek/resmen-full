import type { Metadata } from "next";
import { getLocale } from "next-intl/server";
import "./globals.css";
import "@/modules/templates/compositions.css";
export const metadata: Metadata = {
  title: {
    default: "Ravoq — Your hospitality, beautifully connected",
    template: "%s · Ravoq",
  },
  description:
    "A multilingual digital menu and restaurant workspace. Made for hospitality.",
};
export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  return (
    <html lang={locale}>
      <body>{children}</body>
    </html>
  );
}
