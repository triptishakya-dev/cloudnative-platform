import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { OrderService } from "./order.service.js";
import type { CreateOrderBody, ListOrdersQuery, OrderActionBody } from "./order.schema.js";

export class OrderController {
  private service: OrderService;

  constructor(app: FastifyInstance) {
    this.service = new OrderService(app.prisma);
  }

  async list(
    request: FastifyRequest<{ Querystring: ListOrdersQuery }>,
    reply: FastifyReply
  ) {
    const result = await this.service.findAll(request.user.sub, request.query);
    return reply.send(result);
  }

  async getById(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) {
    const order = await this.service.findById(request.params.id, request.user.sub);
    return reply.send(order);
  }

  async create(
    request: FastifyRequest<{ Body: CreateOrderBody }>,
    reply: FastifyReply
  ) {
    const order = await this.service.create(
      request.user.sub,
      request.user.email,
      request.body
    );
    return reply.status(201).send(order);
  }

  async confirm(
    request: FastifyRequest<{ Params: { id: string }; Body: OrderActionBody }>,
    reply: FastifyReply
  ) {
    const order = await this.service.confirm(request.params.id, request.user.sub);
    return reply.send(order);
  }

  async cancel(
    request: FastifyRequest<{ Params: { id: string }; Body: OrderActionBody }>,
    reply: FastifyReply
  ) {
    const order = await this.service.cancel(request.params.id, request.user.sub);
    return reply.send(order);
  }

  async complete(
    request: FastifyRequest<{ Params: { id: string }; Body: OrderActionBody }>,
    reply: FastifyReply
  ) {
    const order = await this.service.complete(request.params.id, request.user.sub);
    return reply.send(order);
  }
}
