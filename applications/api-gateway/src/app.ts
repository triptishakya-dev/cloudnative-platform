import Fastify from "fastify";
import { accountRoutes } from "./accounts/routes.js";
import cors from "@fastify/cors";
import { loggerOptions } from "./plugins/logger.js";
import { authPlugin } from "./plugins/auth.js";
import { rateLimitPlugin } from "./plugins/rate-limit.js";
import { catalogProxy } from "./routes/catalog.proxy.js";
import { orderProxy } from "./routes/order.proxy.js";
import { healthRoutes } from "./routes/health.js";
import { errorHandler } from "./shared/error-handler.js";
import { requestLogger } from "./middleware/request-logger.js";
import { config } from "./config.js";

export function buildApp() {
  const app = Fastify({
    logger: loggerOptions,
    requestIdHeader: "x-request-id",
    genReqId: () => crypto.randomUUID(),
  });

  // ── Plugins ──────────────────────────────────────────────────────────────
  app.register(cors, {
    origin: config.CORS_ORIGINS.split(",").map(origin => origin.trim()).filter(Boolean),
  });
  app.register(rateLimitPlugin);
  app.register(authPlugin);

  // ── Middleware ───────────────────────────────────────────────────────────
  app.addHook("onRequest", requestLogger);

  // ── Routes ───────────────────────────────────────────────────────────────
  app.register(healthRoutes);
  app.register(accountRoutes);
  app.register(catalogProxy, { prefix: "/api/v1/catalog" });
  app.register(orderProxy,   { prefix: "/api/v1/orders" });

  // ── 404 handler ──────────────────────────────────────────────────────────
  app.setNotFoundHandler((_req, reply) => {
    reply.status(404).send({
      statusCode: 404,
      error: "Not Found",
      message: "Route not found",
    });
  });

  // ── Error handler ────────────────────────────────────────────────────────
  app.setErrorHandler(errorHandler);

  return app;
}
