import { Scene3D } from "@/components/visuals/scene-3d";
import Image from "next/image";
import { getTranslations } from "next-intl/server";
import type { MenuData } from "@/modules/menus/contract";
import {
  MenuTopline,
  MenuIdentity,
  MenuSections,
  MenuFooter,
} from "@/modules/menus/components/default-menu";
import { MenuInteraction } from "@/modules/menus/components/interaction";
import { CategoryIndex, Cover } from "../renderers/shared";
import { premiumDefinition } from "./catalog";

export async function CollectionNavigation({ data }: { data: MenuData }) {
  const t = await getTranslations({ locale: data.locale });
  const definition = premiumDefinition(data.theme.config.templateId)!;
  return (
    <nav
      className={`collection-nav nav-${definition.composition}`}
      aria-label={t("categories")}
    >
      {data.categories
        .filter((c) => c.productIds.length)
        .map((c, i) => {
          const photo = data.products.find(
            (p) => p.categoryId === c.id && p.images.length,
          )?.images[0];
          return (
            <a href={`#category-${c.id}`} key={c.id}>
              {["stories", "rails"].includes(definition.composition) && (
                <span className="nav-art">
                  {photo ? (
                    <Image
                      src={photo.url}
                      alt=""
                      width={80}
                      height={80}
                      unoptimized
                    />
                  ) : (
                    <span aria-hidden="true">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                  )}
                </span>
              )}
              <small aria-hidden="true">{String(i + 1).padStart(2, "0")}</small>
              <span>{c.name}</span>
            </a>
          );
        })}
    </nav>
  );
}
export async function PremiumHero({ data }: { data: MenuData }) {
  const def = premiumDefinition(data.theme.config.templateId)!;
  const hero = data.theme.config.design?.hero ?? "template";
  const photos = data.products.filter((p) => p.images.length).slice(0, 3);
  const hasMedia =
    hero !== "minimal" &&
    (data.theme.config.coverMediaId ||
      photos.length ||
      (def.supports3D && (data.theme.config.design?.show3D || hero === "3d")));
  return (
    <header className={`premium-hero hero-${hero}`}>
      <MenuTopline data={data} />
      <div className="premium-hero-stage">
        <MenuIdentity data={data} />
        {hasMedia && (
          <div className="premium-hero-art" aria-hidden="true">
            {def.composition === "paper" && hero === "template" ? (
              photos.map((p, i) => (
                <figure key={p.id}>
                  <Image
                    src={p.images[0].url}
                    alt=""
                    width={480}
                    height={480}
                    unoptimized
                    loading={i === 0 ? "eager" : "lazy"}
                  />
                  <figcaption>{p.name}</figcaption>
                </figure>
              ))
            ) : def.supports3D &&
              (data.theme.config.design?.show3D || hero === "3d") ? (
              <Scene3D
                variant="plate"
                enabled={data.theme.config.design?.animation !== "off"}
              >
                <Cover data={data} />
              </Scene3D>
            ) : (
              <Cover data={data} />
            )}
          </div>
        )}
        {def.composition === "heritage" &&
          data.theme.config.ornamentalBorderStyle !== "none" &&
          data.theme.config.patternPlacement !== "none" && (
            <div className="heritage-corner" aria-hidden="true" />
          )}
      </div>
    </header>
  );
}
export default async function PremiumMenu({ data }: { data: MenuData }) {
  const definition = premiumDefinition(data.theme.config.templateId)!;
  const indexed = ["folio", "journey"].includes(definition.composition);
  return (
    <div className={`premium-container composition-${definition.composition}`}>
      <PremiumHero data={data} />
      {!indexed && <CollectionNavigation data={data} />}
      <MenuInteraction data={data}>
        <div className={indexed ? "premium-indexed" : "premium-flow"}>
          {indexed && <CategoryIndex data={data} />}
          <MenuSections
            data={data}
            headingMedia={definition.composition === "cinema"}
          />
        </div>
      </MenuInteraction>
      <MenuFooter data={data} />
    </div>
  );
}
