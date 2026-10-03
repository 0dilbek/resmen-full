"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { authClient } from "../client";
import { Button } from "@/components/ui/button";
type Mode = "login" | "register" | "forgot" | "reset";
export function AuthForm({ mode, token }: { mode: Mode; token?: string }) {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [pending, setPending] = useState(false);
  const [twoFactor, setTwoFactor] = useState(false);
  const [backupMode, setBackupMode] = useState(false);
  async function submit(form: FormData) {
    setPending(true);
    setError("");
    setNotice("");
    const email = String(form.get("email") ?? "");
    const password = String(form.get("password") ?? "");
    try {
      if (twoFactor) {
        const payload = { code: String(form.get("code")) };
        const result = backupMode
          ? await authClient.twoFactor.verifyBackupCode(payload)
          : await authClient.twoFactor.verifyTotp(payload);
        if (result.error) {
          setError(result.error.message ?? t("genericError"));
          return;
        }
        router.push(`/${locale}/dashboard`);
        router.refresh();
        return;
      }
      if (mode === "register") {
        const result = await authClient.signUp.email({
          email,
          password,
          name: String(form.get("name")),
          callbackURL: `/${locale}/dashboard`,
        });
        if (result.error) setError(result.error.message ?? t("genericError"));
        else setNotice(t("verifyEmail"));
      } else if (mode === "forgot") {
        const result = await authClient.requestPasswordReset({
          email,
          redirectTo: `/${locale}/reset-password`,
        });
        if (result.error) setError(t("genericError"));
        else setNotice(t("resetSent"));
      } else if (mode === "reset") {
        const result = await authClient.resetPassword({
          newPassword: password,
          token,
        });
        if (result.error) setError(result.error.message ?? t("genericError"));
        else setNotice(t("passwordUpdated"));
      } else {
        const result = await authClient.signIn.email({ email, password });
        if (result.error) setError(result.error.message ?? t("genericError"));
        else if (
          result.data &&
          "twoFactorRedirect" in result.data &&
          result.data.twoFactorRedirect
        )
          setTwoFactor(true);
        else router.push(`/${locale}/dashboard`);
        router.refresh();
      }
    } catch {
      setError(t("genericError"));
    } finally {
      setPending(false);
    }
  }
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void submit(new FormData(event.currentTarget));
      }}
      className="form-stack"
    >
      {mode === "register" && (
        <label>
          {t("name")}
          <input name="name" required autoComplete="name" maxLength={100} />
        </label>
      )}
      {!twoFactor && mode !== "reset" && (
        <label>
          {t("email")}
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            maxLength={254}
          />
        </label>
      )}
      {!twoFactor && mode !== "forgot" && (
        <label>
          {t(mode === "reset" ? "newPassword" : "password")}
          <input
            aria-label={t(mode === "reset" ? "newPassword" : "password")}
            name="password"
            type="password"
            required
            minLength={mode === "login" ? 1 : 12}
            maxLength={128}
            autoComplete={
              mode === "login" ? "current-password" : "new-password"
            }
          />
          {mode === "register" && <small>{t("passwordHint")}</small>}
        </label>
      )}
      {twoFactor && (
        <>
          <label>
            {t(backupMode ? "backupCode" : "code")}
            <input
              name="code"
              required
              inputMode={backupMode ? "text" : "numeric"}
              pattern={backupMode ? undefined : "[0-9]{6}"}
              maxLength={backupMode ? 100 : 6}
              key={backupMode ? "backup" : "totp"}
              autoComplete="one-time-code"
            />
          </label>
          <button
            type="button"
            className="text-link"
            onClick={() => {
              setBackupMode(!backupMode);
              setError("");
            }}
          >
            {t(backupMode ? "useAuthenticator" : "useBackupCode")}
          </button>
        </>
      )}
      {mode === "login" && (
        <Link
          className="text-link align-right"
          href={`/${locale}/forgot-password`}
        >
          {t("forgot")}
        </Link>
      )}
      {error && (
        <p className="notice notice-error" role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p className="notice notice-success" role="status">
          {notice}
        </p>
      )}
      <Button disabled={pending}>
        {pending
          ? t("working")
          : t(
              twoFactor
                ? "verify"
                : mode === "forgot"
                  ? "sendReset"
                  : mode === "reset"
                    ? "save"
                    : mode,
            )}
      </Button>
      <p className="muted text-center">
        {t(mode === "register" ? "haveAccount" : "noAccount")}{" "}
        <Link
          className="text-link"
          href={`/${locale}/${mode === "register" ? "login" : "register"}`}
        >
          {t(mode === "register" ? "login" : "register")}
        </Link>
      </p>
    </form>
  );
}
