import Fastify from "fastify";
import { prismaPlugin } from "./plugins/prisma.js";
import { productRoutes } from "./modules/products/product.routes.js";
import { categoryRoutes } from "./modules/categories/category.routes.js";
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

  // ── Routes ───────────────────────────────────────────────────────────────
  app.register(productRoutes, { prefix: "/api/v1/products" });
  app.register(categoryRoutes, { prefix: "/api/v1/categories" });

  // ── Health check ─────────────────────────────────────────────────────────
  app.get("/health", async () => ({ status: "ok", service: "catalog-service" }));

  // ── Error handler ────────────────────────────────────────────────────────
  app.setErrorHandler(errorHandler);

  return app;
}
