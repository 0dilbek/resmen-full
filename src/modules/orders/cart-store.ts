import { z } from "zod";
export const cartLineSchema = z
  .object({
    key: z.uuid(),
    productId: z.uuid(),
    optionIds: z.array(z.uuid()).max(50),
    quantity: z.number().int().min(1).max(99),
    note: z.string().max(500),
  })
  .strict();
export type CartLine = z.infer<typeof cartLineSchema>;
const cartSchema = z.array(cartLineSchema).max(50);
const empty: CartLine[] = [];
export function createCartStore(key: string) {
  let state = empty;
  let loaded = false;
  const listeners = new Set<() => void>();
  return {
    getServerSnapshot: () => empty,
    getSnapshot: () => {
      if (!loaded) {
        loaded = true;
        try {
          state = cartSchema.parse(
            JSON.parse(localStorage.getItem(key) ?? "[]"),
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
    set: (next: CartLine[]) => {
      state = cartSchema.parse(next);
      try {
        localStorage.setItem(key, JSON.stringify(state));
      } catch {
        /* Cart remains in memory when browser storage is unavailable. */
      }
      listeners.forEach((listener) => listener());
    },
  };
}
