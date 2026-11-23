// ─────────────────────────────────────────────────────────────────────────────
// Catalog Service Proxy
//
// Public (read) routes:  no auth required
// Mutating routes:       require a valid JWT (admin only for create/update/delete)
//
// Mounted at: /api/v1/catalog  →  forwards to CATALOG_SERVICE_URL/api/v1/products
// ─────────────────────────────────────────────────────────────────────────────

import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { proxyRequest } from "../shared/proxy.js";
import { config } from "../config.js";

const UPSTREAM = config.CATALOG_SERVICE_URL;
const STRIP    = "/api/v1/catalog";

// Remap gateway prefix → upstream prefix
function rewrite(url: string): string {
  return url.replace(STRIP, "/api/v1") || "/api/v1/products";
}

export async function catalogProxy(app: FastifyInstance) {
  const requireAdmin = async (req: FastifyRequest, reply: FastifyReply) => {
    if (req.user?.role !== "admin") {
      return reply.status(403).send({ statusCode: 403, error: "Forbidden", message: "Admin role required" });
    }
  };
  // ── Public reads ─────────────────────────────────────────────────────────

  // GET /api/v1/catalog/products
  app.get("/products", async (req, reply) => {
    return proxyRequest(req, reply, { upstreamBase: UPSTREAM, path: rewrite(req.url), timeoutMs: config.PROXY_TIMEOUT_MS });
  });

  // GET /api/v1/catalog/products/:id
  app.get("/products/:id", async (req, reply) => {
    return proxyRequest(req, reply, { upstreamBase: UPSTREAM, path: rewrite(req.url), timeoutMs: config.PROXY_TIMEOUT_MS });
  });

  // GET /api/v1/catalog/categories
  app.get("/categories", async (req, reply) => {
    return proxyRequest(req, reply, { upstreamBase: UPSTREAM, path: req.url.replace(STRIP, "/api/v1"), timeoutMs: config.PROXY_TIMEOUT_MS });
  });

  // GET /api/v1/catalog/categories/:id
  app.get("/categories/:id", async (req, reply) => {
    return proxyRequest(req, reply, { upstreamBase: UPSTREAM, path: req.url.replace(STRIP, "/api/v1"), timeoutMs: config.PROXY_TIMEOUT_MS });
  });

  // GET /api/v1/catalog/categories/:id/children
  app.get("/categories/:id/children", async (req, reply) => {
    return proxyRequest(req, reply, { upstreamBase: UPSTREAM, path: req.url.replace(STRIP, "/api/v1"), timeoutMs: config.PROXY_TIMEOUT_MS });
  });

  // ── Protected writes (require auth) ──────────────────────────────────────

  app.post("/products", { onRequest: [app.authenticate, requireAdmin] }, async (req, reply) => {
    return proxyRequest(req, reply, { upstreamBase: UPSTREAM, path: rewrite(req.url), timeoutMs: config.PROXY_TIMEOUT_MS });
  });

  app.patch("/products/:id", { onRequest: [app.authenticate, requireAdmin] }, async (req, reply) => {
    return proxyRequest(req, reply, { upstreamBase: UPSTREAM, path: rewrite(req.url), timeoutMs: config.PROXY_TIMEOUT_MS });
  });

  app.delete("/products/:id", { onRequest: [app.authenticate, requireAdmin] }, async (req, reply) => {
    return proxyRequest(req, reply, { upstreamBase: UPSTREAM, path: rewrite(req.url), timeoutMs: config.PROXY_TIMEOUT_MS });
  });

  app.post("/categories", { onRequest: [app.authenticate, requireAdmin] }, async (req, reply) => {
    return proxyRequest(req, reply, { upstreamBase: UPSTREAM, path: req.url.replace(STRIP, "/api/v1"), timeoutMs: config.PROXY_TIMEOUT_MS });
  });

  app.patch("/categories/:id", { onRequest: [app.authenticate, requireAdmin] }, async (req, reply) => {
    return proxyRequest(req, reply, { upstreamBase: UPSTREAM, path: req.url.replace(STRIP, "/api/v1"), timeoutMs: config.PROXY_TIMEOUT_MS });
  });

  app.delete("/categories/:id", { onRequest: [app.authenticate, requireAdmin] }, async (req, reply) => {
    return proxyRequest(req, reply, { upstreamBase: UPSTREAM, path: req.url.replace(STRIP, "/api/v1"), timeoutMs: config.PROXY_TIMEOUT_MS });
  });
}
