import { z } from "zod";
export const fonts = {
  system: "Arial, Helvetica, sans-serif",
  editorial: "Georgia, 'Times New Roman', serif",
  mono: "'Courier New', monospace",
} as const;
const color = z.string().regex(/^#[0-9a-fA-F]{6}$/);
export const designSettingsSchema = z
  .object({
    version: z.literal(1).default(1),
    secondaryColor: color.optional(),
    accentColor: color.optional(),
    backgroundColor: color.optional(),
    textColor: color.optional(),
    headingFont: z.enum(["system", "editorial", "mono"]).optional(),
    bodyFont: z.enum(["system", "editorial", "mono"]).optional(),
    fontScale: z.enum(["small", "standard", "large"]).optional(),
    shadow: z.enum(["none", "soft", "lifted", "offset"]).optional(),
    border: z.enum(["none", "thin", "bold", "double"]).optional(),
    imageStyle: z
      .enum(["square", "portrait", "landscape", "circle", "organic"])
      .optional(),
    animation: z.enum(["off", "subtle", "medium", "expressive"]).optional(),
    hero: z
      .enum(["template", "minimal", "image", "video-ready", "immersive", "3d"])
      .optional(),
    show3D: z.boolean().optional(),
  })
  .strict();
export type DesignSettings = z.infer<typeof designSettingsSchema>;
export const defaultDesign = {
  version: 1,
  headingFont: "editorial",
  bodyFont: "system",
  fontScale: "standard",
  shadow: "soft",
  border: "thin",
  imageStyle: "landscape",
  animation: "subtle",
  hero: "template",
  show3D: false,
} as const satisfies DesignSettings;
