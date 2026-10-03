"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "./button";
import type { ActionResult } from "@/infrastructure/errors";
export function ActionForm({
  action,
  children,
  submitKey = "save",
  className = "form-stack",
  redirectTo,
}: {
  action: (form: FormData) => Promise<ActionResult<unknown>>;
  children?: React.ReactNode;
  submitKey?: string;
  className?: string;
  redirectTo?: string;
}) {
  const [state, setState] = useState<ActionResult<unknown> | null>(null);
  const [pending, setPending] = useState(false);
  const router = useRouter();
  const t = useTranslations();
  async function submit(form: FormData) {
    setPending(true);
    setState(null);
    try {
      const result = await action(form);
      setState(result);
      if (result.ok) {
        router.refresh();
        if (redirectTo) router.push(redirectTo);
      }
    } catch {
      setState({ ok: false, error: "INTERNAL" });
    } finally {
      setPending(false);
    }
  }
  return (
    <form action={submit} className={className}>
      {children}
      {state && (
        <p
          className={`notice ${state.ok ? "notice-success" : "notice-error"}`}
          role={state.ok ? "status" : "alert"}
        >
          {state.ok ? t("saved") : t(state.error)}
        </p>
      )}
      <div>
        <Button disabled={pending}>{t(pending ? "working" : submitKey)}</Button>
      </div>
    </form>
  );
}
