"use client";
import { useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";
import { Receipt } from "./guest-order";
import { capabilitySchema } from "../validation";
function subscribe(listener: () => void) {
  window.addEventListener("storage", listener);
  return () => window.removeEventListener("storage", listener);
}
function receiptCredential(id: string) {
  try {
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key?.startsWith("ravoq:checkout:")) {
        const value = JSON.parse(sessionStorage.getItem(key) ?? "null") as {
          receipt?: { id?: unknown; credential?: unknown };
        } | null;
        if (value?.receipt?.id === id) {
          const parsed = capabilitySchema.safeParse(value.receipt.credential);
          if (parsed.success) return parsed.data;
        }
      }
    }
  } catch {
    /* Private browsing may deny storage access. */
  }
  return "";
}
export function ReceiptRecovery({
  id,
  locale,
}: {
  id: string;
  locale: string;
}) {
  const t = useTranslations();
  const credential = useSyncExternalStore(
    subscribe,
    () => receiptCredential(id),
    () => "",
  );
  return credential ? (
    <Receipt id={id} credential={credential} locale={locale} />
  ) : (
    <p className="notice">{t("receiptSessionOnly")}</p>
  );
}
