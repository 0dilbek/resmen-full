import { test, expect } from "@playwright/test";
import { readdir, readFile } from "node:fs/promises";
import { createHmac, randomUUID } from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
const exec = promisify(execFile);
// RFC 6238 test authenticator, using the displayed enrollment URI.
function totp(uri: string) {
  const secret = new URL(uri).searchParams.get("secret")!;
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = "";
  for (const c of secret.replace(/=+$/, "").toUpperCase())
    bits += alphabet.indexOf(c).toString(2).padStart(5, "0");
  const bytes = Buffer.from(
    Array.from({ length: Math.floor(bits.length / 8) }, (_, i) =>
      parseInt(bits.slice(i * 8, i * 8 + 8), 2),
    ),
  );
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 30000)));
  const digest = createHmac("sha1", bytes).update(counter).digest();
  const offset = digest[19] & 15;
  return ((digest.readUInt32BE(offset) & 0x7fffffff) % 1000000)
    .toString()
    .padStart(6, "0");
}
test("MFA administrator signs in, changes a template policy, and leaves an audit record", async ({
  page,
}) => {
  const email = `admin-${randomUUID()}@example.test`,
    password = "Verified-test-password-2026!";
  await page.goto("/en/register");
  await page.getByLabel("Your name").fill("Platform Tester");
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Get started", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Check your email");
  let link = "";
  for (const filename of await readdir(".local/mail")) {
    const mail = JSON.parse(
      await readFile(`.local/mail/${filename}`, "utf8"),
    ) as { to: string; url: string };
    if (mail.to === email) link = mail.url;
  }
  expect(Boolean(link)).toBe(true);
  await page.goto(link);
  await expect(page).toHaveURL(/\/en\/dashboard/);
  await page.goto("/en/platform");
  await expect(
    page.getByRole("heading", { name: "This page was not found" }),
  ).toBeVisible();
  await page.goto("/en/account");
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  const uri = await page.locator("textarea").inputValue();
  const backup = (await page.getByLabel("Backup codes").textContent())!.split(
    "\n",
  )[0];
  await page.getByLabel("Verification code", { exact: true }).fill(totp(uri));
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(page.getByText("Active", { exact: true })).toBeVisible();
  await exec("pnpm", ["admin:grant", email]);
  try {
    // Discard the pre-grant browser session; the next login must complete MFA.
    await page.context().clearCookies();
    await page.goto("/en/login");
    await page.getByLabel("Email address").fill(email);
    await page.getByLabel("Password", { exact: true }).fill(password);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(
      page.getByLabel("Verification code", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Verify", exact: true }),
    ).toBeEnabled();
    await page.getByLabel("Verification code", { exact: true }).fill(totp(uri));
    await page.getByRole("button", { name: "Verify", exact: true }).click();
    await expect(page).toHaveURL(/\/en\/dashboard/);
    await page.goto("/en/platform");
    await expect(
      page.getByRole("heading", {
        name: "Platform administration",
        exact: true,
      }),
    ).toBeVisible();
    const tile = page
      .locator("#templates details")
      .filter({ has: page.locator("summary", { hasText: "minimal-05" }) });
    await tile.locator("summary").click();
    await tile
      .getByRole("combobox", { name: "Status", exact: true })
      .selectOption("RETIRED");
    await tile
      .getByLabel("Reason for this action")
      .fill("Browser policy verification");
    await tile.getByRole("button", { name: "Save", exact: true }).click();
    await expect(tile.getByRole("status")).toBeVisible();
    if (
      !(await tile
        .getByRole("combobox", { name: "Status", exact: true })
        .isVisible())
    )
      await tile.locator("summary").click();
    await tile
      .getByRole("combobox", { name: "Status", exact: true })
      .selectOption("ACTIVE");
    await tile
      .getByLabel("Reason for this action")
      .fill("Restore the verified template policy");
    await tile.getByRole("button", { name: "Save", exact: true }).click();
    await expect(tile.locator("summary")).toContainText("minimal-05 · Active");
    await expect(page.locator("#audit")).toContainText("platform.template");
    await page.screenshot({
      path: "test-results/platform.png",
      fullPage: true,
    });
  } finally {
    await exec("pnpm", ["admin:grant", email, "--revoke"]);
  }
  await page.context().clearCookies();
  await page.goto("/en/login");
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page
    .getByRole("button", { name: "Use a backup code", exact: true })
    .click();
  await page.getByLabel("Backup code", { exact: true }).fill(backup);
  await page.getByRole("button", { name: "Verify", exact: true }).click();
  await expect(page).toHaveURL(/\/en\/dashboard/);
});
