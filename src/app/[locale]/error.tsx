"use client";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
export default function ErrorPage({ reset }: { reset: () => void }) {
  const t = useTranslations();
  return (
    <main className="page-center">
      <h1>{t("genericError")}</h1>
      <Button onClick={reset}>{t("retry")}</Button>
    </main>
  );
}
