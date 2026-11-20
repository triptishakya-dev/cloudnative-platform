import type { FastifyInstance } from "fastify";
import { OrderController } from "./order.controller.js";
import {
  CreateOrderBody,
  OrderActionBody,
  ListOrdersQuery,
  UuidParam,
} from "./order.schema.js";

export async function orderRoutes(app: FastifyInstance) {
  const controller = new OrderController(app);

  // All order routes require authentication
  app.addHook("onRequest", app.authenticate);

  // GET /api/v1/orders
  app.get("/", {
    schema: { querystring: ListOrdersQuery },
    handler: controller.list.bind(controller),
  });

  // GET /api/v1/orders/:id
  app.get("/:id", {
    schema: { params: UuidParam },
    handler: controller.getById.bind(controller),
  });

  // POST /api/v1/orders
  app.post("/", {
    schema: { body: CreateOrderBody },
    handler: controller.create.bind(controller),
  });

  // POST /api/v1/orders/:id/confirm
  app.post("/:id/confirm", {
    schema: { params: UuidParam, body: OrderActionBody },
    handler: controller.confirm.bind(controller),
  });

  // POST /api/v1/orders/:id/cancel
  app.post("/:id/cancel", {
    schema: { params: UuidParam, body: OrderActionBody },
    handler: controller.cancel.bind(controller),
  });

  // POST /api/v1/orders/:id/complete
  app.post("/:id/complete", {
    schema: { params: UuidParam, body: OrderActionBody },
    handler: controller.complete.bind(controller),
  });
}
