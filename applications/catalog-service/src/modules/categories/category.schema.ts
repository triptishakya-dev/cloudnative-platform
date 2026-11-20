import { Type, type Static } from "@sinclair/typebox";

// ── Shared ────────────────────────────────────────────────────────────────────

export const UuidParam = Type.Object({
  id: Type.String({ format: "uuid" }),
});

// ── Create ────────────────────────────────────────────────────────────────────

export const CreateCategoryBody = Type.Object({
  name: Type.String({ minLength: 1, maxLength: 120 }),
  slug: Type.String({ minLength: 1, maxLength: 120 }),
  description: Type.Optional(Type.String()),
  imageUrl: Type.Optional(Type.String({ format: "uri" })),
  parentId: Type.Optional(Type.String({ format: "uuid" })),
});

export type CreateCategoryBody = Static<typeof CreateCategoryBody>;

// ── Update ────────────────────────────────────────────────────────────────────

export const UpdateCategoryBody = Type.Partial(
  Type.Object({
    name: Type.String({ minLength: 1, maxLength: 120 }),
    slug: Type.String({ minLength: 1, maxLength: 120 }),
    description: Type.String(),
    imageUrl: Type.String({ format: "uri" }),
    parentId: Type.Union([Type.String({ format: "uuid" }), Type.Null()]),
  })
);

export type UpdateCategoryBody = Static<typeof UpdateCategoryBody>;

// ── List query ────────────────────────────────────────────────────────────────

export const ListCategoriesQuery = Type.Object({
  parentId: Type.Optional(Type.String({ format: "uuid" })),
  root: Type.Optional(Type.Boolean()),       // root=true → only top-level
});

export type ListCategoriesQuery = Static<typeof ListCategoriesQuery>;
