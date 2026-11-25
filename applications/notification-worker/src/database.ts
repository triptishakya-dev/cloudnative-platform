import { Pool } from "pg";
import type { OrderCreated } from "./events.js";

export const schema = `CREATE TABLE IF NOT EXISTS notification_deliveries (
  event_id UUID PRIMARY KEY,
  order_id UUID NOT NULL,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
)`;

export class DeliveryStore {
  readonly pool: Pool;
  constructor(connectionString: string) {
    this.pool = new Pool({ connectionString, max: 2, connectionTimeoutMillis: 5000, query_timeout: 15000 });
  }
  async ready() { await this.pool.query("SELECT event_id FROM notification_deliveries LIMIT 0"); }
  async deliverOnce(event: OrderCreated, send: () => Promise<void>): Promise<"sent" | "duplicate"> {
    const client = await this.pool.connect();
    // Session lock serializes concurrent copies of this event, including across workers.
    let locked = false;
    let broken = false;
    try {
      await client.query("SELECT pg_advisory_lock(hashtext($1))", [event.eventId]);
      locked = true;
      const found = await client.query("SELECT 1 FROM notification_deliveries WHERE event_id = $1", [event.eventId]);
      if (found.rowCount) return "duplicate";
      await send();
      // SMTP and this record cannot be atomic; crash after SMTP acceptance can duplicate email.
      await client.query("INSERT INTO notification_deliveries(event_id, order_id) VALUES ($1, $2)", [event.eventId, event.payload.orderId]);
      return "sent";
    } finally {
      if (locked) {
        try { await client.query("SELECT pg_advisory_unlock(hashtext($1))", [event.eventId]); }
        catch { broken = true; }
      } else broken = true;
      client.release(broken);
    }
  }
  async close() { await this.pool.end(); }
}
