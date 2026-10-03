"use client";
import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { authClient } from "../client";
import { Button } from "@/components/ui/button";
export function SignOut() {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);
  return (
    <div>
      <Button
        variant="outline"
        disabled={pending}
        onClick={async () => {
          setPending(true);
          setError(false);
          try {
            const result = await authClient.signOut();
            if (result.error) throw Error("Sign out failed");
            router.push(`/${locale}/login`);
            router.refresh();
          } catch {
            setError(true);
          } finally {
            setPending(false);
          }
        }}
      >
        {t(pending ? "working" : "logout")}
      </Button>
      {error && <p role="alert">{t("connectionError")}</p>}
    </div>
  );
}
