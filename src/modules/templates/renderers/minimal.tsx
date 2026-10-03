import type { MenuData } from "@/modules/menus/contract";
import {
  CategoryNav,
  MenuSections,
  MenuFooter,
} from "@/modules/menus/components/default-menu";
import { MenuInteraction } from "@/modules/menus/components/interaction";
import { templateDefinition } from "../registry";
import { TemplateIntro, type IntroComposition } from "./intro";
import { CategoryIndex, Featured } from "./shared";
const compositions: readonly IntroComposition[] = [
  "compact",
  "statement",
  "collage",
  "ticket",
  "split",
];
const indexVariants: number[] = [2, 5];
const featuredVariants: number[] = [4];
const mediaVariants: number[] = [];
export default async function Minimal({ data }: { data: MenuData }) {
  const variant = templateDefinition(data.theme.config.templateId).variant;
  const indexed = indexVariants.includes(variant);
  return (
    <div className="menu-container">
      <TemplateIntro data={data} composition={compositions[variant - 1]} />
      {!indexed && <CategoryNav data={data} />}
      <MenuInteraction data={data}>
        <div className={indexed ? "edition-indexed" : "edition-flow"}>
          {indexed && <CategoryIndex data={data} />}
          <div className="edition-content">
            {featuredVariants.includes(variant) && <Featured data={data} />}
            <MenuSections
              data={data}
              headingMedia={mediaVariants.includes(variant)}
            />
          </div>
        </div>
      </MenuInteraction>
      <MenuFooter data={data} />
    </div>
  );
}
