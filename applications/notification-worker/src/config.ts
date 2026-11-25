import { config as dotenv } from "dotenv";

dotenv({ path: new URL("../.env", import.meta.url), quiet: true });

function integer(name: string, fallback: number, min = 1) {
  const value = Number(process.env[name] ?? fallback);
  if (!Number.isSafeInteger(value) || value < min) throw new Error(`${name} must be an integer >= ${min}`);
  return value;
}
function url(name: string, fallback: string, protocols: string[]) {
  const value = process.env[name] ?? fallback;
  if (!protocols.includes(new URL(value).protocol)) throw new Error(`Invalid ${name} protocol`);
  return value;
}
function bool(name: string, fallback: string) {
  const value = process.env[name] ?? fallback;
  if (!["true", "false"].includes(value)) throw new Error(`${name} must be true or false`);
  return value === "true";
}
export const config = {
  databaseUrl: url("DATABASE_URL", "postgresql://cloudnative:change-me@127.0.0.1:5432/notification_db", ["postgres:", "postgresql:"]),
  adminUrl: url("DATABASE_ADMIN_URL", "postgresql://cloudnative:change-me@127.0.0.1:5432/cloudnative", ["postgres:", "postgresql:"]),
  rabbitUrl: url("RABBITMQ_URL", "amqp://cloudnative:change-me@127.0.0.1:5672?heartbeat=10", ["amqp:", "amqps:"]),
  exchange: process.env.RABBITMQ_EXCHANGE ?? "cloudnative.events",
  queue: process.env.RABBITMQ_NOTIFICATION_QUEUE ?? "notifications.orders",
  smtpHost: process.env.SMTP_HOST ?? "127.0.0.1",
  smtpPort: integer("SMTP_PORT", 1025),
  smtpSecure: bool("SMTP_SECURE", "false"),
  smtpUser: process.env.SMTP_USER,
  smtpPass: process.env.SMTP_PASS,
  emailFrom: process.env.EMAIL_FROM ?? "orders@cloudnative.local",
  retryDelayMs: integer("RETRY_DELAY_MS", 10_000),
  maxRetries: integer("MAX_RETRIES", 3, 0),
  reconnectDelayMs: integer("RECONNECT_DELAY_MS", 3000),
  logLevel: process.env.LOG_LEVEL ?? "info",
};
