import { EventEmitter } from "node:events";
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { ConfirmChannel } from "amqplib";
import { confirmPublish, eventEnvelope } from "../src/messaging/rabbitmq.js";

const event = { id: "event-1", eventType: "order.created", eventVersion: 1,
  aggregateType: "Order", aggregateId: "order-1", createdAt: new Date("2026-01-01T00:00:00Z"), payload: { orderId: "order-1" } };
function channel(action: (ch: EventEmitter, args: unknown[]) => void) {
  const ch = new EventEmitter();
  Object.assign(ch, { publish: (...args: unknown[]) => { action(ch, args); return true; } });
  return ch as ConfirmChannel;
}
describe("RabbitMQ publishing", () => {
  it("preserves event identity and timestamp", () => {
    assert.equal(eventEnvelope(event).eventId, event.id);
    assert.equal(eventEnvelope(event).occurredAt, event.createdAt.toISOString());
  });
  it("waits for confirmation and sends persistent mandatory JSON", async () => {
    let confirm!: (err: Error | null) => void;
    let resolved = false;
    const ch = channel((_ch, args) => {
      assert.equal(args[1], "order.created");
      assert.deepEqual(JSON.parse(String(args[2])), eventEnvelope(event));
      assert.equal((args[3] as { persistent: boolean }).persistent, true);
      assert.equal((args[3] as { mandatory: boolean }).mandatory, true);
      confirm = args[4] as typeof confirm;
    });
    const pending = confirmPublish(ch, "events", event).then(() => { resolved = true; });
    await Promise.resolve();
    assert.equal(resolved, false);
    confirm(null);
    await pending;
    assert.equal(ch.listenerCount("return"), 0);
  });
  it("rejects unroutable messages even when the broker acknowledges", async () => {
    await assert.rejects(confirmPublish(channel((ch, args) => {
      ch.emit("return");
      (args[4] as Function)(null);
    }), "events", event), /unroutable/);
  });
  it("rejects negative confirmations", async () => {
    await assert.rejects(confirmPublish(channel((_ch, args) => {
      (args[4] as Function)(new Error("nack"));
    }), "events", event), /nack/);
  });
  it("rejects channel loss", async () => {
    await assert.rejects(confirmPublish(channel(ch => { ch.emit("close"); }), "events", event), /closed/);
  });
  it("bounds confirmation waits", async () => {
    await assert.rejects(confirmPublish(channel(() => {}), "events", event, 10), /timed out/);
  });
});

