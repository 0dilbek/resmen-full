"use client";
import Image from "next/image";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Upload, ImagePlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { locales, type Locale } from "@/i18n/config";
import { productSchema, allergenCodes, type ProductInput } from "../validation";
import { saveProduct } from "../actions";
const emptyText = { name: "", description: "", ingredients: "" };
export function ProductForm({
  restaurantId,
  menuId,
  branchId,
  categories,
  groups,
  initial,
  currency,
  defaultLocale,
}: {
  restaurantId: string;
  menuId: string;
  branchId: string;
  categories: { id: string; names: Record<Locale, string> }[];
  groups: { id: string; names: Record<Locale, string> }[];
  initial?: ProductInput;
  currency: string;
  defaultLocale: Locale;
}) {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const [language, setLanguage] = useState<Locale>(defaultLocale);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const form = useForm<ProductInput>({
    resolver: zodResolver(productSchema),
    defaultValues: initial ?? {
      menuId,
      categoryId: categories[0]?.id ?? "",
      price: "",
      available: true,
      published: false,
      featured: false,
      sortOrder: 0,
      allergens: [],
      translations: {
        uz: { ...emptyText },
        ru: { ...emptyText },
        en: { ...emptyText },
      },
      mediaIds: [],
      modifierGroupIds: [],
    },
  });
  const images = useWatch({ control: form.control, name: "mediaIds" });
  async function upload(file: File) {
    setUploading(true);
    setError("");
    try {
      const data = new FormData();
      data.set("image", file);
      const response = await fetch(
        `/api/uploads?restaurantId=${restaurantId}&menuId=${menuId}`,
        { method: "POST", body: data },
      );
      const result = (await response.json()) as { id?: string; error?: string };
      if (!response.ok || !result.id) {
        setError(t(result.error ?? "genericError"));
        return;
      }
      form.setValue("mediaIds", [...form.getValues("mediaIds"), result.id], {
        shouldDirty: true,
      });
    } catch {
      setError(t("genericError"));
    } finally {
      setUploading(false);
    }
  }
  return (
    <form
      onSubmit={form.handleSubmit(async (data) => {
        setError("");
        try {
          const result = await saveProduct(restaurantId, data);
          if (!result.ok) setError(t(result.error));
          else {
            router.push(
              `/${locale}/dashboard/${restaurantId}/products?branch=${branchId}`,
            );
            router.refresh();
          }
        } catch {
          setError(t("genericError"));
        }
      })}
    >
      <div className="editor-layout">
        <div className="editor-main">
          <section className="panel">
            <div className="section-heading">
              <h2>{t("details")}</h2>
              <div
                className="locale-tabs"
                role="tablist"
                aria-label={t("translations")}
              >
                {locales.map((l) => (
                  <button
                    key={l}
                    type="button"
                    role="tab"
                    aria-selected={language === l}
                    onClick={() => setLanguage(l)}
                  >
                    {l.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
            <div className="form-stack">
              <label>
                {t("productName")} · {language.toUpperCase()}
                <input
                  key={`name-${language}`}
                  {...form.register(`translations.${language}.name`)}
                  maxLength={120}
                  required={language === defaultLocale}
                />
              </label>
              <label>
                {t("description")}
                <textarea
                  key={`desc-${language}`}
                  {...form.register(`translations.${language}.description`)}
                  maxLength={2000}
                />
              </label>
              <label>
                {t("ingredients")}
                <textarea
                  key={`ingredients-${language}`}
                  {...form.register(`translations.${language}.ingredients`)}
                  maxLength={1000}
                />
              </label>
            </div>
          </section>
          <section className="panel">
            <h2>{t("image")}</h2>
            <div className="image-editor">
              {images.map((id) => (
                <div key={id}>
                  <Image
                    src={`/api/media/${id}/320`}
                    alt={t("image")}
                    width={140}
                    height={110}
                    unoptimized
                  />
                  <button
                    type="button"
                    aria-label={t("remove")}
                    onClick={() =>
                      form.setValue(
                        "mediaIds",
                        images.filter((i) => i !== id),
                      )
                    }
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
              {images.length < 5 && (
                <label className="upload-card">
                  <ImagePlus size={25} />
                  <span>{t(uploading ? "working" : "uploadImage")}</span>
                  <input
                    className="sr-only"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    disabled={uploading}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) void upload(file);
                    }}
                  />
                </label>
              )}
            </div>
            <p className="muted">
              <small>{t("imageHint")}</small>
            </p>
          </section>
          <section className="panel">
            <h2>{t("allergens")}</h2>
            <div className="allergen-grid">
              {allergenCodes.map((code) => (
                <label key={code} className="checkbox-label">
                  <input
                    type="checkbox"
                    value={code}
                    {...form.register("allergens")}
                  />
                  {t(code)}
                </label>
              ))}
            </div>
          </section>
        </div>
        <aside className="editor-aside">
          <section className="panel form-stack">
            <h2>
              {t("price")} & {t("category")}
            </h2>
            <label>
              {t("price")} · {currency}
              <input
                inputMode="decimal"
                {...form.register("price")}
                placeholder="45000.00"
                aria-invalid={!!form.formState.errors.price}
              />
              {form.formState.errors.price && (
                <small className="field-error">{t("INVALID_INPUT")}</small>
              )}
            </label>
            <label>
              {t("category")}
              <select {...form.register("categoryId")}>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.names[locale as Locale] || c.names[defaultLocale]}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {t("sortOrder")}
              <input
                type="number"
                min={0}
                max={10000}
                {...form.register("sortOrder", { valueAsNumber: true })}
              />
            </label>
          </section>
          <section className="panel form-stack">
            <h2>{t("status")}</h2>
            {["available", "published", "featured"].map((key) => (
              <label className="checkbox-label" key={key}>
                <input
                  type="checkbox"
                  {...form.register(
                    key as "available" | "published" | "featured",
                  )}
                />
                {t(key)}
              </label>
            ))}
          </section>
          {groups.length > 0 && (
            <section className="panel">
              <h2>{t("modifiers")}</h2>
              {groups.map((g) => (
                <label className="checkbox-label" key={g.id}>
                  <input
                    type="checkbox"
                    value={g.id}
                    {...form.register("modifierGroupIds")}
                  />
                  {g.names[locale as Locale] || g.names[defaultLocale]}
                </label>
              ))}
            </section>
          )}
        </aside>
      </div>
      {(error || Object.keys(form.formState.errors).length > 0) && (
        <p className="notice notice-error" role="alert">
          {error || t("INVALID_INPUT")}
        </p>
      )}
      <div className="editor-actions">
        <Button disabled={form.formState.isSubmitting || uploading}>
          <Upload size={16} />
          {t(form.formState.isSubmitting ? "working" : "save")}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() =>
            router.push(
              `/${locale}/dashboard/${restaurantId}/products?branch=${branchId}`,
            )
          }
        >
          {t("cancel")}
        </Button>
      </div>
    </form>
  );
}
