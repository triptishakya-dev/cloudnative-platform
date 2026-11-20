import fp from "fastify-plugin";
import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";

export interface AuthUser {
  sub: string;       // userId (customerId in auth context)
  email: string;
  role: string;
}

declare module "fastify" {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
  interface FastifyRequest {
    user: AuthUser;
  }
}

async function authPluginFn(app: FastifyInstance) {
  const JWT_SECRET = process.env.JWT_SECRET ?? "change-me";

  app.decorate(
    "authenticate",
    async function (request: FastifyRequest, reply: FastifyReply) {
      const authHeader = request.headers.authorization;

      if (!authHeader?.startsWith("Bearer ")) {
        return reply.status(401).send({ statusCode: 401, error: "Unauthorized", message: "Missing bearer token" });
      }

      const token = authHeader.slice(7);

      try {
        // Lightweight JWT decode — replace with jsonwebtoken / jose in production
        const [, payloadB64] = token.split(".");
        const payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString());

        if (!payload.sub || !payload.email) {
          throw new Error("Invalid token payload");
        }

        // Check expiry
        if (payload.exp && payload.exp * 1000 < Date.now()) {
          throw new Error("Token expired");
        }

        request.user = { sub: payload.sub, email: payload.email, role: payload.role ?? "customer" };
      } catch (err) {
        return reply.status(401).send({ statusCode: 401, error: "Unauthorized", message: "Invalid or expired token" });
      }
    }
  );
}

export const authPlugin = fp(authPluginFn, { name: "auth" });
