"use client";
import { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";
import { modifierSchema } from "@/modules/products/validation";
import { saveModifier } from "../actions";
import { Button } from "@/components/ui/button";
import { locales, type Locale } from "@/i18n/config";
export function ModifierForm({
  restaurantId,
  menuId,
  defaultLocale,
  initial,
}: {
  restaurantId: string;
  menuId: string;
  defaultLocale: Locale;
  initial?: z.infer<typeof modifierSchema>;
}) {
  const t = useTranslations();
  const router = useRouter();
  const [language, setLanguage] = useState<Locale>(defaultLocale);
  const [message, setMessage] = useState("");
  const [ok, setOk] = useState(false);
  const form = useForm<z.infer<typeof modifierSchema>>({
    resolver: zodResolver(modifierSchema),
    defaultValues: initial ?? {
      menuId,
      names: { uz: "", ru: "", en: "" },
      minSelections: 0,
      maxSelections: 1,
      options: [
        { names: { uz: "", ru: "", en: "" }, price: "0", available: true },
      ],
    },
  });
  const options = useFieldArray({
    control: form.control,
    name: "options",
    keyName: "fieldId",
  });
  return (
    <form
      className="form-stack"
      onSubmit={form.handleSubmit(async (data) => {
        try {
          const result = await saveModifier(restaurantId, data);
          setOk(result.ok);
          setMessage(t(result.ok ? "saved" : result.error));
          if (result.ok) router.refresh();
        } catch {
          setOk(false);
          setMessage(t("genericError"));
        }
      })}
    >
      <div className="locale-tabs">
        {locales.map((l) => (
          <button
            type="button"
            key={l}
            aria-pressed={language === l}
            onClick={() => setLanguage(l)}
          >
            {l.toUpperCase()}
          </button>
        ))}
      </div>
      <label>
        {t("groupName")} · {language.toUpperCase()}
        <input
          key={language}
          {...form.register(`names.${language}`)}
          required={language === defaultLocale}
        />
      </label>
      <div className="form-grid">
        <label>
          {t("minSelections")}
          <input
            type="number"
            min={0}
            max={20}
            {...form.register("minSelections", { valueAsNumber: true })}
          />
        </label>
        <label>
          {t("maxSelections")}
          <input
            type="number"
            min={1}
            max={20}
            {...form.register("maxSelections", { valueAsNumber: true })}
          />
        </label>
      </div>
      <h3>{t("options")}</h3>
      {options.fields.map((option, i) => (
        <div className="modifier-option" key={option.fieldId}>
          <label>
            {t("optionName")}
            <input
              key={`${language}-${i}`}
              {...form.register(`options.${i}.names.${language}`)}
              required={language === defaultLocale}
            />
          </label>
          <label>
            {t("price")}
            <input
              {...form.register(`options.${i}.price`)}
              inputMode="decimal"
            />
          </label>
          <label className="checkbox-label">
            <input
              type="checkbox"
              {...form.register(`options.${i}.available`)}
            />
            {t("available")}
          </label>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={t("remove")}
            onClick={() => options.remove(i)}
          >
            <X size={16} />
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        disabled={options.fields.length >= 20}
        onClick={() =>
          options.append({
            names: { uz: "", ru: "", en: "" },
            price: "0",
            available: true,
          })
        }
      >
        <Plus size={15} />
        {t("addOption")}
      </Button>
      {Object.keys(form.formState.errors).length > 0 && (
        <p role="alert" className="notice notice-error">
          {t("INVALID_INPUT")}
        </p>
      )}
      {message && (
        <p
          className={`notice ${ok ? "notice-success" : "notice-error"}`}
          role={ok ? "status" : "alert"}
        >
          {message}
        </p>
      )}
      <div>
        <Button disabled={form.formState.isSubmitting}>
          {t(form.formState.isSubmitting ? "working" : "save")}
        </Button>
      </div>
    </form>
  );
}
