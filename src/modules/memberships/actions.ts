"use server";
import { randomBytes, createHash } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/infrastructure/db";
import { checkQuota } from "@/modules/billing/server";
import { withTenant, audit, resolveActor } from "./server";
import { canManageRole, roleSchema } from "./policy";
import {
  memberships,
  memberBranches,
  invitations,
  invitationBranches,
  auditLogs,
} from "./schema";
import { branches } from "@/modules/branches/schema";
import { restaurants } from "@/modules/restaurants/schema";
import { user } from "@/modules/auth/schema";
import { getSession } from "@/modules/auth/server";
import { AppError, failure, type ActionResult } from "@/infrastructure/errors";
const inviteSchema = z
  .object({
    email: z.email().toLowerCase(),
    role: z.enum(["ADMIN", "MANAGER", "CASHIER"]),
    branchIds: z.array(z.uuid()).max(50),
    allBranches: z.boolean(),
  })
  .strict()
  .refine(
    (v) => v.role !== "CASHIER" || (!v.allBranches && v.branchIds.length > 0),
  )
  .refine((v) => v.role !== "ADMIN" || v.allBranches)
  .refine((v) => v.allBranches || v.branchIds.length > 0);
export async function inviteMember(
  restaurantId: string,
  input: unknown,
): Promise<ActionResult<{ token: string }>> {
  try {
    const data = inviteSchema.parse(input);
    const token = randomBytes(24).toString("base64url");
    await withTenant(restaurantId, "member:manage", async (tx, actor) => {
      if (!canManageRole(actor.membership.role, data.role))
        throw new AppError("FORBIDDEN", 403);
      const available = await tx
        .select({ id: branches.id })
        .from(branches)
        .where(
          and(
            eq(branches.restaurantId, actor.restaurantId),
            eq(branches.active, true),
          ),
        );
      if (data.branchIds.some((id) => !available.some((b) => b.id === id)))
        throw new AppError("NOT_FOUND", 404);
      const [invite] = await tx
        .insert(invitations)
        .values({
          restaurantId: actor.restaurantId,
          email: data.email,
          role: data.role,
          allBranches: data.allBranches,
          tokenHash: createHash("sha256").update(token).digest("hex"),
          expiresAt: new Date(Date.now() + 7 * 86400000),
          createdBy: actor.userId,
        })
        .returning();
      if (data.branchIds.length)
        await tx.insert(invitationBranches).values(
          data.branchIds.map((branchId) => ({
            restaurantId: actor.restaurantId,
            invitationId: invite.id,
            branchId,
          })),
        );
      await audit(tx, actor, "member.invited", invite.id);
    });
    return { ok: true, data: { token } };
  } catch (error) {
    return failure(error);
  }
}
export async function acceptInvitation(
  token: string,
): Promise<ActionResult<{ restaurantId: string }>> {
  try {
    z.string()
      .regex(/^[A-Za-z0-9_-]{32}$/)
      .parse(token);
    const session = await getSession();
    if (!session?.user.emailVerified)
      throw new AppError("UNAUTHENTICATED", 401);
    const hash = createHash("sha256").update(token).digest("hex");
    const result = await db.transaction(async (tx) => {
      const [candidate] = await tx
        .select()
        .from(invitations)
        .where(eq(invitations.tokenHash, hash));
      if (!candidate) throw new AppError("NOT_FOUND", 404);
      await tx
        .select()
        .from(restaurants)
        .where(eq(restaurants.id, candidate.restaurantId))
        .for("update");
      const [invite] = await tx
        .select()
        .from(invitations)
        .where(
          and(
            eq(invitations.restaurantId, candidate.restaurantId),
            eq(invitations.id, candidate.id),
          ),
        )
        .for("update");
      if (
        invite.acceptedAt ||
        invite.expiresAt < new Date() ||
        invite.email !== session.user.email.toLowerCase()
      )
        throw new AppError("FORBIDDEN", 403);
      const [tenant] = await tx
        .select()
        .from(restaurants)
        .where(eq(restaurants.id, invite.restaurantId));
      if (tenant.status === "SUSPENDED" || tenant.status === "ARCHIVED")
        throw new AppError("SUSPENDED", 403);
      const inviter = await resolveActor(
        tx,
        invite.createdBy,
        invite.restaurantId,
        "member:manage",
      );
      if (!canManageRole(inviter.membership.role, invite.role))
        throw new AppError("FORBIDDEN", 403);
      await checkQuota(tx, invite.restaurantId, "members");
      const [existing] = await tx
        .select()
        .from(memberships)
        .where(
          and(
            eq(memberships.restaurantId, invite.restaurantId),
            eq(memberships.userId, session.user.id),
          ),
        );
      if (existing?.active || existing?.role === "OWNER")
        throw new AppError("CONFLICT", 409);
      const [member] = await tx
        .insert(memberships)
        .values({
          restaurantId: invite.restaurantId,
          userId: session.user.id,
          role: invite.role,
          allBranches: invite.allBranches,
        })
        .onConflictDoUpdate({
          target: [memberships.restaurantId, memberships.userId],
          set: {
            role: invite.role,
            allBranches: invite.allBranches,
            active: true,
            updatedAt: new Date(),
          },
        })
        .returning();
      await tx
        .delete(memberBranches)
        .where(
          and(
            eq(memberBranches.restaurantId, invite.restaurantId),
            eq(memberBranches.membershipId, member.id),
          ),
        );
      const permitted = await tx
        .select()
        .from(invitationBranches)
        .where(
          and(
            eq(invitationBranches.restaurantId, invite.restaurantId),
            eq(invitationBranches.invitationId, invite.id),
          ),
        );
      if (permitted.length)
        await tx.insert(memberBranches).values(
          permitted.map((b) => ({
            restaurantId: invite.restaurantId,
            membershipId: member.id,
            branchId: b.branchId,
          })),
        );
      await tx
        .update(invitations)
        .set({ acceptedAt: new Date() })
        .where(
          and(
            eq(invitations.restaurantId, invite.restaurantId),
            eq(invitations.id, invite.id),
          ),
        );
      await tx.insert(auditLogs).values({
        restaurantId: invite.restaurantId,
        actorId: session.user.id,
        scope: "restaurant",
        action: "member.joined",
        resourceId: member.id,
      });
      return { restaurantId: invite.restaurantId };
    });
    return { ok: true, data: result };
  } catch (error) {
    return failure(error);
  }
}
export async function changeMember(
  restaurantId: string,
  input: unknown,
): Promise<ActionResult> {
  try {
    const data = z
      .object({ memberId: z.uuid(), role: roleSchema, active: z.boolean() })
      .strict()
      .parse(input);
    await withTenant(restaurantId, "member:manage", async (tx, actor) => {
      const [target] = await tx
        .select()
        .from(memberships)
        .where(
          and(
            eq(memberships.restaurantId, actor.restaurantId),
            eq(memberships.id, data.memberId),
          ),
        );
      if (!target) throw new AppError("NOT_FOUND", 404);
      if (
        !canManageRole(actor.membership.role, target.role) ||
        !canManageRole(actor.membership.role, data.role)
      )
        throw new AppError("FORBIDDEN", 403);
      if (target.role === "OWNER" || data.role === "OWNER")
        throw new AppError("FORBIDDEN", 403);
      if (target.role !== data.role) throw new AppError("INVALID_INPUT", 400);
      if (data.active && !target.active)
        await checkQuota(tx, actor.restaurantId, "members");
      await tx
        .update(memberships)
        .set({ active: data.active, updatedAt: new Date() })
        .where(
          and(
            eq(memberships.restaurantId, actor.restaurantId),
            eq(memberships.id, target.id),
          ),
        );
      await audit(
        tx,
        actor,
        data.active ? "member.activated" : "member.revoked",
        target.id,
      );
    });
    revalidatePath("/[locale]/dashboard", "layout");
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}

export async function updateMemberAccess(
  restaurantId: string,
  input: unknown,
): Promise<ActionResult> {
  try {
    const data = z
      .object({
        memberId: z.uuid(),
        role: z.enum(["ADMIN", "MANAGER", "CASHIER"]),
        branchIds: z.array(z.uuid()).max(50),
        allBranches: z.boolean(),
      })
      .strict()
      .refine((v) => v.role !== "ADMIN" || v.allBranches)
      .refine(
        (v) =>
          v.role !== "CASHIER" || (!v.allBranches && v.branchIds.length > 0),
      )
      .refine((v) => v.allBranches || v.branchIds.length > 0)
      .parse(input);
    await withTenant(restaurantId, "member:manage", async (tx, actor) => {
      const [target] = await tx
        .select()
        .from(memberships)
        .where(
          and(
            eq(memberships.restaurantId, actor.restaurantId),
            eq(memberships.id, data.memberId),
          ),
        );
      if (!target) throw new AppError("NOT_FOUND", 404);
      if (
        target.role === "OWNER" ||
        !canManageRole(actor.membership.role, target.role) ||
        !canManageRole(actor.membership.role, data.role)
      )
        throw new AppError("FORBIDDEN", 403);
      const available = await tx
        .select({ id: branches.id })
        .from(branches)
        .where(
          and(
            eq(branches.restaurantId, actor.restaurantId),
            eq(branches.active, true),
          ),
        );
      const assigned = [...new Set(data.branchIds)];
      if (assigned.some((id) => !available.some((b) => b.id === id)))
        throw new AppError("NOT_FOUND", 404);
      await tx
        .update(memberships)
        .set({
          role: data.role,
          allBranches: data.allBranches,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(memberships.restaurantId, actor.restaurantId),
            eq(memberships.id, target.id),
          ),
        );
      await tx
        .delete(memberBranches)
        .where(
          and(
            eq(memberBranches.restaurantId, actor.restaurantId),
            eq(memberBranches.membershipId, target.id),
          ),
        );
      if (!data.allBranches)
        await tx.insert(memberBranches).values(
          assigned.map((branchId) => ({
            restaurantId: actor.restaurantId,
            membershipId: target.id,
            branchId,
          })),
        );
      await audit(tx, actor, "member.access.updated", target.id);
    });
    revalidatePath("/[locale]/dashboard", "layout");
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}
export async function transferOwnership(
  restaurantId: string,
  input: unknown,
): Promise<ActionResult> {
  try {
    const data = z
      .object({ memberId: z.uuid(), confirm: z.literal(true) })
      .strict()
      .parse(input);
    const authSession = await getSession();
    if (
      !authSession?.session ||
      Date.now() - new Date(authSession.session.createdAt).getTime() >
        15 * 60_000
    )
      throw new AppError("UNAUTHENTICATED", 401);
    await withTenant(restaurantId, "member:manage", async (tx, actor) => {
      if (actor.membership.role !== "OWNER")
        throw new AppError("FORBIDDEN", 403);
      const [target] = await tx
        .select({ member: memberships, verified: user.emailVerified })
        .from(memberships)
        .innerJoin(user, eq(user.id, memberships.userId))
        .where(
          and(
            eq(memberships.restaurantId, actor.restaurantId),
            eq(memberships.id, data.memberId),
            eq(memberships.active, true),
          ),
        );
      if (
        !target ||
        !target.verified ||
        target.member.id === actor.membership.id ||
        target.member.role === "OWNER"
      )
        throw new AppError("INVALID_INPUT", 400);
      await tx
        .update(memberships)
        .set({ role: "OWNER", allBranches: true, updatedAt: new Date() })
        .where(
          and(
            eq(memberships.restaurantId, actor.restaurantId),
            eq(memberships.id, target.member.id),
          ),
        );
      await tx
        .delete(memberBranches)
        .where(
          and(
            eq(memberBranches.restaurantId, actor.restaurantId),
            eq(memberBranches.membershipId, target.member.id),
          ),
        );
      await tx
        .update(memberships)
        .set({ role: "ADMIN", allBranches: true, updatedAt: new Date() })
        .where(
          and(
            eq(memberships.restaurantId, actor.restaurantId),
            eq(memberships.id, actor.membership.id),
          ),
        );
      await audit(tx, actor, "owner.transferred", target.member.id);
    });
    revalidatePath("/[locale]/dashboard", "layout");
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}
