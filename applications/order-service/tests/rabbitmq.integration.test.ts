import "../src/env.js";
import { randomUUID } from "node:crypto";
import { it } from "node:test";
import assert from "node:assert/strict";
import { connect } from "amqplib";
import { publishOrderEvent, confirmPublish, eventEnvelope } from "../src/messaging/rabbitmq.js";

it("delivers confirmed events to a durable queue and rejects unroutable events", async () => {
  const suffix = randomUUID();
  process.env.RABBITMQ_EXCHANGE = `test.events.${suffix}`;
  process.env.RABBITMQ_NOTIFICATION_QUEUE = `test.notifications.${suffix}`;
  const event = { id: randomUUID(), eventType: "order.created", eventVersion: 1,
    aggregateType: "Order", aggregateId: randomUUID(), createdAt: new Date(), payload: { test: true } };
  await publishOrderEvent(event);
  const connection = await connect(process.env.RABBITMQ_URL ?? "amqp://cloudnative:change-me@127.0.0.1:5672");
  try {
    const channel = await connection.createConfirmChannel();
    const message = await channel.get(process.env.RABBITMQ_NOTIFICATION_QUEUE, { noAck: false });
    assert.ok(message);
    assert.equal(message.properties.deliveryMode, 2);
    assert.equal(message.properties.messageId, event.id);
    assert.deepEqual(JSON.parse(message.content.toString()), eventEnvelope(event));
    channel.ack(message);
    await assert.rejects(confirmPublish(channel, process.env.RABBITMQ_EXCHANGE, { ...event, eventType: "unbound.event" }), /unroutable/);
    await channel.deleteQueue(process.env.RABBITMQ_NOTIFICATION_QUEUE);
    await channel.deleteExchange(process.env.RABBITMQ_EXCHANGE);
  } finally {
    await connection.close();
  }
});
