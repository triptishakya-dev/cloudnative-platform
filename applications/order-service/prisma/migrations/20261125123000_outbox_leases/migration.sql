-- Additive migration. Legacy PROCESSING rows without leases can be reclaimed.
ALTER TABLE "outbox_events"
  ADD COLUMN "lease_token" UUID,
  ADD COLUMN "lease_expires_at" TIMESTAMPTZ(3);
CREATE INDEX "outbox_events_status_lease_expires_at_idx"
  ON "outbox_events"("status", "lease_expires_at");
