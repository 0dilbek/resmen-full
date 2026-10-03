import { z } from "zod";
export const roleSchema = z.enum(["OWNER", "ADMIN", "MANAGER", "CASHIER"]);
export type Role = z.infer<typeof roleSchema>;
export type Permission =
  | "restaurant:read"
  | "restaurant:update"
  | "branch:manage"
  | "catalog:read"
  | "catalog:manage"
  | "template:manage"
  | "menu:publish"
  | "qr:manage"
  | "order:read"
  | "order:transition"
  | "analytics:read"
  | "member:manage"
  | "billing:manage"
  | "audit:read";
const owner: Permission[] = [
  "restaurant:read",
  "restaurant:update",
  "branch:manage",
  "catalog:read",
  "catalog:manage",
  "template:manage",
  "menu:publish",
  "qr:manage",
  "order:read",
  "order:transition",
  "analytics:read",
  "member:manage",
  "billing:manage",
  "audit:read",
];
const grants: Record<Role, readonly Permission[]> = {
  OWNER: owner,
  ADMIN: owner.filter((p) => p !== "billing:manage"),
  MANAGER: [
    "restaurant:read",
    "catalog:read",
    "catalog:manage",
    "template:manage",
    "menu:publish",
    "qr:manage",
    "order:read",
    "order:transition",
    "analytics:read",
  ],
  CASHIER: ["restaurant:read", "order:read", "order:transition"],
};
export function can(role: Role, permission: Permission) {
  return grants[role].includes(permission);
}
export function canManageRole(actor: Role, target: Role) {
  return (
    actor === "OWNER" ||
    (actor === "ADMIN" && (target === "MANAGER" || target === "CASHIER"))
  );
}
export function hasBranch(
  scope: { allBranches: boolean; branchIds: readonly string[] },
  branchId: string,
) {
  return scope.allBranches || scope.branchIds.includes(branchId);
}
