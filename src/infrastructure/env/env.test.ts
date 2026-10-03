import { describe, expect, it } from "vitest";
import { environmentSchema } from "./index";
const base = {
  APP_ENV: "development",
  DATABASE_URL: "postgresql://localhost/test",
  BETTER_AUTH_SECRET: "a".repeat(40),
  BETTER_AUTH_URL: "http://localhost:3000",
  APP_URL: "http://localhost:3000",
};
describe("environment boundaries", () => {
  it("allows file mail in development", () => {
    expect(environmentSchema.parse(base).MAIL_MODE).toBe("file");
  });
  it("rejects insecure production configuration", () => {
    expect(
      environmentSchema.safeParse({ ...base, APP_ENV: "production" }).success,
    ).toBe(false);
  });
  it("requires complete object storage credentials", () => {
    expect(
      environmentSchema.safeParse({ ...base, STORAGE_DRIVER: "s3" }).success,
    ).toBe(false);
  });
});
