import { Type, type Static } from "@sinclair/typebox";

// ── Shared ────────────────────────────────────────────────────────────────────

export const UuidParam = Type.Object({
  id: Type.String({ format: "uuid" }),
});

// ── Create ────────────────────────────────────────────────────────────────────

export const CreateProductBody = Type.Object({
  sku: Type.String({ minLength: 1, maxLength: 100 }),
  name: Type.String({ minLength: 1, maxLength: 255 }),
  description: Type.Optional(Type.String()),
  priceAmount: Type.Number({ minimum: 0 }),
  priceCurrency: Type.Optional(Type.String({ minLength: 3, maxLength: 3, default: "INR" })),
  inventoryQuantity: Type.Optional(Type.Integer({ minimum: 0, default: 0 })),
  active: Type.Optional(Type.Boolean({ default: true })),
});

export type CreateProductBody = Static<typeof CreateProductBody>;

// ── Update ────────────────────────────────────────────────────────────────────

export const UpdateProductBody = Type.Partial(
  Type.Object({
    name: Type.String({ minLength: 1, maxLength: 255 }),
    description: Type.String(),
    priceAmount: Type.Number({ minimum: 0 }),
    priceCurrency: Type.String({ minLength: 3, maxLength: 3 }),
    inventoryQuantity: Type.Integer({ minimum: 0 }),
    active: Type.Boolean(),
  })
);

export type UpdateProductBody = Static<typeof UpdateProductBody>;

// ── List query ────────────────────────────────────────────────────────────────

export const ListProductsQuery = Type.Object({
  page: Type.Optional(Type.Integer({ minimum: 1, default: 1 })),
  limit: Type.Optional(Type.Integer({ minimum: 1, maximum: 100, default: 20 })),
  active: Type.Optional(Type.Boolean()),
  search: Type.Optional(Type.String()),
  inStock: Type.Optional(Type.Boolean()),
  sort: Type.Optional(Type.Union([Type.Literal("latest"), Type.Literal("low"), Type.Literal("high")])),
});

export type ListProductsQuery = Static<typeof ListProductsQuery>;
