"use client";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { templates, previewVersion, type TemplateId } from "../registry";
import { designCategories, premiumDefinition } from "../premium/catalog";
export function TemplateGallery({
  selected,
  preview,
  onSelect,
  onPreview,
  statuses,
}: {
  selected: TemplateId;
  preview: string;
  onSelect: (id: TemplateId) => void;
  onPreview: (id: TemplateId) => void;
  statuses: { id: TemplateId; status: string }[];
}) {
  const t = useTranslations();
  const [category, setCategory] = useState("all");
  const list = templates.filter((d) =>
    category === "legacy"
      ? !d.premium
      : category === "all"
        ? !!d.premium
        : premiumDefinition(d.id)?.category === category,
  );
  return (
    <section className="studio-gallery">
      <nav className="category-pills" aria-label={t("templateCategories")}>
        {["all", ...designCategories, "legacy"].map((c) => (
          <button
            type="button"
            key={c}
            aria-pressed={category === c}
            onClick={() => setCategory(c)}
          >
            {t(c === "all" ? "all" : `designCategory_${c}`)}
          </button>
        ))}
      </nav>
      <div className="studio-template-grid">
        {list.map((d) => {
          const status =
            statuses.find((s) => s.id === d.id)?.status ?? "ACTIVE";
          const preset = premiumDefinition(d.id);
          return (
            <article
              className={`studio-template-card ${selected === d.id ? "selected" : ""}`}
              key={d.id}
            >
              <div
                className="studio-template-shot"
                style={{ background: d.background }}
              >
                <Image
                  src={`/template-previews/${d.id}/${previewVersion(d)}/mobile.png`}
                  alt={d.name}
                  width={390}
                  height={650}
                  sizes="(max-width:700px) 45vw, 260px"
                />
              </div>
              <div className="studio-template-copy">
                <small>
                  {t(
                    preset
                      ? `designCategory_${preset.category}`
                      : `family_${d.family}`,
                  )}
                </small>
                <h3>{d.name}</h3>
                <p>
                  {t(
                    preset
                      ? `designDescription_${d.id}`
                      : "legacyDesignDescription",
                  )}
                </p>
                <div className="studio-template-actions">
                  <Link
                    href={`${preview}?template=${d.id}`}
                    onClick={(e) => {
                      e.preventDefault();
                      onPreview(d.id);
                    }}
                    aria-label={`${t("preview")} · ${d.name}`}
                  >
                    {t("preview")} ↗
                  </Link>
                  <button
                    type="button"
                    disabled={status !== "ACTIVE"}
                    aria-pressed={selected === d.id}
                    onClick={() => onSelect(d.id)}
                  >
                    {t(selected === d.id ? "selectedDesign" : "useTemplate")}
                  </button>
                </div>
                {status !== "ACTIVE" && (
                  <span className="badge">{t(status.toLowerCase())}</span>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
