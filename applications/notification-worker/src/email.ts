import nodemailer from "nodemailer";
import { config } from "./config.js";
import type { OrderCreated } from "./events.js";

export function createMailer() {
  const transport = nodemailer.createTransport({
    host: config.smtpHost, port: config.smtpPort, secure: config.smtpSecure,
    ...(config.smtpUser && { auth: { user: config.smtpUser, pass: config.smtpPass ?? "" } }),
    connectionTimeout: 5000, greetingTimeout: 5000, socketTimeout: 10_000,
  });
  return {
    async send(event: OrderCreated) {
      const result = await transport.sendMail({
        from: config.emailFrom,
        to: event.payload.customerEmail,
        messageId: `<${event.eventId}@cloudnative.local>`,
        subject: `Order received: ${event.payload.orderId}`,
        text: `We received your order ${event.payload.orderId}.\nTotal: ${event.payload.currency} ${event.payload.totalAmount}\nYour order is pending confirmation.\n`,
      });
      if (!result.accepted?.length || result.rejected?.length) throw new Error("SMTP recipient not accepted");
    },
    close() { transport.close(); },
  };
}
