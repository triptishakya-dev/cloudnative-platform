import { InvalidEvent, parseEvent, type OrderCreated } from "./events.js";

export interface Incoming {
  content: Buffer;
  headers?: Record<string, unknown>;
}
export interface ProcessorDependencies {
  maxRetries: number;
  deliver: (event: OrderCreated) => Promise<"sent" | "duplicate">;
  retry: (attempt: number, reason: string) => Promise<void>;
  deadLetter: (reason: string) => Promise<void>;
  ack: () => void;
}

export async function processMessage(message: Incoming, deps: ProcessorDependencies) {
  let event: OrderCreated | null;
  const attempt = message.headers?.["x-notification-attempt"] ?? 0;
  try {
    if (typeof attempt !== "number" || !Number.isSafeInteger(attempt) || attempt < 0 || attempt > deps.maxRetries) {
      throw new InvalidEvent("Invalid retry attempt header");
    }
    event = parseEvent(message.content);
  } catch (error) {
    if (!(error instanceof InvalidEvent)) throw error;
    await deps.deadLetter(error.message);
    deps.ack();
    return "dead-lettered";
  }
  if (!event) {
    deps.ack();
    return "ignored";
  }
  let result: "sent" | "duplicate";
  try { result = await deps.deliver(event); }
  catch (error) {
    const reason = error instanceof Error ? error.message.slice(0, 500) : "Notification delivery failed";
    if ((attempt as number) >= deps.maxRetries) {
      await deps.deadLetter(reason);
      deps.ack();
      return "dead-lettered";
    }
    await deps.retry((attempt as number) + 1, reason);
    deps.ack();
    return "retrying";
  }
  deps.ack();
  return result;
}
