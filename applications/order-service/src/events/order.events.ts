import type { Order, OrderStatus } from "@cloudnative/order-prisma-client";

// ── Event type constants ──────────────────────────────────────────────────────

export const ORDER_EVENTS = {
  CREATED: "order.created",
  STATUS_CHANGED: "order.status_changed",
  CANCELLED: "order.cancelled",
  COMPLETED: "order.completed",
} as const;

export type OrderEventType = (typeof ORDER_EVENTS)[keyof typeof ORDER_EVENTS];

// ── Event payload builders ────────────────────────────────────────────────────

/**
 * Builds an OutboxEvent row for a newly created order.
 * This gets written inside the same DB transaction as the order creation.
 */
export function buildOrderCreatedEvent(order: Order & { items: unknown[] }) {
  return {
    aggregateType: "Order",
    aggregateId: order.id,
    eventType: ORDER_EVENTS.CREATED,
    eventVersion: 1,
    payload: {
      orderId: order.id,
      customerId: order.customerId,
      customerEmail: order.customerEmail,
      status: order.status,
      totalAmount: order.totalAmount.toString(),
      currency: order.currency,
      createdAt: order.createdAt.toISOString(),
    },
  };
}

/**
 * Builds an OutboxEvent row for a status transition.
 */
export function buildOrderStatusChangedEvent(
  order: Order,
  fromStatus: OrderStatus,
  toStatus: OrderStatus
) {
  return {
    aggregateType: "Order",
    aggregateId: order.id,
    eventType: ORDER_EVENTS.STATUS_CHANGED,
    eventVersion: 1,
    payload: {
      orderId: order.id,
      customerId: order.customerId,
      fromStatus,
      toStatus,
      version: order.version,
      updatedAt: order.updatedAt.toISOString(),
    },
  };
}
