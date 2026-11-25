# Local order notifications

The worker consumes order.created, sends an order-received email to Mailpit, and
records the completed event ID in its own PostgreSQL database. Supported order
status events are acknowledged without sending email. Mailpit captures emails locally;
they are not delivered to real inboxes.

## Startup (Git Bash, project root)

```bash
docker compose -f infrastructure/docker/docker-compose.yaml up -d postgres rabbitmq mailpit
npm --prefix applications/notification-worker install
npm --prefix applications/notification-worker run db:setup
npm --prefix applications/notification-worker run build
npm --prefix applications/notification-worker start
```

For development use `npm --prefix applications/notification-worker run dev` instead.
Use one startup command and keep its terminal open. Stop with Ctrl+C.
Defaults match Compose. For overrides, copy the worker's .env.example to .env and
adjust the values. Existing exported environment variables take precedence.

db:setup is safe to rerun and supports existing PostgreSQL volumes: it creates only
the notification database/table if absent. DATABASE_ADMIN_URL is used only during setup
and requires CREATE DATABASE privilege. The runtime uses DATABASE_URL, not the order DB.
Fresh PostgreSQL volumes also get notification_db from init-db.sql. Never delete volumes
to apply this change.

Mailpit UI: http://127.0.0.1:8025. SMTP: 127.0.0.1:1025.
RabbitMQ UI: http://127.0.0.1:15672 (local cloudnative / change-me).
Mailpit ports are bound to loopback; captured messages persist in mailpit_data.

## Keep service addresses explicit

- Gateway: 3100, upstreams http://127.0.0.1:3001 and http://127.0.0.1:3002.
- Catalog: 3001.
- Order: 3002, CATALOG_SERVICE_URL=http://127.0.0.1:3001.
- Frontend: 3003 (`npm --prefix applications/frontend run dev -- --port 3003`).
- Worker: no HTTP port; outbound connections to RabbitMQ, PostgreSQL, and SMTP.

Avoid localhost for these calls when another application owns an IPv6 listener on the
same port. Avoid starting duplicate gateway/order processes.

## Verify

1. Check gateway /ready reports both services up.
2. Create a new order with a valid customer JWT and unique idempotencyKey.
3. Order-service logs Event published after the outbox polling interval.
4. Worker logs Notification processed with result sent and the event ID.
5. Open Mailpit and check the order ID and total in the Order received email.
6. notifications.orders should have a consumer and normally zero Ready messages.

```bash
docker compose -f infrastructure/docker/docker-compose.yaml exec -T rabbitmq rabbitmqctl list_queues name messages_ready messages_unacknowledged consumers

docker compose -f infrastructure/docker/docker-compose.yaml exec -T postgres psql -U cloudnative -d notification_db -c "SELECT event_id, order_id, sent_at FROM notification_deliveries ORDER BY sent_at DESC LIMIT 5;"
```

Old events marked PUBLISHED by the logging stub are not replayed. Pending messages in
the real queue are processed when the worker starts.

## Delivery behavior

- Manual acknowledgements and prefetch=1.
- SMTP acceptance, then completion record, then acknowledgement.
- Completed event IDs are acknowledged without resending. PostgreSQL advisory locks
  serialize concurrent copies across workers.
- Temporary failures are persistently republished to notifications.orders.retry, with
  broker confirmation before acknowledgement of the original. Queue TTL sends them
  back to notifications.orders after RETRY_DELAY_MS (default 10000).
- MAX_RETRIES defaults to 3: one initial attempt plus three retries.
- Invalid events and exhausted retries are confirmed into notifications.orders.dead
  before acknowledging the original.
- If the handoff fails, the original remains unacknowledged and the connection closes
  for redelivery. Worker reconnects automatically.
- Shutdown cancels consumption and allows up to 20 seconds for current work before
  closing the broker connection. Unacknowledged work is requeued.

Inspect dead messages without purging the queue. Diagnose the error header and payload
before planning a replay. Queue arguments are immutable: changing RETRY_DELAY_MS after
creation requires an intentional retry-queue migration.

## Tests

```bash
npm --prefix applications/notification-worker run build
npm --prefix applications/notification-worker test
npm --prefix applications/notification-worker run test:integration
```

Integration tests require db:setup, PostgreSQL, RabbitMQ, and Mailpit. They use unique
broker resources, clean up their delivery rows, and leave identifiable integration
emails in Mailpit. They do not consume real order messages or purge inboxes.
Coverage: validation, acknowledgement ordering, duplicate suppression, successful SMTP,
retry recovery, malformed messages, exhausted retries, and delivery records.

## Reliability limits

SMTP and the completion record are not atomic. A crash after SMTP acceptance but
before saving the record can still duplicate an email. Stable Message-ID aids correlation
but is not an exactly-once guarantee; a provider with an idempotent send API would be
needed for stronger protection.

Local queues are classic queues on one broker. Explicit republishing uses confirmations;
the internal TTL/dead-letter hop has classic queue broker-failure limits. Quorum queues
and at-least-once dead-lettering need a planned topology migration before production.
The order-service outbox now supports atomic concurrent claims, lease recovery, and
shutdown draining; see outbox-reliability.md for setup and limits.

Production also needs versioned schema migrations, separate least-privilege roles,
secrets management, and a delivery-record retention policy that respects replay windows.
