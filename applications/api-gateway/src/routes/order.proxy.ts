// ─────────────────────────────────────────────────────────────────────────────
// Order Service Proxy
//
// All order routes require authentication — the JWT is decoded at the gateway
// and the user identity is forwarded via x-user-* headers.
//
// Mounted at: /api/v1/orders  →  forwards to ORDER_SERVICE_URL/api/v1/orders
// ─────────────────────────────────────────────────────────────────────────────

import type { FastifyInstance } from "fastify";
import { proxyRequest } from "../shared/proxy.js";
import { config } from "../config.js";

const UPSTREAM = config.ORDER_SERVICE_URL;
const STRIP    = "/api/v1/orders";

function rewrite(url: string): string {
  return "/api/v1/orders" + (url.replace(STRIP, "") || "");
}

export async function orderProxy(app: FastifyInstance) {
  // All routes in this scope require auth
  app.addHook("onRequest", app.authenticate);

  // GET /api/v1/orders
  app.get("/", async (req, reply) => {
    return proxyRequest(req, reply, { upstreamBase: UPSTREAM, path: rewrite(req.url), timeoutMs: config.PROXY_TIMEOUT_MS });
  });

  // GET /api/v1/orders/:id
  app.get("/:id", async (req, reply) => {
    return proxyRequest(req, reply, { upstreamBase: UPSTREAM, path: rewrite(req.url), timeoutMs: config.PROXY_TIMEOUT_MS });
  });

  // POST /api/v1/orders
  app.post("/", async (req, reply) => {
    return proxyRequest(req, reply, { upstreamBase: UPSTREAM, path: rewrite(req.url), timeoutMs: config.PROXY_TIMEOUT_MS });
  });

  // POST /api/v1/orders/:id/confirm
  app.post("/:id/confirm", async (req, reply) => {
    return proxyRequest(req, reply, { upstreamBase: UPSTREAM, path: rewrite(req.url), timeoutMs: config.PROXY_TIMEOUT_MS });
  });

  // POST /api/v1/orders/:id/cancel
  app.post("/:id/cancel", async (req, reply) => {
    return proxyRequest(req, reply, { upstreamBase: UPSTREAM, path: rewrite(req.url), timeoutMs: config.PROXY_TIMEOUT_MS });
  });

  // POST /api/v1/orders/:id/complete
  app.post("/:id/complete", async (req, reply) => {
    return proxyRequest(req, reply, { upstreamBase: UPSTREAM, path: rewrite(req.url), timeoutMs: config.PROXY_TIMEOUT_MS });
  });
}
