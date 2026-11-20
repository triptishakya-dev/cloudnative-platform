import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { CategoryService } from "./category.service.js";
import type {
  CreateCategoryBody,
  UpdateCategoryBody,
  ListCategoriesQuery,
} from "./category.schema.js";

export class CategoryController {
  private service: CategoryService;

  constructor(app: FastifyInstance) {
    this.service = new CategoryService(app.prisma);
  }

  async list(
    request: FastifyRequest<{ Querystring: ListCategoriesQuery }>,
    reply: FastifyReply
  ) {
    const result = await this.service.findAll(request.query);
    return reply.send(result);
  }

  async getById(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) {
    const category = await this.service.findById(request.params.id);
    return reply.send(category);
  }

  async getChildren(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) {
    const children = await this.service.findChildren(request.params.id);
    return reply.send(children);
  }

  async create(
    request: FastifyRequest<{ Body: CreateCategoryBody }>,
    reply: FastifyReply
  ) {
    const category = await this.service.create(request.body);
    return reply.status(201).send(category);
  }

  async update(
    request: FastifyRequest<{ Params: { id: string }; Body: UpdateCategoryBody }>,
    reply: FastifyReply
  ) {
    const category = await this.service.update(request.params.id, request.body);
    return reply.send(category);
  }

  async remove(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) {
    await this.service.remove(request.params.id);
    return reply.status(204).send();
  }
}
