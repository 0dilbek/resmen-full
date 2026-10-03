import { describe, it, expect } from "vitest";
import { parseMoney, inputMoney } from "./money";
import { moneyInput, modifierSchema } from "./validation";
describe("catalog money and selections", () => {
  it("uses integer minor units without floating point rounding", () => {
    expect(parseMoney("0.29")).toBe(29n);
    expect(parseMoney("45000")).toBe(4500000n);
    expect(inputMoney(4500029n)).toBe("45000.29");
  });
  it("rejects negative, scientific and overprecision prices", () => {
    for (const value of ["-1", "1e8", "0.001", "NaN", "Infinity", "1000000000"])
      expect(moneyInput.safeParse(value).success).toBe(false);
  });
  it("rejects impossible modifier cardinality", () => {
    expect(
      modifierSchema.safeParse({
        menuId: crypto.randomUUID(),
        names: { uz: "Sous", ru: "", en: "" },
        minSelections: 3,
        maxSelections: 1,
        options: [
          {
            names: { uz: "Achchiq", ru: "", en: "" },
            price: "0",
            available: true,
          },
        ],
      }).success,
    ).toBe(false);
  });
});
