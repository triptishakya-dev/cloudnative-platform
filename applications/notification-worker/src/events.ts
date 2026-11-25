export class InvalidEvent extends Error {}

export interface OrderCreated {
  eventId: string;
  eventType: "order.created";
  eventVersion: 1;
  occurredAt: string;
  aggregateType: "Order";
  aggregateId: string;
  payload: { orderId: string; customerEmail: string; totalAmount: string; currency: string };
}
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function object(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
export function parseEvent(content: Buffer): OrderCreated | null {
  let value: unknown;
  try { value = JSON.parse(content.toString("utf8")); }
  catch { throw new InvalidEvent("Invalid JSON"); }
  if (!object(value) || typeof value.eventId !== "string" || !uuid.test(value.eventId) ||
      value.eventVersion !== 1 || value.aggregateType !== "Order" ||
      typeof value.aggregateId !== "string" || !uuid.test(value.aggregateId) ||
      typeof value.occurredAt !== "string" || !Number.isFinite(Date.parse(value.occurredAt)) || !object(value.payload)) {
    throw new InvalidEvent("Invalid event envelope or unsupported event version");
  }
  if (["order.status_changed", "order.cancelled", "order.completed"].includes(String(value.eventType))) return null;
  const payload = value.payload;
  if (value.eventType !== "order.created" || payload.orderId !== value.aggregateId ||
      typeof payload.customerEmail !== "string" || payload.customerEmail.length > 320 ||
      !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(payload.customerEmail) ||
      typeof payload.totalAmount !== "string" || !/^\d+(\.\d{1,2})?$/.test(payload.totalAmount) ||
      typeof payload.currency !== "string" || !/^[A-Z]{3}$/.test(payload.currency)) {
    throw new InvalidEvent("Invalid order.created payload or unsupported event type");
  }
  return value as unknown as OrderCreated;
}
