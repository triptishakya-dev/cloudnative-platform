function positiveInteger(name: string, fallback: number) {
  const value = Number(process.env[name] ?? fallback);
  if (!Number.isSafeInteger(value) || value < 1) throw new Error(`${name} must be a positive integer`);
  return value;
}
export function outboxConfig() {
  const options = {
    pollMs: positiveInteger("OUTBOX_POLL_MS", 5000),
    batchSize: positiveInteger("OUTBOX_BATCH_SIZE", 10),
    maxAttempts: positiveInteger("OUTBOX_MAX_ATTEMPTS", 5),
    leaseMs: positiveInteger("OUTBOX_LEASE_MS", 120_000),
    publishTimeoutMs: positiveInteger("OUTBOX_PUBLISH_TIMEOUT_MS", 30_000),
    retryBaseMs: positiveInteger("OUTBOX_RETRY_BASE_MS", 5000),
  };
  if (options.leaseMs < options.publishTimeoutMs + 5000) {
    throw new Error("OUTBOX_LEASE_MS must exceed OUTBOX_PUBLISH_TIMEOUT_MS by at least 5000ms");
  }
  return options;
}
