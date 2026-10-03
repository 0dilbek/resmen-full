import { describe, it, expect } from "vitest";
import {
  allowedTransition,
  transitionSchema,
  orderLineInput,
  orderStatuses,
} from "./validation";
describe("order state machine", () => {
  it("permits only documented edges", () => {
    const edges = new Set([
      "NEW:ACCEPTED",
      "NEW:CANCELLED",
      "ACCEPTED:PREPARING",
      "ACCEPTED:CANCELLED",
      "PREPARING:READY",
      "PREPARING:CANCELLED",
      "READY:COMPLETED",
    ]);
    for (const from of orderStatuses)
      for (const to of orderStatuses)
        expect(allowedTransition(from, to)).toBe(edges.has(`${from}:${to}`));
  });
  it("requires a cancellation reason", () => {
    expect(
      transitionSchema.safeParse({
        orderId: crypto.randomUUID(),
        expectedVersion: 1,
        nextStatus: "CANCELLED",
        reason: "",
        requestId: crypto.randomUUID(),
      }).success,
    ).toBe(false);
  });
  it("rejects non-integer quantities, duplicate options and injected fields", () => {
    const line = {
      productId: crypto.randomUUID(),
      quantity: 1,
      optionIds: [],
      note: "",
      expectedUnitMinor: "100",
    };
    expect(orderLineInput.safeParse({ ...line, quantity: 1.2 }).success).toBe(
      false,
    );
    expect(orderLineInput.safeParse({ ...line, total: 1 }).success).toBe(false);
    const option = crypto.randomUUID();
    expect(
      orderLineInput.safeParse({ ...line, optionIds: [option, option] })
        .success,
    ).toBe(false);
  });
});
