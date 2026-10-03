"use client";
import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { createRestaurant } from "../actions";
export function CreateRestaurantForm() {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  return (
    <form
      className="form-stack"
      action={async (form) => {
        setPending(true);
        try {
          const result = await createRestaurant({
            name: form.get("name"),
            slug: form.get("slug"),
          });
          if (result.ok && result.data) {
            router.push(`/${locale}/dashboard/${result.data.id}`);
            router.refresh();
          } else if (!result.ok) setError(t(result.error));
        } catch {
          setError(t("genericError"));
        } finally {
          setPending(false);
        }
      }}
    >
      <label>
        {t("restaurantName")}
        <input
          name="name"
          required
          minLength={2}
          maxLength={100}
          placeholder="Navro‘z"
        />
      </label>
      <label>
        {t("slug")}
        <div className="input-prefix">
          <span>/r/</span>
          <input
            name="slug"
            required
            minLength={3}
            maxLength={50}
            pattern="[a-z0-9]+(-[a-z0-9]+)*"
            placeholder="navroz"
          />
        </div>
      </label>
      {error && (
        <p className="notice notice-error" role="alert">
          {error}
        </p>
      )}
      <Button disabled={pending}>
        {t(pending ? "working" : "newRestaurant")}
      </Button>
    </form>
  );
}
