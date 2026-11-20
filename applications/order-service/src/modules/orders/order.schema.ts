import { Type, type Static } from "@sinclair/typebox";

// ── Shared ────────────────────────────────────────────────────────────────────

export const UuidParam = Type.Object({
  id: Type.String({ format: "uuid" }),
});

// ── Create Order ──────────────────────────────────────────────────────────────

export const OrderItemInput = Type.Object({
  productId: Type.String({ format: "uuid" }),
  sku: Type.String({ minLength: 1, maxLength: 100 }),
  quantity: Type.Integer({ minimum: 1 }),
});

export const CreateOrderBody = Type.Object({
  idempotencyKey: Type.String({ minLength: 1, maxLength: 255 }),
  currency: Type.Optional(Type.String({ minLength: 3, maxLength: 3, default: "INR" })),
  items: Type.Array(OrderItemInput, { minItems: 1 }),
});

export type CreateOrderBody = Static<typeof CreateOrderBody>;

// ── Cancel / Confirm / Complete Order ─────────────────────────────────────────

export const OrderActionBody = Type.Object({
  reason: Type.Optional(Type.String({ maxLength: 500 })),
});

export type OrderActionBody = Static<typeof OrderActionBody>;

// ── List Orders ───────────────────────────────────────────────────────────────

export const ListOrdersQuery = Type.Object({
  page: Type.Optional(Type.Integer({ minimum: 1, default: 1 })),
  limit: Type.Optional(Type.Integer({ minimum: 1, maximum: 100, default: 20 })),
  status: Type.Optional(
    Type.Union([
      Type.Literal("PENDING"),
      Type.Literal("CONFIRMED"),
      Type.Literal("CANCELLED"),
      Type.Literal("COMPLETED"),
      Type.Literal("FAILED"),
    ])
  ),
});

export type ListOrdersQuery = Static<typeof ListOrdersQuery>;
