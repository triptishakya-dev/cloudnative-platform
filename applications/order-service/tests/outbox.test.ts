import assert from "node:assert/strict";
import { it } from "node:test";
import { randomUUID } from "node:crypto";
import type { PrismaClient } from "../src/node_modules/@cloudnative/order-prisma-client/index.js";
import type { FastifyBaseLogger } from "fastify";
import { OutboxWorker } from "../src/workers/outbox.worker.js";
import type { ClaimedEvent, OutboxStore } from "../src/workers/outbox.store.js";
import { outboxConfig } from "../src/workers/outbox.config.js";

const log = { info() {}, warn() {}, error() {} } as unknown as FastifyBaseLogger;
const settings = { pollMs: 10000, batchSize: 10, maxAttempts: 5, leaseMs: 120000, publishTimeoutMs: 30000, retryBaseMs: 5000 };
function fixture() {
  const event: ClaimedEvent = { id: randomUUID(), aggregateId: randomUUID(), aggregateType: "Order",
    eventType: "order.created", eventVersion: 1, createdAt: new Date(), payload: {}, attempts: 1, leaseToken: randomUUID() };
  const actions: string[] = [];
  let claimed = false;
  const store: OutboxStore = {
    claim: async () => { actions.push("claim"); if (claimed) return null; claimed = true; return event; },
    published: async () => { actions.push("published"); return true; },
    failed: async () => { actions.push("failed"); return true; },
  };
  const create = (publish: ConstructorParameters<typeof OutboxWorker>[2]) =>
    new OutboxWorker({} as PrismaClient, log, publish, { store, config: settings });
  return { store, actions, create };
}

it("marks completion only after the broker confirms", async () => {
  const { actions, create } = fixture();
  const worker = create(async () => { actions.push("confirm"); });
  await worker.tick();
  assert.deepEqual(actions, ["claim", "confirm", "published", "claim"]);
});
it("records broker failures for retry without marking completion", async () => {
  const { actions, create } = fixture();
  await create(async () => { throw new Error("broker unavailable"); }).tick();
  assert.deepEqual(actions, ["claim", "failed", "claim"]);
});
it("does not misclassify a database completion failure as a broker failure", async () => {
  const { actions, store, create } = fixture();
  store.published = async () => { actions.push("db-error"); throw new Error("database disconnected"); };
  await create(async () => {}).tick();
  assert.deepEqual(actions, ["claim", "db-error"]);
});
it("does not claim concurrently within one worker", async () => {
  const { actions, create } = fixture();
  let release!: () => void;
  const wait = new Promise<void>(resolve => { release = resolve; });
  const worker = create(async () => { await wait; });
  const first = worker.tick();
  assert.equal(worker.tick(), first);
  release();
  await first;
  assert.equal(actions.filter(action => action === "published").length, 1);
});
it("shutdown waits for the active attempt and claims no further events", async () => {
  const { actions, create } = fixture();
  let release!: () => void;
  let entered!: () => void;
  const enteredPromise = new Promise<void>(resolve => { entered = resolve; });
  const wait = new Promise<void>(resolve => { release = resolve; });
  const worker = create(async () => { entered(); await wait; });
  const running = worker.tick();
  await enteredPromise;
  let stopped = false;
  const stopping = worker.stop().then(() => { stopped = true; });
  await Promise.resolve();
  assert.equal(stopped, false);
  release();
  await Promise.all([running, stopping]);
  await worker.tick();
  assert.deepEqual(actions, ["claim", "published"]);
});
it("validates lease duration relative to the publishing deadline", () => {
  const original = process.env.OUTBOX_LEASE_MS;
  try {
    process.env.OUTBOX_LEASE_MS = "1";
    assert.throws(outboxConfig, /must exceed/);
    process.env.OUTBOX_LEASE_MS = "NaN";
    assert.throws(outboxConfig, /positive integer/);
  } finally {
    if (original === undefined) delete process.env.OUTBOX_LEASE_MS;
    else process.env.OUTBOX_LEASE_MS = original;
  }
});
