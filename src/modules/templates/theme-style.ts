import type { CSSProperties } from "react";
import { contrast, type ThemeConfig } from "./config";
import { templateDefinition } from "./registry";
import { fonts, defaultDesign } from "./design";
import { premiumDefinition } from "./premium/catalog";
export function themeStyle(config: ThemeConfig): CSSProperties {
  const entry = templateDefinition(config.templateId);
  const preset = premiumDefinition(config.templateId);
  const d = config.design;
  const background = d?.backgroundColor ?? entry.background;
  const foreground = d?.textColor ?? entry.foreground;
  return {
    "--menu-bg": background,
    "--menu-fg": foreground,
    "--menu-muted":
      d?.textColor || d?.backgroundColor ? foreground : entry.muted,
    "--menu-line": d?.textColor || d?.backgroundColor ? foreground : entry.line,
    "--menu-primary": config.primaryColor,
    "--menu-on-primary":
      contrast(config.primaryColor, "#ffffff") >= 4.5 ? "#ffffff" : "#111111",
    "--menu-secondary": d?.secondaryColor ?? preset?.secondary ?? entry.primary,
    "--menu-accent": d?.accentColor ?? preset?.accent ?? entry.primary,
    "--menu-radius": { none: "0px", small: "6px", soft: "20px" }[config.radius],
    "--motif-opacity": config.motifOverlayOpacity,
    "--pattern-size": `${48 * config.patternScale}px`,
    "--heading-font":
      fonts[
        d?.headingFont ??
          preset?.fonts ??
          (config.headingStyle === "serif" ? "editorial" : "system")
      ],
    "--body-font": fonts[d?.bodyFont ?? "system"],
    "--type-scale": { small: 0.9, standard: 1, large: 1.15 }[
      d?.fontScale ?? "standard"
    ],
    "--card-shadow": {
      none: "none",
      soft: "0 8px 24px #0000000c",
      lifted: "0 20px 40px #00000024",
      offset: "6px 6px 0 var(--menu-secondary)",
    }[d?.shadow ?? defaultDesign.shadow],
    "--card-border": { none: "0px", thin: "1px", bold: "3px", double: "4px" }[
      d?.border ?? "thin"
    ],
    "--motion-curve": {
      subtle: "ease-out",
      smooth: "ease-in-out",
      playful: "cubic-bezier(.2,.8,.3,1.1)",
      cinematic: "cubic-bezier(.2,.6,.3,1)",
    }[preset?.motion ?? "subtle"],
    "--motion-time": {
      off: "0ms",
      subtle: "180ms",
      medium: "280ms",
      expressive: "420ms",
    }[d?.animation ?? "subtle"],
  } as CSSProperties;
}
