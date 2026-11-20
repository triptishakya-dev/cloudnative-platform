import type { PrismaClient } from "@cloudnative/order-prisma-client";
import { OutboxStatus } from "@cloudnative/order-prisma-client";
import type { Logger } from "pino";

const POLL_INTERVAL_MS = Number(process.env.OUTBOX_POLL_MS ?? 5_000);
const BATCH_SIZE = Number(process.env.OUTBOX_BATCH_SIZE ?? 10);
const MAX_ATTEMPTS = Number(process.env.OUTBOX_MAX_ATTEMPTS ?? 5);

/**
 * Transactional Outbox Worker
 *
 * Polls the `outbox_events` table for PENDING events and "publishes" them.
 * Replace the `publish()` stub with your real message broker (e.g. Kafka,
 * RabbitMQ, SNS) — the rest of the retry / failure logic stays the same.
 */
export class OutboxWorker {
  private timer: ReturnType<typeof setInterval> | null = null;
  private running = false;

  constructor(
    private readonly prisma: PrismaClient,
    private readonly log: Logger
  ) {}

  start() {
    this.log.info(`OutboxWorker started (poll every ${POLL_INTERVAL_MS}ms)`);
    this.timer = setInterval(() => this.tick(), POLL_INTERVAL_MS);
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.log.info("OutboxWorker stopped");
  }

  private async tick() {
    if (this.running) return; // skip if previous tick is still running
    this.running = true;

    try {
      // Claim a batch of PENDING events (atomic update to avoid double-processing)
      const events = await this.prisma.$transaction(async (tx) => {
        const batch = await tx.outboxEvent.findMany({
          where: {
            status: OutboxStatus.PENDING,
            attempts: { lt: MAX_ATTEMPTS },
            availableAt: { lte: new Date() },
          },
          orderBy: { createdAt: "asc" },
          take: BATCH_SIZE,
        });

        if (batch.length === 0) return [];

        await tx.outboxEvent.updateMany({
          where: { id: { in: batch.map((e) => e.id) } },
          data: { status: OutboxStatus.PROCESSING },
        });

        return batch;
      });

      // Process each event outside the claim transaction
      for (const event of events) {
        try {
          await this.publish(event);

          await this.prisma.outboxEvent.update({
            where: { id: event.id },
            data: {
              status: OutboxStatus.PUBLISHED,
              publishedAt: new Date(),
            },
          });

          this.log.info({ eventId: event.id, type: event.eventType }, "Event published");
        } catch (err) {
          const nextAttempt = event.attempts + 1;
          const failed = nextAttempt >= MAX_ATTEMPTS;

          // Exponential backoff: retry after 2^attempts * 5s
          const retryDelayMs = Math.pow(2, nextAttempt) * 5_000;

          await this.prisma.outboxEvent.update({
            where: { id: event.id },
            data: {
              status: failed ? OutboxStatus.FAILED : OutboxStatus.PENDING,
              attempts: nextAttempt,
              lastError: (err as Error).message,
              availableAt: failed ? undefined : new Date(Date.now() + retryDelayMs),
            },
          });

          this.log.error({ eventId: event.id, err, attempt: nextAttempt }, "Event publish failed");
        }
      }
    } catch (err) {
      this.log.error({ err }, "OutboxWorker tick error");
    } finally {
      this.running = false;
    }
  }

  /**
   * Replace this stub with your actual message broker integration.
   * e.g. Kafka producer, RabbitMQ publish, AWS SNS publish, etc.
   */
  private async publish(event: { eventType: string; payload: unknown }) {
    // TODO: integrate with your broker
    // Example: await kafkaProducer.send({ topic: event.eventType, messages: [{ value: JSON.stringify(event.payload) }] });
    this.log.debug({ eventType: event.eventType }, "[stub] publishing event");
  }
}
