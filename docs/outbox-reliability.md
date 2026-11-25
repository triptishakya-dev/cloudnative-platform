# Outbox recovery and concurrency

## Implemented

- One atomic PostgreSQL claim uses FOR UPDATE SKIP LOCKED and immediately sets a
  unique lease token, deadline, PROCESSING status, and incremented attempt counter.
- Concurrent publishers cannot own the same current lease. Each process claims only
  the event it is about to publish, not a batch that waits while its lease expires.
- Expired PROCESSING events are reclaimable by any publisher. Legacy PROCESSING rows
  without lease information are reclaimable too.
- Every completion or failure update checks the event ID, ownership token, status,
  and unexpired lease. A stale owner cannot overwrite the new owner's result.
- The same event ID is preserved across retries, crashes, and ambiguous confirmations.
- Publisher deadline bounds TCP connection/AMQP handshake, topology, confirmation,
  and connection closing. It aborts the underlying socket on failure or expiry.
- Shutdown stops claiming and awaits the active publish/state update before closing
  Fastify and disconnecting Prisma. Repeated signals do not start overlapping shutdowns.

The lease is not a guarantee against every duplicate. A paused publisher can resume
past lease expiry, or a confirmed publish can be followed by an uncertain DB update.
These cases may republish the same event ID; the notification worker deduplicates
completed event IDs. End-to-end delivery remains at least once.

## Upgrade / startup (Git Bash)

Stop the original order-service terminal with Ctrl+C first. On Windows, an active
Prisma client can lock its DLL and prevent client generation. Do not start duplicates.

```bash
cd ~/Desktop/cloudenativ-platform/applications/order-service
npm run db:migrate
npm run db:generate
npm run build
PORT=3002 CATALOG_SERVICE_URL=http://127.0.0.1:3001 npm run dev
```

The additive migration 20261125123000_outbox_leases adds two nullable columns and one
index; it preserves existing orders and events. Apply it before starting updated workers.
No volume reset or data deletion is required.

## Configuration

| Variable | Default | Meaning |
| --- | --- | --- |
| OUTBOX_POLL_MS | 5000 | Time between polling cycles |
| OUTBOX_BATCH_SIZE | 10 | Maximum events per cycle, claimed individually |
| OUTBOX_MAX_ATTEMPTS | 5 | Total claim attempts, including crashed attempts |
| OUTBOX_LEASE_MS | 120000 | Ownership lifetime, measured by the database clock |
| OUTBOX_PUBLISH_TIMEOUT_MS | 30000 | Whole broker operation deadline |
| OUTBOX_RETRY_BASE_MS | 5000 | Exponential retry base; delay capped at 300000ms |

All values must be positive integers. Lease lifetime must exceed the publish deadline
by at least 5000ms, leaving time for the completion update. Allow your process manager
more than the publish deadline plus database I/O time before forcibly terminating it.

Attempts now count claims, including successful ones, rather than only failed publishes.
Existing PUBLISHED rows retain historical counts. On repeated crashes or failures that
exhaust the configured budget, eligible events become FAILED instead of remaining stuck.
Recovery of an abandoned claim occurs after the lease deadline and a subsequent poll.

## Inspect and recover operational failures

```bash
docker compose -f infrastructure/docker/docker-compose.yaml exec -T postgres psql -U cloudnative -d order_db -c "SELECT id, event_type, status, attempts, lease_expires_at, last_error FROM outbox_events ORDER BY created_at DESC LIMIT 10;"
```

FAILED events need investigation and a deliberate replay after the underlying problem
is fixed. Preserve event IDs when replaying, and do not reset every event or replay
already PUBLISHED records indiscriminately. Existing events marked PUBLISHED by the
old logging stub remain historical and are not automatically replayed.

## Tests

```bash
npm --prefix applications/order-service run test:messaging
npm --prefix applications/order-service run test:outbox:integration
```

The recovery integration test requires local PostgreSQL, Docker Desktop, and the
rabbitmq:4-management image already present. It creates and drops a uniquely named test
schema, and starts/restarts/removes only a uniquely named disposable broker using an
ephemeral loopback port. The real broker, queues, orders, and notification records are
not stopped or purged. It verifies:

- Competing claims yield one owner.
- Expired and legacy claims recover; stale completions/failures are fenced.
- Crashed claims at the attempt limit become FAILED.
- A confirmed publish with a failed DB completion is replayed with its original ID.
- A stalled AMQP handshake is bounded.
- An unavailable real test broker leaves the event retryable; restarting it allows
  the event to reach a durable queue and become PUBLISHED.

Shutdown draining and overlapping polling are checked with controlled asynchronous
unit tests. Crash recovery is exercised by committing and abandoning a database claim,
then expiring its lease, without killing the user's running service.

## Verified in the real local flow

A new gateway order was persisted, published on its first claim, emailed, and recorded
as delivered. Replaying its identical event ID logged result duplicate and kept the
email count at one. Broker restart tests ran against the disposable broker only.

Remaining reliability work includes production queue topology (quorum/stronger dead
lettering), provider-level email idempotency, failure alerts, and delivery-record
retention. Concurrent claims are safe; strict event ordering per order is not guaranteed
across multiple publishers. Consumers must handle ordering explicitly if they need it.
