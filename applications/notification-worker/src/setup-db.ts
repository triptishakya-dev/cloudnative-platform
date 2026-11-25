import { Client } from "pg";
import { config } from "./config.js";
import { schema } from "./database.js";

const name = decodeURIComponent(new URL(config.databaseUrl).pathname.slice(1));
if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) throw new Error("Invalid database name");
const admin = new Client({ connectionString: config.adminUrl, connectionTimeoutMillis: 5000 });
try {
  await admin.connect();
  const exists = await admin.query("SELECT 1 FROM pg_database WHERE datname = $1", [name]);
  if (!exists.rowCount) await admin.query(`CREATE DATABASE "${name}"`);
} finally { await admin.end(); }
const db = new Client({ connectionString: config.databaseUrl, connectionTimeoutMillis: 5000 });
try {
  await db.connect();
  await db.query(schema);
  console.log("Notification database ready");
} finally { await db.end(); }
