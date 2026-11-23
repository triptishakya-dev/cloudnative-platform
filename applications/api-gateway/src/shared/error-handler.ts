import type { FastifyError, FastifyRequest, FastifyReply } from "fastify";

export function errorHandler(
  error: FastifyError,
  req: FastifyRequest,
  reply: FastifyReply
) {
  // Validation errors from Fastify schema
  if (error.validation) {
    return reply.status(400).send({
      statusCode: 400,
      error: "Bad Request",
      message: error.message,
      validation: error.validation,
    });
  }

  const statusCode = error.statusCode ?? 500;

  // Log server errors
  if (statusCode >= 500) {
    (req.server as typeof req.server & { log?: { error: (o: object, m: string) => void } })
      .log?.error({ err: error, reqId: req.id }, "Unhandled error");
  }

  reply.status(statusCode).send({
    statusCode,
    error: error.name ?? "Internal Server Error",
    message: statusCode >= 500 ? "An unexpected error occurred" : error.message,
    requestId: req.id,
  });
}
