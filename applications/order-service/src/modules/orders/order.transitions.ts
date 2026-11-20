import { OrderStatus } from "@cloudnative/order-prisma-client";

// ── Valid transitions ─────────────────────────────────────────────────────────
// Maps each status to the set of statuses it may legally move to.

export const ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  [OrderStatus.PENDING]:   [OrderStatus.CONFIRMED, OrderStatus.CANCELLED, OrderStatus.FAILED],
  [OrderStatus.CONFIRMED]: [OrderStatus.COMPLETED, OrderStatus.CANCELLED],
  [OrderStatus.CANCELLED]: [],
  [OrderStatus.COMPLETED]: [],
  [OrderStatus.FAILED]:    [OrderStatus.CANCELLED],
};

/**
 * Returns true when moving from `from` → `to` is a valid transition.
 */
export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return ORDER_TRANSITIONS[from].includes(to);
}

/**
 * Throws a 409 Conflict if the transition is not allowed.
 */
export function assertTransition(from: OrderStatus, to: OrderStatus): void {
  if (!canTransition(from, to)) {
    const err = new Error(
      `Cannot transition order from ${from} to ${to}`
    ) as Error & { statusCode: number };
    err.statusCode = 409;
    throw err;
  }
}
