import { MotionSurface } from "@/components/visuals/motion-surface";
import { themeStyle } from "./theme-style";
import { premiumDefinition } from "./premium/catalog";
import "./premium/styles.css";
import type { MenuData } from "@/modules/menus/contract";
import { templateDefinition } from "./registry";

const renderers = {
  minimal: () => import("./renderers/minimal"),
  luxury: () => import("./renderers/luxury"),
  fastfood: () => import("./renderers/fastfood"),
  coffee: () => import("./renderers/coffee"),
  asian: () => import("./renderers/asian"),
  uzbek: () => import("./renderers/uzbek"),
};
export async function TemplateRenderer({ data }: { data: MenuData }) {
  const config = data.theme.config;
  const entry = templateDefinition(config.templateId);
  const { default: Renderer } = entry.premium
    ? await import("./premium/renderer")
    : await renderers[entry.family]();
  const style = themeStyle(config);
  const design = config.design;
  const preset = premiumDefinition(config.templateId);
  return (
    <main
      className={`public-menu ${entry.premium ? `premium-menu design-${entry.id}` : "edition-2"} template-${entry.family} variant-${entry.variant} layout-${entry.layout} density-${config.density} ratio-${config.imageRatio} font-${config.font} border-${config.ornamentalBorderStyle} pattern-${config.patternPlacement} frame-${config.heroFrameStyle} category-${config.categoryHeaderStyle}`}
      style={style}
      data-template={entry.id}
      data-motion={design?.animation ?? "subtle"}
      data-motion-preset={preset?.motion ?? "subtle"}
      data-image-style={design?.imageStyle}
      data-border={design?.border}
      data-shadow={design?.shadow}
      data-customized={design ? "true" : undefined}
    >
      <MotionSurface
        enabled={design?.animation !== "off"}
        depth={!!preset?.supports3D && !!design?.show3D}
      >
        <Renderer data={data} />
      </MotionSurface>
    </main>
  );
}
