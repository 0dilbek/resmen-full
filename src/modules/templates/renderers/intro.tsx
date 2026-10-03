import Image from "next/image";
import type { MenuData } from "@/modules/menus/contract";
import {
  MenuIdentity,
  MenuTopline,
} from "@/modules/menus/components/default-menu";
import { Cover } from "./shared";

export type IntroComposition =
  | "compact"
  | "statement"
  | "split"
  | "banner"
  | "window"
  | "framed"
  | "collage"
  | "ticket";
/** Presentation only: the same identity, locale links and approved menu images. */
export function TemplateIntro({
  data,
  composition,
}: {
  data: MenuData;
  composition: IntroComposition;
}) {
  const photos = data.products.filter((p) => p.images.length).slice(0, 3);
  return (
    <header
      className={`template-intro intro-${composition}`}
      data-composition={composition}
    >
      <MenuTopline data={data} />
      <div className="intro-composition">
        <MenuIdentity data={data} />
        {["split", "banner", "window"].includes(composition) && (
          <div className="intro-art">
            <Cover data={data} />
          </div>
        )}
        {composition === "collage" && (
          <div className="intro-collage" aria-hidden="true">
            {photos.length ? (
              photos.map((p) => (
                <Image
                  key={p.id}
                  src={p.images[0].url}
                  alt=""
                  width={400}
                  height={400}
                  unoptimized
                  loading="eager"
                />
              ))
            ) : (
              <Cover data={data} />
            )}
          </div>
        )}
        {composition === "framed" && (
          <div className="cultural-motif" aria-hidden="true" />
        )}
      </div>
    </header>
  );
}
