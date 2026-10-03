import { test, expect } from "@playwright/test";
import { readdir, readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
async function mailLink(email: string, subject: string) {
  for (const filename of await readdir(".local/mail")) {
    const m = JSON.parse(await readFile(`.local/mail/${filename}`, "utf8")) as {
      to: string;
      subject: string;
      url: string;
    };
    if (m.to === email && m.subject.includes(subject)) return m.url;
  }
  throw Error("Expected dev mail not found");
}
test("password reset revokes existing sessions and permits the new password", async ({
  page,
  context,
}) => {
  const email = `reset-${randomUUID()}@example.test`;
  await page.goto("/en/register");
  await page.getByLabel("Your name").fill("Reset Tester");
  await page.getByLabel("Email address").fill(email);
  await page
    .getByLabel("Password", { exact: true })
    .fill("Original-test-password-2026!");
  await page.getByRole("button", { name: "Get started", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Check your email");
  await page.goto(await mailLink(email, "Verify"));
  await expect(page).toHaveURL(/\/en\/dashboard/);
  const reset = await context.newPage();
  await reset.goto("/en/forgot-password");
  await reset.getByLabel("Email address").fill(email);
  await reset.getByRole("button", { name: "Send reset link" }).click();
  await expect(reset.getByRole("status")).toBeVisible();
  await reset.goto(await mailLink(email, "Reset"));
  await reset
    .getByLabel("New password", { exact: true })
    .fill("Changed-test-password-2026!");
  await reset.getByRole("button", { name: "Save", exact: true }).click();
  await expect(reset.getByRole("status")).toContainText("Password updated");
  await page.goto("/en/dashboard");
  await expect(page).toHaveURL(/\/en\/login/);
  await page.getByLabel("Email address").fill(email);
  await page
    .getByLabel("Password", { exact: true })
    .fill("Changed-test-password-2026!");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/en\/dashboard/);
  await reset.close();
});
