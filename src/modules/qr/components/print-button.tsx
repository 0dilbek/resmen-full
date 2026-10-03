"use client";
import { useTranslations } from "next-intl";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
export function PrintButton() {
  const t = useTranslations();
  return (
    <Button className="no-print" onClick={() => window.print()}>
      <Printer size={16} />
      {t("print")}
    </Button>
  );
}
