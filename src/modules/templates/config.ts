import { z } from "zod";
import { designSettingsSchema } from "./design";
import { templateIds, templateDefinition, type TemplateId } from "./registry";
export function contrast(a: string, b: string) {
  function luminance(hex: string) {
    const values = [1, 3, 5]
      .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
      .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
    return values[0] * 0.2126 + values[1] * 0.7152 + values[2] * 0.0722;
  }
  const l1 = luminance(a),
    l2 = luminance(b);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}
export const themeConfigSchema = z
  .object({
    schemaVersion: z.literal(1),
    design: designSettingsSchema.optional(),
    templateId: z.enum(templateIds),
    primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    font: z.enum(["system", "editorial"]),
    radius: z.enum(["none", "small", "soft"]),
    density: z.enum(["comfortable", "compact"]),
    imageRatio: z.enum(["square", "landscape", "portrait"]),
    ornamentalBorderStyle: z.enum(["none", "geometric", "floral"]),
    decorativeDividerStyle: z.enum(["line", "diamond", "none"]),
    motifOverlayOpacity: z.number().min(0).max(0.08),
    patternScale: z.number().min(0.5).max(2),
    patternPlacement: z.enum(["hero", "corners", "none"]),
    headingStyle: z.enum(["plain", "serif"]),
    heroFrameStyle: z.enum(["none", "arch", "rectangle"]),
    categoryHeaderStyle: z.enum(["plain", "numbered", "ornament"]),
    logoMediaId: z.uuid().nullable(),
    coverMediaId: z.uuid().nullable(),
  })
  .strict()
  .superRefine((v, ctx) => {
    const definition = templateDefinition(v.templateId);
    const background = v.design?.backgroundColor ?? definition.background;
    const foreground = v.design?.textColor ?? definition.foreground;
    if (contrast(foreground, background) < 4.5)
      ctx.addIssue({
        code: "custom",
        path: ["design", "textColor"],
        message: "Text needs 4.5:1 contrast",
      });
    if (contrast(v.primaryColor, background) < 4.5)
      ctx.addIssue({
        code: "custom",
        path: ["primaryColor"],
        message: "Brand color needs 4.5:1 text contrast",
      });
    if (
      definition.family !== "uzbek" &&
      (v.ornamentalBorderStyle !== "none" || v.patternPlacement !== "none")
    )
      ctx.addIssue({
        code: "custom",
        path: ["ornamentalBorderStyle"],
        message: "Ornaments belong to the Uzbek family",
      });
  });
export type ThemeConfig = z.infer<typeof themeConfigSchema>;
export function defaultTheme(
  templateId: TemplateId = "minimal-01",
): ThemeConfig {
  const entry = templateDefinition(templateId);
  return {
    schemaVersion: 1,
    templateId,
    primaryColor: entry.primary,
    font: "system",
    radius: entry.radius ?? "small",
    density: "comfortable",
    imageRatio: "landscape",
    ornamentalBorderStyle:
      entry.layout === "suzani"
        ? "floral"
        : entry.family === "uzbek" && entry.variant !== 5
          ? "geometric"
          : "none",
    decorativeDividerStyle: entry.family === "uzbek" ? "diamond" : "line",
    motifOverlayOpacity: 0.05,
    patternScale: 1,
    patternPlacement:
      entry.family === "uzbek" && entry.variant !== 5 ? "hero" : "none",
    headingStyle: entry.family === "fastfood" ? "plain" : "serif",
    heroFrameStyle:
      entry.family === "uzbek" && entry.variant === 1 ? "arch" : "none",
    categoryHeaderStyle: entry.family === "uzbek" ? "ornament" : "numbered",
    logoMediaId: null,
    coverMediaId: null,
  };
}
