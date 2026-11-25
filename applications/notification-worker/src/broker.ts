import { connect, type ConfirmChannel, type ConsumeMessage, type Options } from "amqplib";
import type { Logger } from "pino";
import { config } from "./config.js";
import { processMessage } from "./processor.js";
import type { OrderCreated } from "./events.js";

// This channel is only used serially (consumer prefetch=1).
export function publishConfirmed(channel: ConfirmChannel, queue: string, message: ConsumeMessage, headers: Record<string, unknown>) {
  return new Promise<void>((resolve, reject) => {
    let returned = false;
    const finish = (error?: Error | null) => {
      clearTimeout(timer);
      channel.off("return", onReturn);
      channel.off("close", onClose);
      channel.off("error", onError);
      if (error) reject(error);
      else if (returned) reject(new Error("Notification handoff was unroutable"));
      else resolve();
    };
    const onReturn = () => { returned = true; };
    const onClose = () => finish(new Error("Channel closed before handoff confirmation"));
    const onError = (error: Error) => finish(error);
    const timer = setTimeout(() => finish(new Error("Notification handoff confirmation timed out")), 10_000);
    channel.on("return", onReturn);
    channel.once("close", onClose);
    channel.once("error", onError);
    const properties: Options.Publish = {
      persistent: true, mandatory: true,
      contentType: message.properties.contentType ?? "application/json",
      messageId: message.properties.messageId,
      type: message.properties.type,
      timestamp: message.properties.timestamp,
      headers,
    };
    try { channel.publish("", queue, message.content, properties, finish); }
    catch (error) { finish(error instanceof Error ? error : new Error(String(error))); }
  });
}

export async function setupTopology(channel: ConfirmChannel) {
  await channel.assertExchange(config.exchange, "topic", { durable: true });
  // Keep identical arguments to the queue already created by order-service.
  await channel.assertQueue(config.queue, { durable: true });
  await channel.bindQueue(config.queue, config.exchange, "order.#");
  await channel.assertQueue(`${config.queue}.dead`, { durable: true });
  await channel.assertQueue(`${config.queue}.retry`, {
    durable: true,
    arguments: {
      "x-message-ttl": config.retryDelayMs,
      "x-dead-letter-exchange": "",
      "x-dead-letter-routing-key": config.queue,
    },
  });
}

export async function runWorker(log: Logger, deliver: (event: OrderCreated) => Promise<"sent" | "duplicate">, signal: AbortSignal) {
  while (!signal.aborted) {
    let connection: Awaited<ReturnType<typeof connect>> | undefined;
    let active: Promise<void> | undefined;
    let abort: (() => void) | undefined;
    try {
      connection = await connect(config.rabbitUrl, { timeout: 5000 });
      connection.on("error", error => log.warn({ message: error.message }, "RabbitMQ connection error"));
      const current = connection;
      let closeSession!: () => void;
      const closed = new Promise<void>(resolve => { closeSession = resolve; });
      connection.once("close", closeSession);
      const channel = await connection.createConfirmChannel();
      channel.on("error", error => log.warn({ message: error.message }, "RabbitMQ channel error"));
      channel.once("close", closeSession);
      let topologyTimer: ReturnType<typeof setTimeout> | undefined;
      try {
        await Promise.race([
          setupTopology(channel),
          new Promise<never>((_, reject) => { topologyTimer = setTimeout(() => reject(new Error("RabbitMQ topology setup timed out")), 10_000); }),
        ]);
      } finally { clearTimeout(topologyTimer); }
      await channel.prefetch(1);
      const { consumerTag } = await channel.consume(config.queue, message => {
        if (!message) { closeSession(); return; }
        active = (async () => {
          const headers = message.properties.headers ?? {};
          const result = await processMessage({ content: message.content, headers }, {
            maxRetries: config.maxRetries,
            deliver,
            retry: (attempt, reason) => publishConfirmed(channel, `${config.queue}.retry`, message, {
              ...headers, "x-notification-attempt": attempt, "x-notification-error": reason,
            }),
            deadLetter: reason => publishConfirmed(channel, `${config.queue}.dead`, message, {
              ...headers, "x-notification-error": reason,
            }),
            ack: () => channel.ack(message),
          });
          log.info({ eventId: message.properties.messageId, result }, "Notification processed");
        })().catch(error => {
          log.error({ message: error instanceof Error ? error.message : String(error) }, "Notification handoff failed; reconnecting without acknowledging");
          // Closing requeues the unacknowledged original if retry/dead-letter publishing failed.
          closeSession();
        });
      }, { noAck: false });
      abort = closeSession;
      signal.addEventListener("abort", abort, { once: true });
      if (signal.aborted) closeSession();
      log.info({ queue: config.queue }, "Notification worker consuming");
      await closed;
      await channel.cancel(consumerTag).catch(() => {});
      let drainTimer: ReturnType<typeof setTimeout> | undefined;
      try {
        await Promise.race([active, new Promise<void>(resolve => { drainTimer = setTimeout(resolve, 20_000); })]);
      } finally { clearTimeout(drainTimer); }
      await current.close().catch(() => {});
    } catch (error) {
      log.warn({ message: error instanceof Error ? error.message : String(error) }, "Notification worker disconnected");
    } finally {
      if (abort) signal.removeEventListener("abort", abort);
      await connection?.close().catch(() => {});
    }
    if (!signal.aborted) {
      await new Promise<void>(resolve => {
        const done = () => { clearTimeout(timer); signal.removeEventListener("abort", done); resolve(); };
        const timer = setTimeout(done, config.reconnectDelayMs);
        signal.addEventListener("abort", done, { once: true });
        if (signal.aborted) done();
      });
    }
  }
}
