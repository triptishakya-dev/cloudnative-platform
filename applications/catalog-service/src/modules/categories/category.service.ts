import type { PrismaClient } from "@cloudnative/catalog-prisma-client";
import type { CreateCategoryBody, ListCategoriesQuery, UpdateCategoryBody } from "./category.schema.js";

export class CategoryService {
  constructor(private readonly prisma: PrismaClient) {}

  async findAll(query: ListCategoriesQuery) {
    const where = {
      ...(query.root && { parentId: null }),
      ...(query.parentId && { parentId: query.parentId }),
    };

    return this.prisma.category.findMany({
      where,
      include: { children: true },
      orderBy: { name: "asc" },
    });
  }

  async findById(id: string) {
    return this.prisma.category.findUniqueOrThrow({
      where: { id },
      include: {
        parent: true,
        children: true,
      },
    });
  }

  async findChildren(parentId: string) {
    // Verify parent exists first
    await this.prisma.category.findUniqueOrThrow({ where: { id: parentId } });

    return this.prisma.category.findMany({
      where: { parentId },
      orderBy: { name: "asc" },
    });
  }

  async create(data: CreateCategoryBody) {
    return this.prisma.category.create({
      data: {
        name: data.name,
        slug: data.slug,
        description: data.description,
        imageUrl: data.imageUrl,
        parentId: data.parentId,
      },
    });
  }

  async update(id: string, data: UpdateCategoryBody) {
    return this.prisma.category.update({
      where: { id },
      data,
    });
  }

  async remove(id: string) {
    return this.prisma.category.delete({ where: { id } });
  }
}
