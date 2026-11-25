# Notification milestone implementation plan

- [x] Add a local SMTP catcher (Mailpit) and a separate notification database.
- [x] Build a TypeScript worker with validated environment settings and event validation.
- [x] Consume the existing durable `notifications.orders` queue using manual acknowledgements.
- [x] Send plain-text order-received emails and record completed event IDs in PostgreSQL.
- [x] Add bounded delayed retries and confirmed dead-letter publishing. Acknowledge originals only after a successful handoff.
- [x] Reconnect after broker failures and drain in-flight work during shutdown.
- [x] Test event validation, acknowledgements, duplicates, retries, dead letters, and a real RabbitMQ-to-Mailpit flow.
- [x] Document startup, verification, and operational limits.

Acceptance: a new order produces an email in Mailpit; replaying a completed event produces no second email; malformed events reach a dead-letter queue; transient SMTP failures retry and recover.

Delivery is at least once. SMTP acceptance and the database completion record cannot be committed atomically: a crash between them can still duplicate email. A stable Message-ID helps correlation but is not an exactly-once guarantee.

Verified: build, 10 unit tests, live isolated integration test, and a new real gateway order delivered to Mailpit. See notifications.md for startup and reliability limits. Outbox recovery and a disposable-broker restart test are now verified; see outbox-reliability.md.
