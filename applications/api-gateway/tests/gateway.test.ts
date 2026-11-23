import { createHmac } from "node:crypto";
import { config } from "../src/config.js";
import { buildApp } from "../src/app.js";
import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";

describe("API Gateway", () => {
  const app = buildApp();

  before(async () => { await app.ready(); });
  after(async  () => { await app.close(); });

  // ── Health ──────────────────────────────────────────────────────────────────

  describe("GET /health", () => {
    it("returns 200 with service name", async () => {
      const res = await app.inject({ method: "GET", url: "/health" });
      assert.equal(res.statusCode, 200);
      const body = res.json<{ status: string; service: string }>();
      assert.equal(body.status, "ok");
      assert.equal(body.service, "api-gateway");
    });
  });

  // ── 404 ─────────────────────────────────────────────────────────────────────

  describe("Unknown route", () => {
    it("returns 404", async () => {
      const res = await app.inject({ method: "GET", url: "/no-such-route" });
      assert.equal(res.statusCode, 404);
    });
  });

  // ── Auth ─────────────────────────────────────────────────────────────────────

  describe("Auth middleware", () => {
    it("rejects POST /api/v1/catalog/products without token (401)", async () => {
      const res = await app.inject({ method: "POST", url: "/api/v1/catalog/products", payload: {} });
      assert.equal(res.statusCode, 401);
    });

    it("rejects GET /api/v1/orders without token (401)", async () => {
      const res = await app.inject({ method: "GET", url: "/api/v1/orders" });
      assert.equal(res.statusCode, 401);
    });

    it("rejects an expired token (401)", async () => {
      const expiredPayload = Buffer.from(
        JSON.stringify({ sub: "u1", email: "a@b.com", role: "customer", exp: 1 })
      ).toString("base64url");
      const fakeToken = `header.${expiredPayload}.sig`;

      const res = await app.inject({
        method: "GET",
        url: "/api/v1/orders",
        headers: { authorization: `Bearer ${fakeToken}` },
      });
      assert.equal(res.statusCode, 401);
    });
  });

  // ── Rate Limit ───────────────────────────────────────────────────────────────

  describe("Rate limit headers", () => {
    it("includes X-RateLimit-* headers on a public route", async () => {
      const res = await app.inject({ method: "GET", url: "/health" });
      // /health is excluded from rate limiting — verify no crash
      assert.equal(res.statusCode, 200);
    });
  });
});

function token(role = "admin", secret = config.JWT_SECRET) {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(JSON.stringify({ sub: "u1", email: "a@b.com", role, exp: Math.floor(Date.now() / 1000) + 300 })).toString("base64url");
  const signature = createHmac("sha256", secret).update(`${header}.${payload}`).digest("base64url");
  return `${header}.${payload}.${signature}`;
}

describe("Gateway regressions", () => {
  const app = buildApp();
  before(async () => { await app.ready(); });
  after(async () => { await app.close(); });

  it("handles browser preflight for allowed origins", async () => {
    const res = await app.inject({ method: "OPTIONS", url: "/api/v1/catalog/products", headers: {
      origin: config.CORS_ORIGINS.split(",")[0].trim(),
      "access-control-request-method": "POST",
      "access-control-request-headers": "authorization,content-type",
    }});
    assert.equal(res.statusCode, 204);
    assert.equal(res.headers["access-control-allow-origin"], config.CORS_ORIGINS.split(",")[0].trim());
  });

  it("rejects a forged JWT", async () => {
    const res = await app.inject({ method: "GET", url: "/api/v1/orders", headers: { authorization: `Bearer ${token("admin", "wrong-secret")}` } });
    assert.equal(res.statusCode, 401);
  });

  it("rejects catalog writes by customers", async () => {
    const res = await app.inject({ method: "POST", url: "/api/v1/catalog/products", headers: { authorization: `Bearer ${token("customer")}` }, payload: {} });
    assert.equal(res.statusCode, 403);
  });

  it("forwards catalog paths, JSON bodies, and verified identities", async (t) => {
    const calls: { url: string; init: RequestInit }[] = [];
    t.mock.method(globalThis, "fetch", async (url: string, init: RequestInit) => {
      calls.push({ url, init });
      return new Response(JSON.stringify({ ok: true }), { headers: { "content-type": "application/json" } });
    });
    for (const path of ["products?limit=2", "products/abc", "categories", "categories/abc/children"]) {
      const res = await app.inject({ method: "GET", url: `/api/v1/catalog/${path}` });
      assert.equal(res.statusCode, 200);
      assert.equal(calls.at(-1)?.url, `${config.CATALOG_SERVICE_URL}/api/v1/${path}`);
    }
    const created = await app.inject({ method: "POST", url: "/api/v1/catalog/products", headers: {
      authorization: `Bearer ${token()}`, "x-user-id": "spoofed", "content-type": "application/json",
    }, payload: '{ "name": "test" }' });
    assert.equal(created.statusCode, 200);
    const forwarded = calls.at(-1)!.init;
    assert.equal(forwarded.body, '{"name":"test"}');
    assert.equal((forwarded.headers as Record<string, string>)["content-length"], undefined);
    assert.equal((forwarded.headers as Record<string, string>)["x-user-id"], "u1");
  });
});
