import type { FastifyInstance } from "fastify";
import { config } from "../config.js";

export async function healthRoutes(app: FastifyInstance) {
  // GET /health — liveness probe
  app.get("/health", async (_req, reply) => {
    return reply.send({
      status: "ok",
      service: "api-gateway",
      timestamp: new Date().toISOString(),
      upstreams: {
        catalog: config.CATALOG_SERVICE_URL,
        order:   config.ORDER_SERVICE_URL,
      },
    });
  });

  // GET /ready — readiness probe (checks upstreams are reachable)
  app.get("/ready", async (_req, reply) => {
    const checks = await Promise.allSettled([
      fetch(`${config.CATALOG_SERVICE_URL}/health`, { signal: AbortSignal.timeout(3_000) }),
      fetch(`${config.ORDER_SERVICE_URL}/health`,   { signal: AbortSignal.timeout(3_000) }),
    ]);

    const [catalog, order] = checks;
    const catalogOk = catalog.status === "fulfilled" && catalog.value.ok;
    const orderOk   = order.status   === "fulfilled" && order.value.ok;

    const allOk = catalogOk && orderOk;
    return reply.status(allOk ? 200 : 503).send({
      status: allOk ? "ready" : "degraded",
      services: {
        catalog: catalogOk ? "up" : "down",
        order:   orderOk   ? "up" : "down",
      },
    });
  });
}
