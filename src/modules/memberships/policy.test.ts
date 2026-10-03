import { describe, it, expect } from "vitest";
import { can, canManageRole, hasBranch } from "./policy";
describe("role boundaries", () => {
  it("cashiers can only read restaurant context and operate orders", () => {
    expect(can("CASHIER", "order:transition")).toBe(true);
    for (const permission of [
      "catalog:manage",
      "template:manage",
      "member:manage",
      "billing:manage",
      "restaurant:update",
    ] as const)
      expect(can("CASHIER", permission)).toBe(false);
  });
  it("only owners manage billing and administrator roles", () => {
    expect(can("OWNER", "billing:manage")).toBe(true);
    expect(can("ADMIN", "billing:manage")).toBe(false);
    expect(canManageRole("ADMIN", "OWNER")).toBe(false);
    expect(canManageRole("ADMIN", "ADMIN")).toBe(false);
    expect(canManageRole("ADMIN", "CASHIER")).toBe(true);
  });
  it("assigned branch scopes fail closed", () => {
    expect(hasBranch({ allBranches: false, branchIds: ["a"] }, "b")).toBe(
      false,
    );
    expect(hasBranch({ allBranches: false, branchIds: [] }, "a")).toBe(false);
    expect(hasBranch({ allBranches: true, branchIds: [] }, "a")).toBe(true);
  });
});
