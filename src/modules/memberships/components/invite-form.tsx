"use client";
import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { inviteMember } from "../actions";
import { Button } from "@/components/ui/button";
export function InviteForm({
  restaurantId,
  branches,
  owner,
}: {
  restaurantId: string;
  branches: { id: string; name: string }[];
  owner: boolean;
}) {
  const t = useTranslations();
  const locale = useLocale();
  const [role, setRole] = useState("CASHIER");
  const [link, setLink] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  return (
    <form
      className="form-stack"
      action={async (form) => {
        setPending(true);
        setError("");
        try {
          const result = await inviteMember(restaurantId, {
            email: form.get("email"),
            role,
            branchIds: form.getAll("branchIds"),
            allBranches: role === "ADMIN",
          });
          if (result.ok && result.data)
            setLink(
              `${window.location.origin}/${locale}/invite/${result.data.token}`,
            );
          else if (!result.ok) setError(t(result.error));
        } catch {
          setError(t("genericError"));
        } finally {
          setPending(false);
        }
      }}
    >
      <label>
        {t("email")}
        <input type="email" name="email" required />
      </label>
      <label>
        {t("role")}
        <select value={role} onChange={(e) => setRole(e.target.value)}>
          <option value="CASHIER">{t("cashier")}</option>
          <option value="MANAGER">{t("manager")}</option>
          {owner && <option value="ADMIN">{t("admin")}</option>}
        </select>
      </label>
      {role !== "ADMIN" && (
        <fieldset>
          <legend>{t("branches")}</legend>
          {branches.map((b) => (
            <label key={b.id} className="checkbox-label">
              <input type="checkbox" name="branchIds" value={b.id} />
              {b.name}
            </label>
          ))}
        </fieldset>
      )}
      {error && (
        <p className="notice notice-error" role="alert">
          {error}
        </p>
      )}
      {link && (
        <div className="notice notice-success">
          <p>{t("inviteNote")}</p>
          <input
            aria-label={t("invitation")}
            value={link}
            readOnly
            onFocus={(e) => e.target.select()}
          />
        </div>
      )}
      <Button disabled={pending}>{t(pending ? "working" : "invite")}</Button>
    </form>
  );
}
