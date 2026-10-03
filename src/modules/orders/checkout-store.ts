import { z } from "zod";
import { createOrderSchema, capabilitySchema } from "./validation";
const schema = z
  .object({
    attempt: createOrderSchema.nullable(),
    receipt: z
      .object({ id: z.uuid(), credential: capabilitySchema })
      .nullable(),
  })
  .strict();
type CheckoutState = z.infer<typeof schema>;
const empty: CheckoutState = { attempt: null, receipt: null };
export function createCheckoutStore(key: string) {
  let state = empty,
    loaded = false;
  const listeners = new Set<() => void>();
  return {
    getServerSnapshot: () => empty,
    getSnapshot: () => {
      if (!loaded) {
        loaded = true;
        try {
          state = schema.parse(
            JSON.parse(sessionStorage.getItem(key) ?? "null"),
          );
        } catch {
          state = empty;
        }
      }
      return state;
    },
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    set: (next: CheckoutState) => {
      state = schema.parse(next);
      try {
        sessionStorage.setItem(key, JSON.stringify(state));
      } catch {
        /* The current tab retains recovery state in memory. */
      }
      listeners.forEach((l) => l());
    },
  };
}
