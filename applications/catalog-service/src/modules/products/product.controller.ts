import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { ProductService } from "./product.service.js";
import type {
  CreateProductBody,
  UpdateProductBody,
  ListProductsQuery,
} from "./product.schema.js";

export class ProductController {
  private service: ProductService;

  constructor(app: FastifyInstance) {
    this.service = new ProductService(app.prisma);
  }

  async list(
    request: FastifyRequest<{ Querystring: ListProductsQuery }>,
    reply: FastifyReply
  ) {
    const result = await this.service.findAll(request.query);
    return reply.send(result);
  }

  async getById(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) {
    const product = await this.service.findById(request.params.id);
    return reply.send(product);
  }

  async create(
    request: FastifyRequest<{ Body: CreateProductBody }>,
    reply: FastifyReply
  ) {
    const product = await this.service.create(request.body);
    return reply.status(201).send(product);
  }

  async update(
    request: FastifyRequest<{ Params: { id: string }; Body: UpdateProductBody }>,
    reply: FastifyReply
  ) {
    const product = await this.service.update(request.params.id, request.body);
    return reply.send(product);
  }

  async remove(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) {
    await this.service.remove(request.params.id);
    return reply.status(204).send();
  }
}
