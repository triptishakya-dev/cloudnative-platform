# RabbitMQ publishing — first milestone

Implemented: durable topic exchange, durable queue, versioned event envelope,
persistent messages, mandatory routing, broker confirms, and existing outbox retries.
The notification consumer and local email delivery are implemented; see notifications.md.

## Start locally (Git Bash, project root)

```bash
docker compose -f infrastructure/docker/docker-compose.yaml up -d postgres rabbitmq
```

Management UI: http://127.0.0.1:15672 (local development user `cloudnative`, password `change-me`).
AMQP listens on 127.0.0.1:5672. Both RabbitMQ ports are bound to loopback.
The existing PostgreSQL volume is preserved. Do not use `down -v` to restart.

If the order service has no `.env`, copy `applications/order-service/.env.example`
to `applications/order-service/.env`. If it already exists, keep its database settings
and add the RABBITMQ_* variables from the example. Exported variables take precedence.
Restart the order service so it loads the new publisher and environment:

```bash
npm --prefix applications/order-service run dev
```

## Verify

```bash
npm --prefix applications/order-service run build
npm --prefix applications/order-service run test:messaging
npm --prefix applications/order-service run test:messaging:integration
```

The integration test creates uniquely named temporary exchange/queue resources,
publishes one synthetic event, checks the payload and persistence, tests an unroutable
routing key, and removes its resources. It does not create orders or consume real events.

Create a NEW order through the existing gateway test flow. After the polling interval,
check `outbox_events`: the new row should be PUBLISHED. In the management UI, queue
`notifications.orders` receives its message; a running worker may consume it immediately. Confirming an order also produces
`order.status_changed`. Queue topology is created on the first publish.

The exchange is `cloudnative.events` (topic), with binding `order.#` to
`notifications.orders`. Messages contain eventId, eventType, eventVersion, occurredAt,
aggregateType, aggregateId, and payload. AMQP messageId equals the outbox event ID.

## Failure behavior and current limits

If publishing fails or is unroutable, the row is retried with exponential backoff;
after OUTBOX_MAX_ATTEMPTS it becomes FAILED. Existing rows marked PUBLISHED by the old
logging stub are not replayed. Test with a new order.

Delivery is at least once: broker confirmation followed by a failed database update
can produce duplicates. The notification consumer deduplicates completed event IDs.
Publishing uses a fresh connection per event with an overall deadline. Atomic claims,
lease-based recovery, ownership fencing, and graceful outbox draining are implemented.
See outbox-reliability.md for migration, settings, tests, and delivery limits. See notifications.md for the separate worker startup and delivery limits.
