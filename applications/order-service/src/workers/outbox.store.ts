import { randomUUID } from "node:crypto";
import type { PrismaClient } from "@cloudnative/order-prisma-client";
import type { OutboxMessage } from "../messaging/rabbitmq.js";

export interface ClaimedEvent extends OutboxMessage {
  attempts: number;
  leaseToken: string;
}
export interface OutboxStore {
  claim(): Promise<ClaimedEvent | null>;
  published(event: ClaimedEvent): Promise<boolean>;
  failed(event: ClaimedEvent, error: string): Promise<boolean>;
}
export class PostgresOutboxStore implements OutboxStore {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly options: { leaseMs: number; maxAttempts: number; retryBaseMs: number },
  ) {}
  async claim(): Promise<ClaimedEvent | null> {
    const { leaseMs, maxAttempts } = this.options;
    // Old PROCESSING rows without leases are recoverable too.
    await this.prisma.$executeRaw`
      UPDATE outbox_events
      SET status = 'FAILED', lease_token = NULL, lease_expires_at = NULL,
          last_error = COALESCE(last_error, 'Publish attempt limit exhausted after lease expiry')
      WHERE attempts >= ${maxAttempts}
        AND (status = 'PENDING' OR (status = 'PROCESSING'
          AND (lease_expires_at IS NULL OR lease_expires_at <= clock_timestamp())))
    `;
    const token = randomUUID();
    // One atomic claim; no transaction stays open during broker I/O.
    const events = await this.prisma.$queryRaw<ClaimedEvent[]>`
      WITH candidate AS (
        SELECT id FROM outbox_events
        WHERE attempts < ${maxAttempts}
          AND ((status = 'PENDING' AND available_at <= clock_timestamp())
            OR (status = 'PROCESSING'
              AND (lease_expires_at IS NULL OR lease_expires_at <= clock_timestamp())))
        ORDER BY available_at, created_at, id
        LIMIT 1 FOR UPDATE SKIP LOCKED
      )
      UPDATE outbox_events AS event
      SET status = 'PROCESSING', attempts = event.attempts + 1,
          lease_token = ${token}::uuid,
          lease_expires_at = clock_timestamp() + (${leaseMs} * interval '1 millisecond')
      FROM candidate WHERE event.id = candidate.id
      RETURNING event.id, event.aggregate_type AS "aggregateType",
        event.aggregate_id AS "aggregateId", event.event_type AS "eventType",
        event.event_version AS "eventVersion", event.payload, event.created_at AS "createdAt",
        event.attempts, event.lease_token AS "leaseToken"
    `;
    return events[0] ?? null;
  }
  async published(event: ClaimedEvent) {
    const count = await this.prisma.$executeRaw`
      UPDATE outbox_events SET status = 'PUBLISHED', published_at = clock_timestamp(),
        last_error = NULL, lease_token = NULL, lease_expires_at = NULL
      WHERE id = ${event.id}::uuid AND status = 'PROCESSING'
        AND lease_token = ${event.leaseToken}::uuid AND lease_expires_at > clock_timestamp()
    `;
    return count === 1;
  }
  async failed(event: ClaimedEvent, error: string) {
    const exhausted = event.attempts >= this.options.maxAttempts;
    const delayMs = Math.min(2 ** Math.min(event.attempts, 16) * this.options.retryBaseMs, 300_000);
    const count = await this.prisma.$executeRaw`
      UPDATE outbox_events SET status = ${exhausted ? "FAILED" : "PENDING"}::"OutboxStatus",
        last_error = ${error.slice(0, 2000)}, lease_token = NULL, lease_expires_at = NULL,
        available_at = clock_timestamp() + (${delayMs} * interval '1 millisecond')
      WHERE id = ${event.id}::uuid AND status = 'PROCESSING'
        AND lease_token = ${event.leaseToken}::uuid AND lease_expires_at > clock_timestamp()
    `;
    return count === 1;
  }
}
