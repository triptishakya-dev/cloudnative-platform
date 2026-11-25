import type { PrismaClient } from "@cloudnative/order-prisma-client";
import type { FastifyBaseLogger } from "fastify";
import { publishOrderEvent } from "../messaging/rabbitmq.js";
import { PostgresOutboxStore, type OutboxStore } from "./outbox.store.js";
import { outboxConfig } from "./outbox.config.js";

export class OutboxWorker {
  private timer: ReturnType<typeof setInterval> | undefined;
  private inFlight: Promise<void> | undefined;
  private stopping = false;
  private readonly store: OutboxStore;
  private readonly options: ReturnType<typeof outboxConfig>;
  constructor(
    prisma: PrismaClient,
    private readonly log: FastifyBaseLogger,
    private readonly publish: typeof publishOrderEvent = publishOrderEvent,
    options: { store?: OutboxStore; config?: ReturnType<typeof outboxConfig> } = {},
  ) {
    this.options = options.config ?? outboxConfig();
    this.store = options.store ?? new PostgresOutboxStore(prisma, this.options);
  }
  start() {
    if (this.timer || this.stopping) return;
    this.log.info(`OutboxWorker started (poll every ${this.options.pollMs}ms)`);
    this.timer = setInterval(() => { void this.tick(); }, this.options.pollMs);
    void this.tick();
  }
  async stop() {
    this.stopping = true;
    clearInterval(this.timer);
    this.timer = undefined;
    await this.inFlight;
    this.log.info("OutboxWorker drained and stopped");
  }
  // Exposed for deterministic integration checks and operational polling.
  tick(): Promise<void> {
    if (this.stopping) return Promise.resolve();
    if (this.inFlight) return this.inFlight;
    this.inFlight = this.runBatch().catch(err => {
      this.log.error({ err }, "Outbox polling failed; expired leases recover on a later poll");
    }).finally(() => { this.inFlight = undefined; });
    return this.inFlight;
  }
  private async runBatch() {
    for (let index = 0; index < this.options.batchSize && !this.stopping; index++) {
      // Claim just the next event: no waiting batch whose leases could expire.
      const event = await this.store.claim();
      if (!event) return;
      try {
        await this.publish(event, { timeoutMs: this.options.publishTimeoutMs });
      } catch (err) {
        const recorded = await this.store.failed(event, err instanceof Error ? err.message : String(err));
        this.log.error({ eventId: event.id, attempt: event.attempts, recorded, err }, "Event publish failed");
        continue;
      }
      // DB completion failures are not broker failures. An uncertain completion
      // is recovered after expiry and replayed with the same stable event ID.
      const recorded = await this.store.published(event);
      if (recorded) this.log.info({ eventId: event.id, type: event.eventType }, "Event published");
      else this.log.warn({ eventId: event.id }, "Ownership expired; publish result not overwritten");
    }
  }
}
