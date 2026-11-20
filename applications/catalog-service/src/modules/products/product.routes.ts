import type { FastifyInstance } from "fastify";
import { ProductController } from "./product.controller.js";
import {
  CreateProductBody,
  UpdateProductBody,
  ListProductsQuery,
  UuidParam,
} from "./product.schema.js";

export async function productRoutes(app: FastifyInstance) {
  const controller = new ProductController(app);

  // GET /api/v1/products
  app.get("/", {
    schema: { querystring: ListProductsQuery },
    handler: controller.list.bind(controller),
  });

  // GET /api/v1/products/:id
  app.get("/:id", {
    schema: { params: UuidParam },
    handler: controller.getById.bind(controller),
  });

  // POST /api/v1/products
  app.post("/", {
    schema: { body: CreateProductBody },
    handler: controller.create.bind(controller),
  });

  // PATCH /api/v1/products/:id
  app.patch("/:id", {
    schema: { params: UuidParam, body: UpdateProductBody },
    handler: controller.update.bind(controller),
  });

  // DELETE /api/v1/products/:id
  app.delete("/:id", {
    schema: { params: UuidParam },
    handler: controller.remove.bind(controller),
  });
}
