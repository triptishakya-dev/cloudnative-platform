import { pino } from "pino";
import { config } from "./config.js";
import { DeliveryStore } from "./database.js";
import { createMailer } from "./email.js";
import { runWorker } from "./broker.js";

const log = pino({ level: config.logLevel });
const store = new DeliveryStore(config.databaseUrl);
store.pool.on("error", error => log.error({ message: error.message }, "Notification database pool error"));
const mailer = createMailer();
const controller = new AbortController();
const stop = () => controller.abort();
process.once("SIGINT", stop);
process.once("SIGTERM", stop);
try {
  await store.ready();
  await runWorker(log, event => store.deliverOnce(event, () => mailer.send(event)), controller.signal);
} catch (error) {
  log.error({ message: error instanceof Error ? error.message : String(error) }, "Worker startup failed; run npm run db:setup first");
  process.exitCode = 1;
} finally {
  mailer.close();
  await store.close();
  process.off("SIGINT", stop);
  process.off("SIGTERM", stop);
}
