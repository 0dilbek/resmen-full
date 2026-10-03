import { QrCode, Smartphone, LayoutList, ShoppingBag } from "lucide-react";
import { FoodObject } from "./food-object";
import { getTranslations } from "next-intl/server";
import "./visuals.css";
export async function ProductVisuals() {
  const t = await getTranslations();
  const steps = [QrCode, Smartphone, LayoutList, ShoppingBag];
  const types = ["cup", "burger", "plate", "croissant", "cake"] as const;
  return (
    <>
      <section className="visual-flow">
        <p className="eyebrow">01 — 04</p>
        <h2>{t("visualHowTitle")}</h2>
        <div className="visual-steps">
          {steps.map((Icon, i) => (
            <div className="visual-step" key={i}>
              <Icon size={56} aria-hidden />
              <span>0{i + 1}</span>
              <h3>
                {t(
                  ["visualScan", "visualBrowse", "visualChoose", "visualOrder"][
                    i
                  ],
                )}
              </h3>
            </div>
          ))}
        </div>
      </section>
      <section className="restaurant-types">
        <h2>{t("visualTypesTitle")}</h2>
        <div className="visual-types">
          {types.map((kind, i) => (
            <div className="visual-type" key={i}>
              <FoodObject kind={kind} />
              <h3>
                {t(
                  [
                    "visualCafe",
                    "visualFastfood",
                    "visualRestaurant",
                    "visualBakery",
                    "visualDessert",
                  ][i],
                )}
              </h3>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
