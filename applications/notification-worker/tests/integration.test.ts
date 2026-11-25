import { randomUUID } from "node:crypto";
import assert from "node:assert/strict";
import { it } from "node:test";
import { connect, type ConsumeMessage } from "amqplib";
import { pino } from "pino";

// Unique broker resources avoid consuming or changing real order messages.
const suffix = randomUUID();
process.env.RABBITMQ_EXCHANGE = `test.notifications.${suffix}`;
process.env.RABBITMQ_NOTIFICATION_QUEUE = `test.orders.${suffix}`;
process.env.RETRY_DELAY_MS = "200";
process.env.MAX_RETRIES = "2";
process.env.RECONNECT_DELAY_MS = "100";
const { config } = await import("../src/config.js");
const { runWorker, publishConfirmed, setupTopology } = await import("../src/broker.js");
const { DeliveryStore } = await import("../src/database.js");
const { createMailer } = await import("../src/email.js");

async function until(check: () => Promise<boolean>, description: string) {
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    if (await check()) return;
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error(`Timed out: ${description}`);
}
function event() {
  const id = randomUUID();
  return { eventId: randomUUID(), eventType: "order.created", eventVersion: 1,
    aggregateType: "Order", aggregateId: id, occurredAt: new Date().toISOString(),
    payload: { orderId: id, customerEmail: "integration@example.com", totalAmount: "1500", currency: "INR" } };
}

it("sends SMTP email, suppresses duplicate events, retries, and dead-letters poison/exhausted messages", { timeout: 60_000 }, async () => {
  const store = new DeliveryStore(config.databaseUrl);
  const mailer = createMailer();
  const connection = await connect(config.rabbitUrl);
  const channel = await connection.createConfirmChannel();
  const controller = new AbortController();
  const normal = event();
  const transient = event();
  const permanent = event();
  const attempts = new Map<string, number>();
  let duplicates = 0;
  let worker: Promise<void> | undefined;
  const mailCount = async (orderId: string) => {
    const response = await fetch("http://127.0.0.1:8025/api/v1/messages");
    assert.equal(response.status, 200);
    const body = await response.json() as { messages: { Subject: string }[] };
    return body.messages.filter(message => message.Subject.includes(orderId)).length;
  };
  try {
    await store.ready();
    await setupTopology(channel);
    worker = runWorker(pino({ level: "silent" }), async message => {
      const attempt = (attempts.get(message.eventId) ?? 0) + 1;
      attempts.set(message.eventId, attempt);
      if (message.eventId === permanent.eventId || (message.eventId === transient.eventId && attempt === 1)) {
        throw new Error("Simulated temporary SMTP failure");
      }
      const result = await store.deliverOnce(message, () => mailer.send(message));
      if (result === "duplicate") duplicates++;
      return result;
    }, controller.signal);
    await until(async () => (await channel.checkQueue(config.queue)).consumerCount === 1, "consumer startup");
    const send = async (value: unknown, id = randomUUID()) => {
      const message = { content: Buffer.from(JSON.stringify(value)), properties: { messageId: id, contentType: "application/json" } } as ConsumeMessage;
      await publishConfirmed(channel, config.queue, message, {});
    };
    await send(normal, normal.eventId);
    await until(async () => (await mailCount(normal.aggregateId)) === 1, "first email");
    await send(normal, normal.eventId);
    await until(async () => duplicates === 1, "duplicate suppression");
    assert.equal(await mailCount(normal.aggregateId), 1);
    // Concurrent replay exercises the database lock, independently of consumer prefetch.
    let extraSends = 0;
    await Promise.all([1, 2].map(() => store.deliverOnce(normal, async () => { extraSends++; })));
    assert.equal(extraSends, 0);

    await send(transient, transient.eventId);
    await until(async () => (await mailCount(transient.aggregateId)) === 1, "delayed retry recovery");
    assert.equal(attempts.get(transient.eventId), 2);
    await send(permanent, permanent.eventId);
    await send({ bad: true });
    await until(async () => (await channel.checkQueue(`${config.queue}.dead`)).messageCount === 2, "dead-letter queue");
    assert.equal(attempts.get(permanent.eventId), 3);
    assert.equal(await mailCount(permanent.aggregateId), 0);
    const rows = await store.pool.query("SELECT event_id FROM notification_deliveries WHERE event_id = ANY($1::uuid[])", [[normal.eventId, transient.eventId, permanent.eventId]]);
    assert.equal(rows.rowCount, 2);
  } finally {
    controller.abort();
    await worker;
    for (const name of [config.queue, `${config.queue}.retry`, `${config.queue}.dead`]) await channel.deleteQueue(name).catch(() => {});
    await channel.deleteExchange(config.exchange).catch(() => {});
    await connection.close();
    await store.pool.query("DELETE FROM notification_deliveries WHERE event_id = ANY($1::uuid[])", [[normal.eventId, transient.eventId, permanent.eventId]]);
    await store.close();
    mailer.close();
  }
});
