import { and, desc, eq } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import { db } from "@/infrastructure/db";
import { workspace } from "@/modules/restaurants/queries";
import {
  memberships,
  memberBranches,
  auditLogs,
} from "@/modules/memberships/schema";
import { user } from "@/modules/auth/schema";
import { InviteForm } from "@/modules/memberships/components/invite-form";
import { ActionForm } from "@/components/ui/action-form";
import {
  changeMember,
  updateMemberAccess,
  transferOwnership,
} from "@/modules/memberships/actions";
import { canManageRole } from "@/modules/memberships/policy";
export default async function Page({
  params,
}: {
  params: Promise<{ restaurantId: string }>;
}) {
  const { restaurantId } = await params;
  const w = await workspace(restaurantId, "member:manage");
  const t = await getTranslations();
  const members = await db
    .select({
      id: memberships.id,
      name: user.name,
      email: user.email,
      role: memberships.role,
      active: memberships.active,
      allBranches: memberships.allBranches,
    })
    .from(memberships)
    .innerJoin(user, eq(user.id, memberships.userId))
    .where(eq(memberships.restaurantId, w.actor.restaurantId));
  const assignments = await db
    .select()
    .from(memberBranches)
    .where(eq(memberBranches.restaurantId, w.actor.restaurantId));
  const events = await db
    .select({
      id: auditLogs.id,
      action: auditLogs.action,
      createdAt: auditLogs.createdAt,
    })
    .from(auditLogs)
    .where(
      and(
        eq(auditLogs.restaurantId, w.actor.restaurantId),
        eq(auditLogs.scope, "restaurant"),
      ),
    )
    .orderBy(desc(auditLogs.createdAt))
    .limit(15);
  return (
    <>
      <div className="page-title">
        <h1>{t("team")}</h1>
      </div>
      <div className="split-content">
        <section className="panel">
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>{t("name")}</th>
                  <th>{t("role")}</th>
                  <th>{t("status")}</th>
                  <th>{t("action")}</th>
                </tr>
              </thead>
              <tbody>
                {members.map((m) => (
                  <tr key={m.id}>
                    <td>
                      <strong>{m.name}</strong>
                      <small>{m.email}</small>
                    </td>
                    <td>{t(m.role.toLowerCase())}</td>
                    <td>
                      <span
                        className={`badge ${m.active ? "badge-green" : ""}`}
                      >
                        {t(m.active ? "active" : "inactive")}
                      </span>
                    </td>
                    <td>
                      {m.role !== "OWNER" &&
                        canManageRole(w.actor.membership.role, m.role) && (
                          <>
                            <ActionForm
                              action={async () => {
                                "use server";
                                return changeMember(restaurantId, {
                                  memberId: m.id,
                                  role: m.role,
                                  active: !m.active,
                                });
                              }}
                              submitKey={m.active ? "revoke" : "active"}
                            >
                              <span className="sr-only">{m.name}</span>
                            </ActionForm>
                            <details>
                              <summary>{t("editAccess")}</summary>
                              <ActionForm
                                action={async (f) => {
                                  "use server";
                                  return updateMemberAccess(restaurantId, {
                                    memberId: m.id,
                                    role: f.get("role"),
                                    branchIds: f.getAll("branchIds"),
                                    allBranches: f.get("allBranches") === "on",
                                  });
                                }}
                              >
                                <label>
                                  {t("role")}
                                  <select name="role" defaultValue={m.role}>
                                    {(w.actor.membership.role === "OWNER"
                                      ? ["ADMIN", "MANAGER", "CASHIER"]
                                      : ["MANAGER", "CASHIER"]
                                    ).map((role) => (
                                      <option key={role} value={role}>
                                        {t(role.toLowerCase())}
                                      </option>
                                    ))}
                                  </select>
                                </label>
                                <label className="checkbox-label">
                                  <input
                                    type="checkbox"
                                    name="allBranches"
                                    defaultChecked={m.allBranches}
                                  />
                                  {t("allBranches")}
                                </label>
                                <fieldset>
                                  <legend>{t("branches")}</legend>
                                  {w.branches
                                    .filter((b) => b.active)
                                    .map((b) => (
                                      <label
                                        className="checkbox-label"
                                        key={b.id}
                                      >
                                        <input
                                          type="checkbox"
                                          name="branchIds"
                                          value={b.id}
                                          defaultChecked={assignments.some(
                                            (a) =>
                                              a.membershipId === m.id &&
                                              a.branchId === b.id,
                                          )}
                                        />
                                        {b.name}
                                      </label>
                                    ))}
                                </fieldset>
                                <p className="muted">{t("branchRoleHint")}</p>
                              </ActionForm>
                            </details>
                            {w.actor.membership.role === "OWNER" &&
                              m.active && (
                                <details>
                                  <summary>{t("transferOwnership")}</summary>
                                  <ActionForm
                                    submitKey="transferOwnership"
                                    action={async (f) => {
                                      "use server";
                                      return transferOwnership(restaurantId, {
                                        memberId: m.id,
                                        confirm: f.get("confirm") === "on",
                                      });
                                    }}
                                  >
                                    <p>{t("ownershipHint")}</p>
                                    <label className="checkbox-label">
                                      <input
                                        type="checkbox"
                                        name="confirm"
                                        required
                                      />
                                      {t("confirmTransfer")}
                                    </label>
                                  </ActionForm>
                                </details>
                              )}
                          </>
                        )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
        <section className="panel">
          <h2>{t("invite")}</h2>
          <InviteForm
            restaurantId={restaurantId}
            branches={w.branches.filter((b) => b.active)}
            owner={w.actor.membership.role === "OWNER"}
          />
        </section>
      </div>
      <section className="panel activity-panel">
        <h2>{t("audit")}</h2>
        {events.map((e) => (
          <div className="activity-row" key={e.id}>
            <code>{e.action}</code>
            <time dateTime={e.createdAt.toISOString()}>
              {e.createdAt.toISOString().slice(0, 16).replace("T", " ")} UTC
            </time>
          </div>
        ))}
      </section>
    </>
  );
}
