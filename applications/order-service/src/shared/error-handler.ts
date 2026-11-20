import type { FastifyError, FastifyReply, FastifyRequest } from "fastify";
import { Prisma } from "@cloudnative/order-prisma-client";

export function errorHandler(
  error: FastifyError,
  _request: FastifyRequest,
  reply: FastifyReply
) {
  // Prisma known request errors
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2025") {
      return reply.status(404).send({ statusCode: 404, error: "Not Found", message: "Record not found" });
    }
    if (error.code === "P2002") {
      return reply.status(409).send({ statusCode: 409, error: "Conflict", message: "Duplicate entry — idempotency key already used" });
    }
  }

  // Validation errors from Fastify schema
  if (error.validation) {
    return reply.status(400).send({
      statusCode: 400,
      error: "Bad Request",
      message: error.message,
      validation: error.validation,
    });
  }

  // Generic / custom thrown errors with statusCode
  const statusCode = error.statusCode ?? 500;
  reply.status(statusCode).send({
    statusCode,
    error: error.name ?? "Internal Server Error",
    message: statusCode >= 500 ? "An unexpected error occurred" : error.message,
  });
}
