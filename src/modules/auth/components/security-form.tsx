"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { authClient } from "../client";
import { Button } from "@/components/ui/button";
export function SecurityForm({ enabled }: { enabled: boolean }) {
  const t = useTranslations();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [uri, setUri] = useState("");
  const [backup, setBackup] = useState<string[]>([]);
  const [verified, setVerified] = useState(enabled);
  return (
    <div className="form-stack">
      <h2>{t("twoFactor")}</h2>
      {verified ? (
        <p className="notice notice-success">{t("active")}</p>
      ) : (
        <form
          className="form-stack"
          action={async (form) => {
            setPending(true);
            setError("");
            try {
              if (uri) {
                const result = await authClient.twoFactor.verifyTotp({
                  code: String(form.get("code")),
                });
                if (result.error)
                  setError(result.error.message ?? t("genericError"));
                else setVerified(true);
              } else {
                const result = await authClient.twoFactor.enable({
                  password: String(form.get("password")),
                });
                if (result.error)
                  setError(result.error.message ?? t("genericError"));
                else if (result.data?.method === "totp") {
                  setUri(result.data.totpURI);
                  setBackup(result.data.backupCodes);
                }
              }
            } catch {
              setError(t("genericError"));
            } finally {
              setPending(false);
            }
          }}
        >
          {uri ? (
            <>
              <label>
                {t("twoFactor")}
                <textarea
                  readOnly
                  value={uri}
                  onFocus={(e) => e.target.select()}
                />
              </label>
              <label>
                {t("code")}
                <input
                  name="code"
                  required
                  pattern="[0-9]{6}"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                />
              </label>
            </>
          ) : (
            <label>
              {t("password")}
              <input
                name="password"
                required
                type="password"
                autoComplete="current-password"
              />
            </label>
          )}
          <Button disabled={pending}>
            {t(pending ? "working" : "continue")}
          </Button>
        </form>
      )}
      {backup.length > 0 && (
        <pre className="backup-codes" aria-label={t("backupCodes")}>
          {backup.join("\n")}
        </pre>
      )}
      {error && (
        <p className="notice notice-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
