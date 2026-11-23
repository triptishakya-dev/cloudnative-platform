import { buildApp } from "./app.js";
import { config } from "./config.js";

const app = buildApp();

try {
  await app.listen({ port: config.PORT, host: config.HOST });
  console.log(`🚀 api-gateway listening on ${config.HOST}:${config.PORT}`);

  const shutdown = async (signal: string) => {
    console.log(`\n${signal} received — shutting down gracefully`);
    await app.close();
    process.exit(0);
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT",  () => shutdown("SIGINT"));
} catch (err) {
  console.error("Failed to start:", err);
  process.exit(1);
}
