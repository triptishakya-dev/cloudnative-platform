import { connect, type ConfirmChannel } from "amqplib";

export interface OutboxMessage {
  id: string;
  eventType: string;
  eventVersion: number;
  aggregateType: string;
  aggregateId: string;
  createdAt: Date;
  payload: unknown;
}

export function eventEnvelope(event: OutboxMessage) {
  return {
    eventId: event.id,
    eventType: event.eventType,
    eventVersion: event.eventVersion,
    occurredAt: event.createdAt.toISOString(),
    aggregateType: event.aggregateType,
    aggregateId: event.aggregateId,
    payload: event.payload,
  };
}

// One outstanding message per channel makes mandatory returns unambiguous.
export function confirmPublish(channel: ConfirmChannel, exchange: string, event: OutboxMessage, timeoutMs = 10_000): Promise<void> {
  return new Promise((resolve, reject) => {
    let returned = false;
    const cleanup = () => {
      clearTimeout(timer);
      channel.removeListener("return", onReturn);
      channel.removeListener("close", onClose);
      channel.removeListener("error", onError);
    };
    const finish = (error?: Error | null) => {
      cleanup();
      if (error) reject(error);
      else if (returned) reject(new Error("RabbitMQ returned an unroutable event"));
      else resolve();
    };
    const onReturn = () => { returned = true; };
    const onClose = () => finish(new Error("RabbitMQ channel closed before confirmation"));
    const onError = (error: Error) => finish(error);
    const timer = setTimeout(() => finish(new Error("RabbitMQ confirmation timed out")), timeoutMs);
    channel.on("return", onReturn);
    channel.once("close", onClose);
    channel.once("error", onError);
    try {
      channel.publish(exchange, event.eventType, Buffer.from(JSON.stringify(eventEnvelope(event))), {
        persistent: true,
        mandatory: true,
        contentType: "application/json",
        messageId: event.id,
        type: event.eventType,
        timestamp: Math.floor(event.createdAt.getTime() / 1000),
      }, finish);
    } catch (error) {
      finish(error instanceof Error ? error : new Error(String(error)));
    }
  });
}

export interface PublishOptions {
  timeoutMs?: number;
  url?: string;
  exchange?: string;
  queue?: string;
}
export async function publishOrderEvent(event: OutboxMessage, options: PublishOptions = {}): Promise<void> {
  const timeoutMs = options.timeoutMs ?? 30_000;
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs <= 0) throw new Error("Invalid publish timeout");
  const exchange = options.exchange ?? process.env.RABBITMQ_EXCHANGE ?? "cloudnative.events";
  const queue = options.queue ?? process.env.RABBITMQ_NOTIFICATION_QUEUE ?? "notifications.orders";
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  // amqplib forwards socket options to net/tls.connect. The signal bounds the
  // entire operation, including handshake, topology, confirmation, and closing.
  const aborted = new Promise<never>((_, reject) => {
    controller.signal.addEventListener("abort", () => reject(new Error("RabbitMQ publish deadline exceeded")), { once: true });
  });
  const operation = async () => {
    const socketOptions = { timeout: Math.min(10_000, timeoutMs), signal: controller.signal };
    const connection = await connect(options.url ?? process.env.RABBITMQ_URL ?? "amqp://cloudnative:change-me@127.0.0.1:5672?heartbeat=10", socketOptions);
    connection.on("error", () => {});
    const channel = await connection.createConfirmChannel();
    channel.on("error", () => {});
    await channel.assertExchange(exchange, "topic", { durable: true });
    await channel.assertQueue(queue, { durable: true });
    await channel.bindQueue(queue, exchange, "order.#");
    await confirmPublish(channel, exchange, event, Math.min(10_000, timeoutMs));
    await connection.close();
  };
  try { await Promise.race([operation(), aborted]); }
  finally {
    clearTimeout(timer);
    // Destroy the socket on failed or timed-out operations. Late confirms cannot
    // update an outbox row whose lease is owned by another worker.
    controller.abort();
  }
}
