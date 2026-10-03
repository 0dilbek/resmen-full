import "server-only";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { randomUUID } from "node:crypto";
import nodemailer from "nodemailer";
import { env } from "@/infrastructure/env";
export async function sendAuthMail(to: string, subject: string, url: string) {
  const config = env();
  if (config.MAIL_MODE === "file") {
    if (config.APP_ENV === "production") throw new Error("SMTP_REQUIRED");
    await mkdir(config.MAIL_FILE_ROOT, { recursive: true, mode: 0o700 });
    await writeFile(
      resolve(config.MAIL_FILE_ROOT, `${randomUUID()}.json`),
      JSON.stringify({ to, subject, url }),
      { mode: 0o600 },
    );
    return;
  }
  const transport = nodemailer.createTransport({
    host: config.SMTP_HOST,
    port: config.SMTP_PORT,
    secure: config.SMTP_PORT === 465,
    requireTLS: config.SMTP_PORT !== 465,
    connectionTimeout: 10000,
    socketTimeout: 20000,
    auth: config.SMTP_USER
      ? { user: config.SMTP_USER, pass: config.SMTP_PASSWORD }
      : undefined,
  });
  await transport.sendMail({
    from: config.MAIL_FROM,
    to,
    subject,
    text: `${subject}\n\n${url}\n\nResmen`,
  });
}
