import { config as loadEnv } from "dotenv";

loadEnv({ path: new URL("../.env", import.meta.url), quiet: true });

// ─────────────────────────────────────────────────────────────────────────────
// Centralised, validated configuration for the API Gateway.
// All env access lives here — nowhere else in the codebase reads process.env.
// ─────────────────────────────────────────────────────────────────────────────

function require(name: string): string {
  const val = process.env[name];
  if (!val) throw new Error(`Missing required env variable: ${name}`);
  return val;
}

function optional(name: string, fallback: string): string {
  return process.env[name] ?? fallback;
}

function optionalNumber(name: string, fallback: number): number {
  const val = process.env[name];
  if (!val) return fallback;
  const n = Number(val);
  if (isNaN(n)) throw new Error(`Env variable ${name} must be a number, got "${val}"`);
  return n;
}

export const config = {
  NODE_ENV: optional("NODE_ENV", "development"),
  HOST:     optional("HOST", "0.0.0.0"),
  PORT:     optionalNumber("PORT", 3000),

  // Upstream services
  CATALOG_SERVICE_URL: optional("CATALOG_SERVICE_URL", "http://localhost:3001"),
  ORDER_SERVICE_URL:   optional("ORDER_SERVICE_URL",   "http://localhost:3002"),

  // Auth
  JWT_SECRET:     optional("JWT_SECRET", "change-me-in-production"),
  JWT_EXPIRES_IN: optional("JWT_EXPIRES_IN", "15m"),

  // Rate limiting
  RATE_LIMIT_MAX:        optionalNumber("RATE_LIMIT_MAX", 100),
  RATE_LIMIT_WINDOW_MS:  optionalNumber("RATE_LIMIT_WINDOW_MS", 60_000),

  // Logging
  LOG_LEVEL:  optional("LOG_LEVEL",  "info"),
  LOG_FORMAT: optional("LOG_FORMAT", "pretty"),

  // CORS
  CORS_ORIGINS: optional("CORS_ORIGINS", "http://localhost:3000"),

  // Proxy timeout (ms)
  PROXY_TIMEOUT_MS: optionalNumber("PROXY_TIMEOUT_MS", 30_000),
} as const;

export type Config = typeof config;
