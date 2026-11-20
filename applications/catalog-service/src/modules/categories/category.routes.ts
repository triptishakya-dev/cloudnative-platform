import type { FastifyInstance } from "fastify";
import { CategoryController } from "./category.controller.js";
import {
  CreateCategoryBody,
  UpdateCategoryBody,
  ListCategoriesQuery,
  UuidParam,
} from "./category.schema.js";

export async function categoryRoutes(app: FastifyInstance) {
  const controller = new CategoryController(app);

  // GET /api/v1/categories
  app.get("/", {
    schema: { querystring: ListCategoriesQuery },
    handler: controller.list.bind(controller),
  });

  // GET /api/v1/categories/:id
  app.get("/:id", {
    schema: { params: UuidParam },
    handler: controller.getById.bind(controller),
  });

  // GET /api/v1/categories/:id/children
  app.get("/:id/children", {
    schema: { params: UuidParam },
    handler: controller.getChildren.bind(controller),
  });

  // POST /api/v1/categories
  app.post("/", {
    schema: { body: CreateCategoryBody },
    handler: controller.create.bind(controller),
  });

  // PATCH /api/v1/categories/:id
  app.patch("/:id", {
    schema: { params: UuidParam, body: UpdateCategoryBody },
    handler: controller.update.bind(controller),
  });

  // DELETE /api/v1/categories/:id
  app.delete("/:id", {
    schema: { params: UuidParam },
    handler: controller.remove.bind(controller),
  });
}
