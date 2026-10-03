import { getTranslations } from "next-intl/server";
import { workspace } from "@/modules/restaurants/queries";
import { updateProfile } from "@/modules/restaurants/actions";
import { ActionForm } from "@/components/ui/action-form";
export default async function Page({
  params,
}: {
  params: Promise<{ restaurantId: string }>;
}) {
  const { restaurantId } = await params;
  const w = await workspace(restaurantId, "restaurant:update");
  const t = await getTranslations();
  async function save(form: FormData) {
    "use server";
    return updateProfile(restaurantId, {
      name: form.get("name"),
      description: form.get("description"),
      phone: form.get("phone"),
      address: form.get("address"),
      defaultLocale: form.get("defaultLocale"),
      enabledLocales: form.getAll("enabledLocales"),
      orderingEnabled: form.get("orderingEnabled") === "on",
    });
  }
  return (
    <>
      <div className="page-title">
        <div>
          <h1>{t("settings")}</h1>
          <p className="muted">{w.restaurant.name}</p>
        </div>
      </div>
      <section className="panel narrow-panel">
        <ActionForm action={save}>
          <label>
            {t("restaurantName")}
            <input
              name="name"
              defaultValue={w.restaurant.name}
              required
              maxLength={100}
            />
          </label>
          <label>
            {t("description")}
            <textarea
              name="description"
              defaultValue={w.restaurant.description}
              maxLength={1200}
            />
          </label>
          <div className="form-grid">
            <label>
              {t("phone")}
              <input
                name="phone"
                defaultValue={w.restaurant.phone}
                maxLength={40}
              />
            </label>
            <label>
              {t("address")}
              <input
                name="address"
                defaultValue={w.restaurant.address}
                maxLength={250}
              />
            </label>
          </div>
          <label>
            {t("defaultLanguage")}
            <select
              name="defaultLocale"
              defaultValue={w.settings.defaultLocale}
            >
              {["uz", "ru", "en"].map((l) => (
                <option key={l}>{l}</option>
              ))}
            </select>
          </label>
          <fieldset>
            <legend>{t("enabledLanguages")}</legend>
            <div className="checkbox-row">
              {["uz", "ru", "en"].map((l) => (
                <label className="checkbox-label" key={l}>
                  <input
                    type="checkbox"
                    name="enabledLocales"
                    value={l}
                    defaultChecked={w.settings.enabledLocales.some(
                      (v) => v === l,
                    )}
                  />
                  {l.toUpperCase()}
                </label>
              ))}
            </div>
          </fieldset>
          <label className="checkbox-label">
            <input
              type="checkbox"
              name="orderingEnabled"
              defaultChecked={w.settings.orderingEnabled}
            />
            {t("enableOrdering")}
          </label>
        </ActionForm>
      </section>
    </>
  );
}
