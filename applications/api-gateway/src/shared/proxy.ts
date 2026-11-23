// ─────────────────────────────────────────────────────────────────────────────
// Generic upstream proxy helper
// Forwards the request to an upstream service, streams back the response.
// Preserves: method, path, headers, body, request-id, user identity.
// ─────────────────────────────────────────────────────────────────────────────

import type { FastifyRequest, FastifyReply } from "fastify";

export interface ProxyOptions {
  path?: string;
  upstreamBase: string;        // e.g. "http://localhost:3001"
  stripPrefix?: string;        // prefix to strip before forwarding, e.g. "/api/v1/catalog"
  timeoutMs?: number;
}

export async function proxyRequest(
  req: FastifyRequest,
  reply: FastifyReply,
  opts: ProxyOptions
): Promise<void> {
  const { upstreamBase, stripPrefix = "", timeoutMs = 30_000 } = opts;

  // Build target URL
  const path = opts.path ?? (stripPrefix ? req.url.replace(stripPrefix, "") || "/" : req.url);
  const targetUrl = `${upstreamBase}${path}`;

  // Forward headers — scrub hop-by-hop, inject tracing + auth pass-through
  const forwardHeaders: Record<string, string> = {};
  for (const [k, v] of Object.entries(req.headers)) {
    if (typeof v !== "string") continue;
    const lower = k.toLowerCase();
    if (["host", "content-length", "connection", "keep-alive", "transfer-encoding", "upgrade", "x-user-id", "x-user-email", "x-user-role"].includes(lower)) continue;
    forwardHeaders[k] = v;
  }

  forwardHeaders["x-request-id"]    = req.id as string;
  forwardHeaders["x-forwarded-for"] = req.ip;
  forwardHeaders["x-gateway"]       = "api-gateway";

  // If user was decoded by auth plugin, forward their identity
  if ((req as FastifyRequest & { user?: { sub: string; email: string; role: string } }).user) {
    const u = (req as FastifyRequest & { user: { sub: string; email: string; role: string } }).user;
    forwardHeaders["x-user-id"]    = u.sub;
    forwardHeaders["x-user-email"] = u.email;
    forwardHeaders["x-user-role"]  = u.role;
  }

  // Read body for mutating methods
  let body: string | undefined;
  if (["POST", "PUT", "PATCH"].includes(req.method)) {
    const raw = req.body;
    if (raw !== undefined && raw !== null) {
      body = JSON.stringify(raw);
      forwardHeaders["content-type"] = "application/json";
    }
  }

  let res: Response;
  try {
    res = await fetch(targetUrl, {
      method: req.method,
      headers: forwardHeaders,
      body,
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (err: unknown) {
    const isTimeout = err instanceof Error && err.name === "TimeoutError";
    const statusCode = isTimeout ? 504 : 502;
    const message    = isTimeout ? "Upstream request timed out" : "Upstream service unavailable";
    return reply.status(statusCode).send({ statusCode, error: isTimeout ? "Gateway Timeout" : "Bad Gateway", message });
  }

  // Stream response back — preserve status + headers
  reply.status(res.status);
  res.headers.forEach((value, key) => {
    if (["transfer-encoding", "connection", "content-length", "content-encoding"].includes(key.toLowerCase())) return;
    reply.header(key, value);
  });

  const text = await res.text();
  try {
    reply.send(JSON.parse(text));
  } catch {
    reply.send(text);
  }
}
