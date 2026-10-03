import { describe, it, expect } from "vitest";
import { defaultTheme, themeConfigSchema, contrast } from "./config";
import { templates } from "./registry";
describe("safe theme contract", () => {
  it("validates every shipped default and text contrast", () => {
    for (const template of templates) {
      expect(
        themeConfigSchema.safeParse(defaultTheme(template.id)).success,
      ).toBe(true);
      expect(
        contrast(template.primary, template.background),
      ).toBeGreaterThanOrEqual(4.5);
    }
  });
  it("rejects arbitrary styles, script payloads, fonts and IDs", () => {
    const config = defaultTheme();
    for (const patch of [
      { css: "body{display:none}" },
      { primaryColor: "url(javascript:alert(1))" },
      { font: "https://evil.example/font" },
      { templateId: "../../secret" },
      { motifOverlayOpacity: 0.9 },
      { primaryColor: "#ffffff" },
    ])
      expect(themeConfigSchema.safeParse({ ...config, ...patch }).success).toBe(
        false,
      );
  });
  it("confines cultural decoration to supported renderers", () => {
    expect(
      themeConfigSchema.safeParse({
        ...defaultTheme(),
        patternPlacement: "hero",
      }).success,
    ).toBe(false);
    expect(
      themeConfigSchema.safeParse(defaultTheme("uzbek-modern-01")).success,
    ).toBe(true);
  });
});

import { previewConfigInput } from "./preview-input";
import { defaultDesign } from "./design";
import { demoMenu } from "@/modules/menus/demo";
describe("premium preview boundary", () => {
  it("keeps version-1 revisions compatible without a design object", () => {
    const old = defaultTheme("uzbek-premium-01");
    expect(themeConfigSchema.parse(old)).toEqual(old);
  });
  it("rejects nested CSS, remote fonts, unsupported fields and low-contrast text", () => {
    for (const design of [
      { ...defaultDesign, css: "*{display:none}" },
      { ...defaultDesign, headingFont: "https://evil.example/font.woff2" },
      { ...defaultDesign, textColor: "#ffffff", backgroundColor: "#ffffff" },
      { ...defaultDesign, accentColor: "url(javascript:alert(1))" },
      { ...defaultDesign, animation: "infinite" },
    ])
      expect(
        themeConfigSchema.safeParse({
          ...defaultTheme("editorial-magazine"),
          design,
        }).success,
      ).toBe(false);
  });
  it("bounds and validates serialized preview configurations before rendering", () => {
    for (const raw of [
      "{",
      "x".repeat(6001),
      JSON.stringify({ templateId: "terminal" }),
      JSON.stringify({ ...defaultTheme(), logoMediaId: "../../secret" }),
    ])
      expect(previewConfigInput.safeParse(raw).success).toBe(false);
    const config = { ...defaultTheme("dynamic-brand"), design: defaultDesign };
    expect(previewConfigInput.parse(JSON.stringify(config))).toEqual(config);
  });
  it("projects translated demo content through the same strict DTO for all designs", () => {
    for (const locale of ["uz", "ru", "en"] as const)
      for (const template of templates) {
        const data = demoMenu(locale, template.id);
        expect(data.categories).toHaveLength(9);
        expect(data.products).toHaveLength(18);
        expect(
          data.products.every(
            (p) =>
              p.ingredients && p.images.length && /^\d+$/.test(p.priceMinor),
          ),
        ).toBe(true);
      }
  });
});

it("keeps customization sparse so editing a color preserves unrelated renderer defaults", () => {
  const config = themeConfigSchema.parse({
    ...defaultTheme("editorial-magazine"),
    design: { version: 1, accentColor: "#aa5533" },
  });
  expect(config.design).toEqual({ version: 1, accentColor: "#aa5533" });
});
