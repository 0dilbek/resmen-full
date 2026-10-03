import { z } from "zod";

export const environmentSchema = z
  .object({
    APP_ENV: z
      .enum(["development", "test", "production"])
      .default("production"),
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    DATABASE_URL: z.string().startsWith("postgres"),
    BETTER_AUTH_SECRET: z.string().min(32),
    BETTER_AUTH_URL: z.url(),
    APP_URL: z.url(),
    MAIL_MODE: z.enum(["file", "smtp"]).default("file"),
    SMTP_HOST: z.string().optional(),
    SMTP_PORT: z.coerce.number().int().min(1).max(65535).default(587),
    SMTP_USER: z.string().optional(),
    SMTP_PASSWORD: z.string().optional(),
    MAIL_FROM: z.string().default("Resmen <noreply@localhost>"),
    STORAGE_DRIVER: z.enum(["local", "s3"]).default("local"),
    S3_ENDPOINT: z.string().optional(),
    S3_REGION: z.string().default("auto"),
    S3_BUCKET: z.string().optional(),
    S3_ACCESS_KEY_ID: z.string().optional(),
    S3_SECRET_ACCESS_KEY: z.string().optional(),
    UPLOAD_ROOT: z.string().default(".local/uploads"),
    MAIL_FILE_ROOT: z.string().default(".local/mail"),
  })
  .superRefine((value, ctx) => {
    if (new URL(value.APP_URL).origin !== new URL(value.BETTER_AUTH_URL).origin)
      ctx.addIssue({
        code: "custom",
        path: ["BETTER_AUTH_URL"],
        message: "Auth and app origins must match",
      });
    if (
      value.APP_ENV === "production" &&
      value.STORAGE_DRIVER === "local" &&
      !value.UPLOAD_ROOT.startsWith("/")
    )
      ctx.addIssue({
        code: "custom",
        path: ["UPLOAD_ROOT"],
        message: "Production local storage requires a persistent absolute path",
      });
    if (value.APP_ENV === "production" && value.MAIL_MODE !== "smtp")
      ctx.addIssue({
        code: "custom",
        path: ["MAIL_MODE"],
        message: "Production requires SMTP",
      });
    if (value.APP_ENV === "production" && !value.APP_URL.startsWith("https://"))
      ctx.addIssue({
        code: "custom",
        path: ["APP_URL"],
        message: "Production requires HTTPS",
      });
    if (value.MAIL_MODE === "smtp" && !value.SMTP_HOST)
      ctx.addIssue({
        code: "custom",
        path: ["SMTP_HOST"],
        message: "SMTP host is required",
      });
    if (
      value.STORAGE_DRIVER === "s3" &&
      (!value.S3_BUCKET ||
        !value.S3_ACCESS_KEY_ID ||
        !value.S3_SECRET_ACCESS_KEY)
    )
      ctx.addIssue({
        code: "custom",
        path: ["S3_BUCKET"],
        message: "S3 credentials are required",
      });
  });
let parsed: z.infer<typeof environmentSchema> | undefined;
export function env() {
  return (parsed ??= environmentSchema.parse(process.env));
}
