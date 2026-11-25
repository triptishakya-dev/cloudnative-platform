import { randomUUID } from "node:crypto";
import assert from "node:assert/strict";
import { it } from "node:test";
import { parseEvent, InvalidEvent } from "../src/events.js";
import { processMessage, type ProcessorDependencies } from "../src/processor.js";

const orderId = randomUUID();
const event = {
  eventId: randomUUID(), eventType: "order.created", eventVersion: 1,
  aggregateType: "Order", aggregateId: orderId, occurredAt: new Date().toISOString(),
  payload: { orderId, customerEmail: "test@example.com", totalAmount: "1500", currency: "INR" },
};
const incoming = { content: Buffer.from(JSON.stringify(event)) };
function dependencies(overrides: Partial<ProcessorDependencies> = {}) {
  const actions: string[] = [];
  const deps: ProcessorDependencies = {
    maxRetries: 3,
    deliver: async () => { actions.push("send"); return "sent"; },
    retry: async attempt => { actions.push(`retry:${attempt}`); },
    deadLetter: async () => { actions.push("dead"); },
    ack: () => { actions.push("ack"); },
    ...overrides,
  };
  return { actions, deps };
}

it("validates order event payloads", () => {
  assert.equal(parseEvent(incoming.content)?.eventId, event.eventId);
  for (const changed of [
    { ...event, eventVersion: 99 },
    { ...event, eventId: "bad" },
    { ...event, payload: { ...event.payload, orderId: randomUUID() } },
    { ...event, payload: { ...event.payload, customerEmail: "bad\r\nBcc: x@example.com" } },
    { ...event, payload: { ...event.payload, totalAmount: "-5" } },
  ]) assert.throws(() => parseEvent(Buffer.from(JSON.stringify(changed))), InvalidEvent);
});
it("acknowledges only after delivery finishes", async () => {
  const { actions, deps } = dependencies();
  assert.equal(await processMessage(incoming, deps), "sent");
  assert.deepEqual(actions, ["send", "ack"]);
});
it("acknowledges completed duplicates", async () => {
  const { actions, deps } = dependencies({ deliver: async () => "duplicate" });
  assert.equal(await processMessage(incoming, deps), "duplicate");
  assert.deepEqual(actions, ["ack"]);
});
it("does not email status changes", async () => {
  const { actions, deps } = dependencies();
  const message = { content: Buffer.from(JSON.stringify({ ...event, eventType: "order.status_changed" })) };
  assert.equal(await processMessage(message, deps), "ignored");
  assert.deepEqual(actions, ["ack"]);
});
it("dead-letters malformed JSON before acknowledging", async () => {
  const { actions, deps } = dependencies();
  assert.equal(await processMessage({ content: Buffer.from("{") }, deps), "dead-lettered");
  assert.deepEqual(actions, ["dead", "ack"]);
});
it("retries transient failures before acknowledging", async () => {
  const { actions, deps } = dependencies({ deliver: async () => { throw new Error("SMTP down"); } });
  assert.equal(await processMessage(incoming, deps), "retrying");
  assert.deepEqual(actions, ["retry:1", "ack"]);
});
it("dead-letters exhausted retries", async () => {
  const { actions, deps } = dependencies({ deliver: async () => { throw new Error("SMTP down"); } });
  await processMessage({ ...incoming, headers: { "x-notification-attempt": 3 } }, deps);
  assert.deepEqual(actions, ["dead", "ack"]);
});
it("rejects invalid retry headers instead of looping forever", async () => {
  const { actions, deps } = dependencies();
  await processMessage({ ...incoming, headers: { "x-notification-attempt": "invalid" } }, deps);
  assert.deepEqual(actions, ["dead", "ack"]);
});
it("leaves originals unacknowledged when retry publishing fails", async () => {
  const { actions, deps } = dependencies({
    deliver: async () => { throw new Error("SMTP down"); },
    retry: async () => { throw new Error("broker down"); },
  });
  await assert.rejects(processMessage(incoming, deps), /broker down/);
  assert.deepEqual(actions, []);
});
it("leaves poison messages unacknowledged when dead-letter publishing fails", async () => {
  const { actions, deps } = dependencies({ deadLetter: async () => { throw new Error("broker down"); } });
  await assert.rejects(processMessage({ content: Buffer.from("bad") }, deps), /broker down/);
  assert.deepEqual(actions, []);
});
