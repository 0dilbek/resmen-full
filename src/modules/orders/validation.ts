import { z } from "zod";
import { locales } from "@/i18n/config";
export const orderStatuses = [
  "NEW",
  "ACCEPTED",
  "PREPARING",
  "READY",
  "COMPLETED",
  "CANCELLED",
] as const;
export const statusSchema = z.enum(orderStatuses);
export type OrderStatus = z.infer<typeof statusSchema>;
export const transitions: Record<OrderStatus, readonly OrderStatus[]> = {
  NEW: ["ACCEPTED", "CANCELLED"],
  ACCEPTED: ["PREPARING", "CANCELLED"],
  PREPARING: ["READY", "CANCELLED"],
  READY: ["COMPLETED"],
  COMPLETED: [],
  CANCELLED: [],
};
export function allowedTransition(from: OrderStatus, to: OrderStatus) {
  return transitions[from].includes(to);
}
export const capabilitySchema = z.string().regex(/^[A-Za-z0-9_-]{43}$/);
export const orderLineInput = z
  .object({
    productId: z.uuid(),
    quantity: z.number().int().min(1).max(99),
    optionIds: z
      .array(z.uuid())
      .max(50)
      .refine((ids) => new Set(ids).size === ids.length),
    note: z.string().trim().max(500),
    expectedUnitMinor: z.string().regex(/^\d{1,14}$/),
  })
  .strict();
export const createOrderSchema = z
  .object({
    qrToken: z.string().regex(/^[A-Za-z0-9_-]{32}$/),
    idempotencyKey: z.uuid(),
    credential: capabilitySchema,
    locale: z.enum(locales),
    notes: z.string().trim().max(500),
    lines: z.array(orderLineInput).min(1).max(50),
  })
  .strict();
export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export const transitionSchema = z
  .object({
    orderId: z.uuid(),
    expectedVersion: z.number().int().positive(),
    nextStatus: statusSchema,
    reason: z.string().trim().max(300),
    requestId: z.uuid(),
  })
  .strict()
  .refine((v) => v.nextStatus !== "CANCELLED" || v.reason.length >= 3);
const modifierSnapshot = z
  .object({
    name: z.string(),
    groupName: z.string(),
    priceDeltaMinor: z.string(),
  })
  .strict();
export const orderDtoSchema = z
  .object({
    id: z.uuid(),
    number: z.number().int(),
    tableLabel: z.string(),
    status: statusSchema,
    version: z.number().int(),
    totalMinor: z.string(),
    currency: z.string(),
    notes: z.string(),
    createdAt: z.string(),
    updatedAt: z.string(),
    lines: z.array(
      z
        .object({
          id: z.uuid(),
          name: z.string(),
          quantity: z.number().int(),
          unitMinor: z.string(),
          totalMinor: z.string(),
          note: z.string(),
          modifiers: z.array(modifierSnapshot),
        })
        .strict(),
    ),
    events: z.array(
      z
        .object({
          status: statusSchema,
          reason: z.string(),
          createdAt: z.string(),
        })
        .strict(),
    ),
  })
  .strict();
export type OrderDto = z.infer<typeof orderDtoSchema>;
export const boardInputSchema = z
  .object({
    page: z.coerce.number().int().min(1).max(100000).default(1),
    status: z.enum(["OPEN", ...orderStatuses]).default("OPEN"),
  })
  .strict();
export const boardDtoSchema = z
  .object({
    orders: z.array(orderDtoSchema),
    total: z.number().int(),
    page: z.number().int(),
    pageSize: z.number().int(),
    counts: z.record(statusSchema, z.number().int()),
  })
  .strict();
export type OrderBoardDto = z.infer<typeof boardDtoSchema>;
