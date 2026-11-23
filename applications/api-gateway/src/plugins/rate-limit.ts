import fp from "fastify-plugin";
import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { config } from "../config.js";

// In-memory sliding-window rate limiter (replace with Redis for multi-instance)
interface Window {
  count: number;
  resetAt: number;
}

const store = new Map<string, Window>();

function getClientKey(req: FastifyRequest): string {
  return (req.headers["x-forwarded-for"] as string | undefined)?.split(",")[0]?.trim()
    ?? req.ip
    ?? "unknown";
}

async function rateLimitPluginFn(app: FastifyInstance) {
  const { RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_MS } = config;

  app.addHook("onRequest", async (req: FastifyRequest, reply: FastifyReply) => {
    // Skip health / internal routes
    if (req.url === "/health" || req.url === "/ready") return;

    const key = getClientKey(req);
    const now = Date.now();
    let win = store.get(key);

    if (!win || now > win.resetAt) {
      win = { count: 0, resetAt: now + RATE_LIMIT_WINDOW_MS };
      store.set(key, win);
    }

    win.count++;

    reply.header("X-RateLimit-Limit",     RATE_LIMIT_MAX.toString());
    reply.header("X-RateLimit-Remaining", Math.max(0, RATE_LIMIT_MAX - win.count).toString());
    reply.header("X-RateLimit-Reset",     Math.ceil(win.resetAt / 1000).toString());

    if (win.count > RATE_LIMIT_MAX) {
      return reply.status(429).send({
        statusCode: 429,
        error: "Too Many Requests",
        message: `Rate limit exceeded. Try again after ${new Date(win.resetAt).toISOString()}`,
      });
    }
  });

  // Cleanup stale keys every 5 minutes
  setInterval(() => {
    const now = Date.now();
    for (const [key, win] of store) {
      if (now > win.resetAt) store.delete(key);
    }
  }, 5 * 60_000).unref();
}

export const rateLimitPlugin = fp(rateLimitPluginFn, { name: "rate-limit" });
