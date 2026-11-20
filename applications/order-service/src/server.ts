import { buildApp } from "./app.js";
import { OutboxWorker } from "./workers/outbox.worker.js";

const PORT = Number(process.env.PORT ?? 3002);
const HOST = process.env.HOST ?? "0.0.0.0";

const app = buildApp();

try {
  await app.listen({ port: PORT, host: HOST });
  app.log.info(`🚀 order-service listening on ${HOST}:${PORT}`);

  // Start the outbox relay worker after server is up
  const worker = new OutboxWorker(app.prisma, app.log);
  worker.start();

  // Graceful shutdown
  const shutdown = async () => {
    app.log.info("Shutting down...");
    worker.stop();
    await app.close();
    process.exit(0);
  };

  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
