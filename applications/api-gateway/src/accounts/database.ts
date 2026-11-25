import { Pool } from "pg";
import "../config.js";
export const accountSchema = `CREATE TABLE IF NOT EXISTS accounts (
 id UUID PRIMARY KEY, email VARCHAR(320) UNIQUE NOT NULL,
 password_hash TEXT NOT NULL, role TEXT NOT NULL CHECK(role IN ('customer','admin')),
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
)`;
export function accountsPool() { return new Pool({connectionString: process.env.AUTH_DATABASE_URL ?? "postgresql://cloudnative:change-me@127.0.0.1:5432/auth_db", max:5, connectionTimeoutMillis:5000, query_timeout:5000}); }

