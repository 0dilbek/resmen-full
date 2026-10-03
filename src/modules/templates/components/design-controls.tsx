"use client";
import { useTranslations } from "next-intl";
import { type ThemeConfig } from "../config";
import { defaultDesign, type DesignSettings } from "../design";
import { templateDefinition } from "../registry";
import { premiumDefinition } from "../premium/catalog";
type Props = {
  config: ThemeConfig;
  onChange: (next: ThemeConfig) => void;
  pending: boolean;
  upload: (file: File, key: "logoMediaId" | "coverMediaId") => void;
};
export function DesignControls({ config, onChange, pending, upload }: Props) {
  const t = useTranslations();
  const entry = templateDefinition(config.templateId);
  const preset = premiumDefinition(config.templateId);
  const d = {
    ...defaultDesign,
    headingFont:
      preset?.fonts ??
      (config.headingStyle === "serif" ? "editorial" : "system"),
    ...config.design,
  };
  function patch<K extends keyof DesignSettings>(
    key: K,
    value: DesignSettings[K],
  ) {
    onChange({
      ...config,
      design: { version: 1, ...config.design, [key]: value },
    });
  }
  function select<K extends keyof DesignSettings>(
    key: K,
    options: readonly string[],
  ) {
    return (
      <label key={key}>
        {t(String(`design_${key}`))}
        <select
          aria-label={t(String(`design_${key}`))}
          value={
            ["shadow", "border", "imageStyle"].includes(key) &&
            config.design?.[key] === undefined
              ? ""
              : String(d[key])
          }
          onChange={(e) =>
            patch(key, (e.target.value || undefined) as DesignSettings[K])
          }
        >
          {["shadow", "border", "imageStyle"].includes(key) && (
            <option value="">{t("option_template")}</option>
          )}
          {options.map((o) => (
            <option key={o} value={o}>
              {t(`option_${o}`)}
            </option>
          ))}
        </select>
      </label>
    );
  }
  const colors = {
    secondaryColor: d.secondaryColor ?? preset?.secondary ?? entry.primary,
    accentColor: d.accentColor ?? preset?.accent ?? entry.primary,
    backgroundColor: d.backgroundColor ?? entry.background,
    textColor: d.textColor ?? entry.foreground,
  };
  return (
    <aside className="design-controls">
      <h2>{t("customizeDesign")}</h2>
      <fieldset>
        <legend>{t("designColors")}</legend>
        <label>
          {t("primaryColor")}
          <input
            type="color"
            value={config.primaryColor}
            onChange={(e) =>
              onChange({ ...config, primaryColor: e.target.value })
            }
          />
        </label>
        {Object.entries(colors).map(([key, value]) => (
          <label key={key}>
            {t(String(`design_${key}`))}
            <input
              type="color"
              value={value}
              onChange={(e) =>
                patch(key as keyof typeof colors, e.target.value)
              }
            />
          </label>
        ))}
      </fieldset>
      <fieldset>
        <legend>{t("designTypography")}</legend>
        {select("headingFont", ["system", "editorial", "mono"])}
        {select("bodyFont", ["system", "editorial", "mono"])}
        {select("fontScale", ["small", "standard", "large"])}
      </fieldset>
      <fieldset>
        <legend>{t("designCards")}</legend>
        <label>
          {t("radius")}
          <select
            aria-label={t("radius")}
            value={config.radius}
            onChange={(e) =>
              onChange({
                ...config,
                radius: e.target.value as ThemeConfig["radius"],
              })
            }
          >
            {["none", "small", "soft"].map((o) => (
              <option key={o} value={o}>
                {t(`option_${o}`)}
              </option>
            ))}
          </select>
        </label>
        {select("shadow", ["none", "soft", "lifted", "offset"])}
        {select("border", ["none", "thin", "bold", "double"])}
        <label>
          {t("density")}
          <select
            aria-label={t("density")}
            value={config.density}
            onChange={(e) =>
              onChange({
                ...config,
                density: e.target.value as ThemeConfig["density"],
              })
            }
          >
            {["compact", "comfortable"].map((o) => (
              <option key={o} value={o}>
                {t(o)}
              </option>
            ))}
          </select>
        </label>
        {select("imageStyle", [
          "square",
          "portrait",
          "landscape",
          "circle",
          "organic",
        ])}
      </fieldset>
      <fieldset>
        <legend>{t("designMotion")}</legend>
        {select("animation", ["off", "subtle", "medium", "expressive"])}
        {preset &&
          select("hero", [
            "template",
            "minimal",
            "image",
            "video-ready",
            "immersive",
            ...(preset?.supports3D ? ["3d"] : []),
          ])}
        {d.hero === "video-ready" && (
          <p className="muted">{t("videoReadyHint")}</p>
        )}
        {preset?.supports3D && (
          <label className="check-label">
            <input
              type="checkbox"
              checked={d.show3D}
              onChange={(e) => patch("show3D", e.target.checked)}
            />
            {t("enable3D")}
          </label>
        )}
      </fieldset>
      {entry.family === "uzbek" && (
        <fieldset>
          <legend>{t("ornament")}</legend>
          <select
            aria-label={t("ornament")}
            value={config.ornamentalBorderStyle}
            onChange={(e) =>
              onChange({
                ...config,
                ornamentalBorderStyle: e.target
                  .value as ThemeConfig["ornamentalBorderStyle"],
              })
            }
          >
            {["none", "geometric", "floral"].map((v) => (
              <option key={v} value={v}>
                {t(v)}
              </option>
            ))}
          </select>
          <label>
            {t("motifOpacity")}
            <input
              type="range"
              min={0}
              max={0.08}
              step={0.01}
              value={config.motifOverlayOpacity}
              onChange={(e) =>
                onChange({
                  ...config,
                  motifOverlayOpacity: Number(e.target.value),
                })
              }
            />
          </label>
          <label>
            {t("patternScale")}
            <input
              type="range"
              min={0.5}
              max={2}
              step={0.1}
              value={config.patternScale}
              onChange={(e) =>
                onChange({ ...config, patternScale: Number(e.target.value) })
              }
            />
          </label>
          <label>
            {t("patternPlacement")}
            <select
              value={config.patternPlacement}
              onChange={(e) =>
                onChange({
                  ...config,
                  patternPlacement: e.target
                    .value as ThemeConfig["patternPlacement"],
                })
              }
            >
              {["hero", "corners", "none"].map((v) => (
                <option key={v} value={v}>
                  {t(v)}
                </option>
              ))}
            </select>
          </label>
        </fieldset>
      )}
      <fieldset>
        <legend>{t("designImages")}</legend>
        {(["logoMediaId", "coverMediaId"] as const).map((key) => (
          <div key={key}>
            <label>
              {t(key)}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                disabled={pending}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) upload(file, key);
                }}
              />
            </label>
            {config[key] && (
              <button
                type="button"
                className="button button-outline"
                onClick={() => onChange({ ...config, [key]: null })}
              >
                {t("remove")} · {t(key)}
              </button>
            )}
          </div>
        ))}
      </fieldset>
    </aside>
  );
}
