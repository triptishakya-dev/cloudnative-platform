import fp from "fastify-plugin";
import { PrismaClient } from "@cloudnative/catalog-prisma-client";
import type { FastifyInstance } from "fastify";

declare module "fastify" {
  interface FastifyInstance {
    prisma: PrismaClient;
  }
}

async function prismaPluginFn(app: FastifyInstance) {
  const prisma = new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "warn", "error"]
        : ["warn", "error"],
  });

  await prisma.$connect();
  app.log.info("Prisma connected");

  app.decorate("prisma", prisma);

  app.addHook("onClose", async () => {
    await prisma.$disconnect();
    app.log.info("Prisma disconnected");
  });
}

export const prismaPlugin = fp(prismaPluginFn, {
  name: "prisma",
});
