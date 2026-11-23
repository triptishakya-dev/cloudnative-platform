import { createHmac, timingSafeEqual } from "node:crypto";
import fp from "fastify-plugin";
import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { config } from "../config.js";

export interface JwtPayload {
  sub: string;
  email: string;
  role: "customer" | "admin";
  iat: number;
  exp: number;
}

declare module "fastify" {
  interface FastifyInstance {
    authenticate: (req: FastifyRequest, reply: FastifyReply) => Promise<void>;
    optionalAuth:  (req: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
  interface FastifyRequest {
    user?: JwtPayload;
  }
}

function decodeJwt(token: string): JwtPayload {
  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("Malformed JWT");
  const header = JSON.parse(Buffer.from(parts[0], "base64url").toString("utf8"));
  if (header.alg !== "HS256") throw new Error("Unsupported JWT algorithm");
  const expected = createHmac("sha256", config.JWT_SECRET)
    .update(`${parts[0]}.${parts[1]}`).digest();
  const signature = Buffer.from(parts[2], "base64url");
  if (signature.length !== expected.length || !timingSafeEqual(signature, expected)) {
    throw new Error("Invalid JWT signature");
  }
  const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
  if (typeof payload.sub !== "string" || !payload.sub ||
      typeof payload.email !== "string" || !payload.email ||
      !["customer", "admin"].includes(payload.role) ||
      typeof payload.exp !== "number" || !Number.isFinite(payload.exp)) {
    throw new Error("Invalid JWT claims");
  }
  if (payload.nbf !== undefined && (typeof payload.nbf !== "number" || payload.nbf * 1000 > Date.now())) {
    throw new Error("Token not active");
  }
  return payload as JwtPayload;
}

function verifyExp(payload: JwtPayload) {
  if (payload.exp && payload.exp * 1000 <= Date.now()) {
    throw new Error("Token expired");
  }
}

async function authPluginFn(app: FastifyInstance) {
  // Strict — rejects if no valid token
  app.decorate("authenticate", async (req: FastifyRequest, reply: FastifyReply) => {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
      return reply.status(401).send({ statusCode: 401, error: "Unauthorized", message: "Bearer token required" });
    }
    try {
      const payload = decodeJwt(header.slice(7));
      verifyExp(payload);
      req.user = payload;
    } catch {
      return reply.status(401).send({ statusCode: 401, error: "Unauthorized", message: "Invalid or expired token" });
    }
  });

  // Lenient — attaches user if present, never rejects
  app.decorate("optionalAuth", async (req: FastifyRequest, _reply: FastifyReply) => {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) return;
    try {
      const payload = decodeJwt(header.slice(7));
      verifyExp(payload);
      req.user = payload;
    } catch {
      /* ignore */
    }
  });
}

export const authPlugin = fp(authPluginFn, { name: "auth" });
