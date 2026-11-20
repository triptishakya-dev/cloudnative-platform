import type { PrismaClient } from "@cloudnative/order-prisma-client";
import { OrderStatus } from "@cloudnative/order-prisma-client";
import type { CreateOrderBody, ListOrdersQuery } from "./order.schema.js";
import { assertTransition } from "./order.transitions.js";
import { CatalogClient } from "../../clients/catalog.client.js";
import { buildOrderCreatedEvent, buildOrderStatusChangedEvent } from "../../events/order.events.js";

export class OrderService {
  private catalog: CatalogClient;

  constructor(private readonly prisma: PrismaClient) {
    this.catalog = new CatalogClient();
  }

  // ── List ────────────────────────────────────────────────────────────────────

  async findAll(customerId: string, query: ListOrdersQuery) {
    const { page = 1, limit = 20, status } = query;
    const skip = (page - 1) * limit;

    const where = {
      customerId,
      ...(status && { status: status as OrderStatus }),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.order.findMany({
        where,
        include: { items: true },
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.order.count({ where }),
    ]);

    return { items, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  // ── Get one ─────────────────────────────────────────────────────────────────

  async findById(id: string, customerId: string) {
    return this.prisma.order.findFirstOrThrow({
      where: { id, customerId },
      include: { items: true },
    });
  }

  // ── Create ──────────────────────────────────────────────────────────────────

  async create(customerId: string, customerEmail: string, body: CreateOrderBody) {
    // 1. Fetch product details from catalog service
    const enrichedItems = await this.catalog.fetchProducts(
      body.items.map((i) => i.productId)
    );

    // 2. Build order items with pricing snapshot
    const orderItems = body.items.map((item) => {
      const product = enrichedItems.find((p) => p.id === item.productId);
      if (!product) throw Object.assign(new Error(`Product ${item.productId} not found`), { statusCode: 404 });

      const lineTotal = Number(product.priceAmount) * item.quantity;
      return {
        productId: item.productId,
        sku: item.sku,
        productName: product.name,
        quantity: item.quantity,
        unitPrice: product.priceAmount,
        lineTotal,
        currency: body.currency ?? "INR",
      };
    });

    const totalAmount = orderItems.reduce((sum, i) => sum + Number(i.lineTotal), 0);

    // 3. Create order + items + outbox event in one transaction
    const order = await this.prisma.$transaction(async (tx) => {
      const created = await tx.order.create({
        data: {
          customerId,
          customerEmail,
          currency: body.currency ?? "INR",
          idempotencyKey: body.idempotencyKey,
          totalAmount,
          status: OrderStatus.PENDING,
          items: { create: orderItems },
        },
        include: { items: true },
      });

      await tx.outboxEvent.create({
        data: buildOrderCreatedEvent(created),
      });

      return created;
    });

    return order;
  }

  // ── Transition helpers ──────────────────────────────────────────────────────

  private async transition(id: string, customerId: string, to: OrderStatus) {
    const order = await this.findById(id, customerId);
    assertTransition(order.status, to);

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.order.update({
        where: { id },
        data: { status: to, version: { increment: 1 } },
        include: { items: true },
      });

      await tx.outboxEvent.create({
        data: buildOrderStatusChangedEvent(updated, order.status, to),
      });

      return updated;
    });
  }

  async confirm(id: string, customerId: string) {
    return this.transition(id, customerId, OrderStatus.CONFIRMED);
  }

  async cancel(id: string, customerId: string) {
    return this.transition(id, customerId, OrderStatus.CANCELLED);
  }

  async complete(id: string, customerId: string) {
    return this.transition(id, customerId, OrderStatus.COMPLETED);
  }
}
