import { z } from "zod";
import { themeConfigSchema } from "./config";
/** Bounded transport for private, read-only iframe preview. Never persisted. */
export const previewConfigInput = z
  .string()
  .max(6000)
  .transform((raw, ctx) => {
    try {
      return JSON.parse(raw) as unknown;
    } catch {
      ctx.addIssue({ code: "custom", message: "Invalid preview" });
      return z.NEVER;
    }
  })
  .pipe(themeConfigSchema);
