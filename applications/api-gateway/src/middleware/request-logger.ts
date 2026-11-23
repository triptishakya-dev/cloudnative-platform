import type { FastifyRequest, FastifyReply } from "fastify";

/**
 * Logs every incoming request with method, URL, status, and latency.
 * Attached as an onRequest + onResponse hook pair.
 */
export async function requestLogger(
  req: FastifyRequest,
  _reply: FastifyReply
): Promise<void> {
  const log = (req.server as typeof req.server & { log?: { info: (o: object) => void } }).log;
  if (!log) return;

  log.info({
    reqId:  req.id,
    method: req.method,
    url:    req.url,
    ip:     req.ip,
    ua:     req.headers["user-agent"],
  });
}
