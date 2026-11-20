import { buildApp } from "../app.js";
import type { PrismaClient } from "@cloudnative/order-prisma-client";

// ── Minimal test suite using Node.js built-in test runner ────────────────────
// Run with: node --experimental-test-snapshots --test tests/orders.test.ts
// Or via tsx: tsx --test tests/orders.test.ts

import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";

describe("Order Routes", () => {
  const app = buildApp();

  before(async () => {
    await app.ready();
  });

  after(async () => {
    await app.close();
  });

  describe("GET /health", () => {
    it("returns 200 with service name", async () => {
      const res = await app.inject({ method: "GET", url: "/health" });
      assert.equal(res.statusCode, 200);
      const body = res.json<{ status: string; service: string }>();
      assert.equal(body.status, "ok");
      assert.equal(body.service, "order-service");
    });
  });

  describe("POST /api/v1/orders", () => {
    it("returns 401 without auth token", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/v1/orders",
        payload: {
          idempotencyKey: "test-key-1",
          items: [{ productId: "00000000-0000-0000-0000-000000000001", sku: "SKU-001", quantity: 1 }],
        },
      });
      assert.equal(res.statusCode, 401);
    });

    it("returns 400 with missing idempotencyKey", async () => {
      const fakeToken = `header.${Buffer.from(
        JSON.stringify({ sub: "user-1", email: "test@example.com", role: "customer", exp: Math.floor(Date.now() / 1000) + 3600 })
      ).toString("base64url")}.sig`;

      const res = await app.inject({
        method: "POST",
        url: "/api/v1/orders",
        headers: { authorization: `Bearer ${fakeToken}` },
        payload: {
          // missing idempotencyKey
          items: [{ productId: "00000000-0000-0000-0000-000000000001", sku: "SKU-001", quantity: 1 }],
        },
      });
      assert.equal(res.statusCode, 400);
    });
  });

  describe("GET /api/v1/orders", () => {
    it("returns 401 without auth", async () => {
      const res = await app.inject({ method: "GET", url: "/api/v1/orders" });
      assert.equal(res.statusCode, 401);
    });
  });
});
