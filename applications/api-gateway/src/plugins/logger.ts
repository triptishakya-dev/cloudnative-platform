import type { FastifyServerOptions } from "fastify";
import { config } from "../config.js";

export const loggerOptions: FastifyServerOptions["logger"] = {
  level: config.LOG_LEVEL,
  ...(config.LOG_FORMAT !== "json" && {
    transport: { target: "pino-pretty", options: { colorize: true, translateTime: "HH:MM:ss" } },
  }),
};
