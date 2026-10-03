import { getTranslations } from "next-intl/server";
import { workspace } from "@/modules/restaurants/queries";
import { createBranch, setBranchActive } from "@/modules/branches/actions";
import { ActionForm } from "@/components/ui/action-form";
export default async function Page({
  params,
}: {
  params: Promise<{ restaurantId: string }>;
}) {
  const { restaurantId } = await params;
  const w = await workspace(restaurantId, "branch:manage");
  const t = await getTranslations();
  async function add(form: FormData) {
    "use server";
    return createBranch(restaurantId, {
      name: form.get("name"),
      slug: form.get("slug"),
      address: form.get("address"),
    });
  }
  return (
    <>
      <div className="page-title">
        <h1>{t("branches")}</h1>
      </div>
      <div className="split-content">
        <section className="panel">
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>{t("branchName")}</th>
                  <th>{t("status")}</th>
                  <th>{t("action")}</th>
                </tr>
              </thead>
              <tbody>
                {w.branches.map((b) => (
                  <tr key={b.id}>
                    <td>
                      <strong>{b.name}</strong>
                      <small>{b.address}</small>
                    </td>
                    <td>
                      <span
                        className={`badge ${b.active ? "badge-green" : ""}`}
                      >
                        {t(b.active ? "active" : "inactive")}
                      </span>
                    </td>
                    <td>
                      {!b.isDefault && (
                        <ActionForm
                          action={async () => {
                            "use server";
                            return setBranchActive(
                              restaurantId,
                              b.id,
                              !b.active,
                            );
                          }}
                          submitKey={b.active ? "revoke" : "active"}
                        >
                          <span className="sr-only">{b.name}</span>
                        </ActionForm>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
        <section className="panel">
          <h2>{t("addBranch")}</h2>
          <ActionForm action={add} submitKey="addBranch">
            <label>
              {t("branchName")}
              <input name="name" required maxLength={100} />
            </label>
            <label>
              {t("slug")}
              <input
                name="slug"
                required
                pattern="[a-z0-9]+(-[a-z0-9]+)*"
                minLength={3}
              />
            </label>
            <label>
              {t("address")}
              <input name="address" maxLength={250} />
            </label>
          </ActionForm>
        </section>
      </div>
    </>
  );
}
