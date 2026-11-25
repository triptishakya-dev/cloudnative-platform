import "../src/env.js";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { createServer, type Socket } from "node:net";
import { execFileSync } from "node:child_process";
import { it } from "node:test";
import type { FastifyBaseLogger } from "fastify";
import { connect } from "amqplib";
import { PostgresOutboxStore } from "../src/workers/outbox.store.js";
import { OutboxWorker } from "../src/workers/outbox.worker.js";
import { publishOrderEvent } from "../src/messaging/rabbitmq.js";

const require = createRequire(new URL("../src/plugins/prisma.ts", import.meta.url));
const { PrismaClient } = require("@cloudnative/order-prisma-client");
const log = { info() {}, warn() {}, error() {} } as unknown as FastifyBaseLogger;
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
const settings = { pollMs: 10000, batchSize: 1, maxAttempts: 3, leaseMs: 120000, publishTimeoutMs: 3000, retryBaseMs: 1 };
const docker = (...args: string[]) => execFileSync("docker", args, { encoding: "utf8", timeout: 30000, windowsHide: true }).trim();

it("atomically claims, fences stale owners, recovers crashes, and handles a real broker restart", { timeout: 180000 }, async () => {
  const schema = `outbox_test_${randomUUID().replaceAll("-", "")}`;
  const baseUrl = process.env.DATABASE_URL ?? "postgresql://cloudnative:change-me@127.0.0.1:5432/order_db";
  const admin = new PrismaClient({ datasources: { db: { url: baseUrl } } });
  const url = new URL(baseUrl);
  url.searchParams.set("schema", schema);
  const db = new PrismaClient({ datasources: { db: { url: url.toString() } } });
  const db2 = new PrismaClient({ datasources: { db: { url: url.toString() } } });
  const brokerName = `cloudnative-outbox-test-${randomUUID()}`;
  let brokerCreated = false;
  let schemaCreated = false;
  const insert = async () => {
    const id = randomUUID();
    await db.$executeRaw`INSERT INTO outbox_events(id, aggregate_type, aggregate_id, event_type, payload)
      VALUES (${id}::uuid, 'Order', ${randomUUID()}::uuid, 'order.created', '{}'::jsonb)`;
    return id;
  };
  const state = async (id: string) => (await db.$queryRaw`SELECT * FROM outbox_events WHERE id = ${id}::uuid`)[0];
  const expire = async (id: string) => {
    await db.$executeRaw`UPDATE outbox_events SET lease_expires_at = clock_timestamp() - interval '1 second' WHERE id = ${id}::uuid`;
  };
  try {
    await admin.$executeRawUnsafe(`CREATE SCHEMA "${schema}"`);
    schemaCreated = true;
    const current = await db.$queryRaw`SELECT current_schema() AS name`;
    assert.equal(current[0].name, schema, "Test must be isolated from real order tables");
    for (const migration of ["20261120075125_init", "20261125123000_outbox_leases"]) {
      const sql = await readFile(new URL(`../prisma/migrations/${migration}/migration.sql`, import.meta.url), "utf8");
      for (const statement of sql.split(";").filter(value => value.trim())) await db.$executeRawUnsafe(statement);
    }
    const one = new PostgresOutboxStore(db, settings);
    const two = new PostgresOutboxStore(db2, settings);

    // Competing claims for one row must produce exactly one owner.
    const firstId = await insert();
    const claims = await Promise.all([one.claim(), two.claim()]);
    assert.equal(claims.filter(Boolean).length, 1);
    const first = claims.find(Boolean)!;
    assert.equal(first.id, firstId);
    assert.equal(first.attempts, 1);
    assert.equal(await two.claim(), null);
    // Simulate a process disappearing after committing its claim.
    await expire(firstId);
    const recovered = (await two.claim())!;
    assert.equal(recovered.id, firstId);
    assert.notEqual(recovered.leaseToken, first.leaseToken);
    assert.equal(recovered.attempts, 2);
    assert.equal(await one.published(first), false);
    assert.equal(await one.failed(first, "late failure"), false);
    assert.equal(await two.published(recovered), true);
    assert.equal((await state(firstId)).status, "PUBLISHED");

    // Legacy PROCESSING rows, pre-lease deployments, recover too.
    const legacy = await insert();
    await db.$executeRaw`UPDATE outbox_events SET status = 'PROCESSING' WHERE id = ${legacy}::uuid`;
    const legacyClaim = (await one.claim())!;
    assert.equal(legacyClaim.id, legacy);
    await one.published(legacyClaim);

    // Crashes count toward the attempt budget and cannot leave permanent PROCESSING rows.
    const exhausted = await insert();
    await db.$executeRaw`UPDATE outbox_events SET status = 'PROCESSING', attempts = 3 WHERE id = ${exhausted}::uuid`;
    assert.equal(await one.claim(), null);
    assert.equal((await state(exhausted)).status, "FAILED");

    // A confirmed message with a failed DB completion remains leased, then replays the same ID.
    const uncertainId = await insert();
    const sent: string[] = [];
    const uncertainStore = {
      claim: () => one.claim(), failed: one.failed.bind(one),
      published: async () => { throw new Error("simulated completion disconnect"); },
    };
    const uncertain = new OutboxWorker(db, log, async event => { sent.push(event.id); }, { store: uncertainStore, config: settings });
    await uncertain.tick();
    assert.equal((await state(uncertainId)).status, "PROCESSING");
    await expire(uncertainId);
    await new OutboxWorker(db2, log, async event => { sent.push(event.id); }, { store: two, config: settings }).tick();
    assert.deepEqual(sent, [uncertainId, uncertainId]);
    assert.equal((await state(uncertainId)).status, "PUBLISHED");

    // No listener responds to the AMQP handshake: ensure the whole operation is bounded.
    const sockets = new Set<Socket>();
    const blackhole = createServer(socket => { sockets.add(socket); socket.on("error", () => {}); socket.on("close", () => sockets.delete(socket)); });
    await new Promise<void>(resolve => blackhole.listen(0, "127.0.0.1", resolve));
    try {
      const port = (blackhole.address() as { port: number }).port;
      const started = Date.now();
      await assert.rejects(publishOrderEvent(first, { url: `amqp://127.0.0.1:${port}`, timeoutMs: 200 }), /deadline|ETIMEDOUT|aborted/i);
      assert.ok(Date.now() - started < 2000, "Publish must not hang during broker handshake");
    } finally {
      for (const socket of sockets) socket.destroy();
      await new Promise<void>(resolve => blackhole.close(() => resolve()));
    }

    // Use a disposable broker. Never stop the user's actual RabbitMQ container.
    docker("run", "-d", "--pull=never", "--name", brokerName,
      "-p", "127.0.0.1::5672", "-e", "RABBITMQ_DEFAULT_USER=test", "-e", "RABBITMQ_DEFAULT_PASS=test", "rabbitmq:4-management");
    brokerCreated = true;
    const mapping = docker("port", brokerName, "5672/tcp");
    const port = Number(mapping.split(":").at(-1));
    assert.ok(port > 0);
    let brokerUrl = `amqp://test:test@127.0.0.1:${port}?heartbeat=5`;
    const waitBroker = async () => {
      const deadline = Date.now() + 45000;
      while (Date.now() < deadline) {
        // Docker may allocate a new ephemeral host port when the container restarts.
        const currentPort = Number(docker("port", brokerName, "5672/tcp").split(":").at(-1));
        brokerUrl = `amqp://test:test@127.0.0.1:${currentPort}?heartbeat=5`;
        try { const connection = await connect(brokerUrl, { timeout: 500 }); await connection.close(); return; }
        catch { await sleep(250); }
      }
      throw new Error(`Disposable RabbitMQ did not start: ${docker("logs", "--tail", "25", brokerName)}`);
    };
    await waitBroker();
    // Declare a durable queue before the restart to exercise broker persistence.
    const probe = await connect(brokerUrl);
    const channel = await probe.createChannel();
    await channel.assertQueue("test.orders", { durable: true });
    await probe.close();
    docker("stop", "-t", "10", brokerName);
    const outageId = await insert();
    const publish = (event: Parameters<typeof publishOrderEvent>[0]) => publishOrderEvent(event, {
      url: brokerUrl, exchange: "test.events", queue: "test.orders", timeoutMs: 2000,
    });
    const worker = new OutboxWorker(db, log, publish, { store: one, config: settings });
    await worker.tick();
    const failed = await state(outageId);
    assert.equal(failed.status, "PENDING");
    assert.equal(failed.attempts, 1);
    assert.ok(failed.last_error);
    docker("start", brokerName);
    await waitBroker();
    await worker.tick();
    assert.equal((await state(outageId)).status, "PUBLISHED");
    const reader = await connect(brokerUrl);
    try {
      const readChannel = await reader.createChannel();
      const message = await readChannel.get("test.orders", { noAck: true });
      assert.ok(message);
      assert.equal(message.properties.messageId, outageId);
      assert.equal(message.properties.deliveryMode, 2);
      assert.equal(JSON.parse(message.content.toString()).eventId, outageId);
    } finally { await reader.close(); }
  } finally {
    if (brokerCreated) docker("rm", "-f", brokerName);
    await Promise.all([db.$disconnect(), db2.$disconnect()]);
    if (schemaCreated) await admin.$executeRawUnsafe(`DROP SCHEMA "${schema}" CASCADE`);
    await admin.$disconnect();
  }
});
