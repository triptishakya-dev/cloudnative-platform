import Fastify from "fastify";
import { prismaPlugin } from "./plugins/prisma.js";
import { authPlugin } from "./plugins/auth.js";
import { orderRoutes } from "./modules/orders/order.routes.js";
import { errorHandler } from "./shared/error-handler.js";

export function buildApp() {
  const app = Fastify({
    logger: {
      level: process.env.LOG_LEVEL ?? "info",
      ...(process.env.LOG_FORMAT !== "json" && {
        transport: { target: "pino-pretty", options: { colorize: true } },
      }),
    },
  });

  // ── Plugins ──────────────────────────────────────────────────────────────
  app.register(prismaPlugin);
  app.register(authPlugin);

  // ── Routes ───────────────────────────────────────────────────────────────
  app.register(orderRoutes, { prefix: "/api/v1/orders" });

  // ── Health check ─────────────────────────────────────────────────────────
  app.get("/health", async () => ({ status: "ok", service: "order-service" }));

  // ── Error handler ────────────────────────────────────────────────────────
  app.setErrorHandler(errorHandler);

  return app;
}
