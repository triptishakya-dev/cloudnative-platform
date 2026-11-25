import type { PrismaClient } from "@cloudnative/catalog-prisma-client";
import type { CreateProductBody, ListProductsQuery, UpdateProductBody } from "./product.schema.js";

export class ProductService {
  constructor(private readonly prisma: PrismaClient) {}

  async findAll(query: ListProductsQuery) {
    const { page = 1, limit = 20, active, search, inStock, sort } = query;
    const skip = (page - 1) * limit;

    const where = {
      ...(active !== undefined && { active }),
      ...(inStock && { inventoryQuantity: { gt: 0 } }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: "insensitive" as const } },
          { sku: { contains: search, mode: "insensitive" as const } },
        ],
      }),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({ where, skip, take: limit, orderBy: sort === "low" ? [{ priceAmount: "asc" }, { id: "asc" }] : sort === "high" ? [{ priceAmount: "desc" }, { id: "asc" }] : [{ createdAt: "desc" }, { id: "asc" }] }),
      this.prisma.product.count({ where }),
    ]);

    return {
      items,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findById(id: string) {
    return this.prisma.product.findUniqueOrThrow({ where: { id } });
  }

  async create(data: CreateProductBody) {
    return this.prisma.product.create({
      data: {
        sku: data.sku,
        name: data.name,
        description: data.description,
        priceAmount: data.priceAmount,
        priceCurrency: data.priceCurrency ?? "INR",
        inventoryQuantity: data.inventoryQuantity ?? 0,
        active: data.active ?? true,
      },
    });
  }

  async update(id: string, data: UpdateProductBody) {
    return this.prisma.product.update({
      where: { id },
      data: {
        ...data,
        version: { increment: 1 },
      },
    });
  }

  async remove(id: string) {
    return this.prisma.product.delete({ where: { id } });
  }
}
