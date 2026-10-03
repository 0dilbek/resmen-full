import { test, expect } from "@playwright/test";
import { readdir, readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
test("verified owner creates a restaurant and cannot open a foreign tenant", async ({
  page,
  browser,
}) => {
  const email = `owner-${randomUUID()}@example.test`;
  await page.goto("/en/register");
  await page.getByLabel("Your name").fill("Test Owner");
  await page.getByLabel("Email address").fill(email);
  await page
    .getByLabel("Password", { exact: true })
    .fill("Verified-test-password-2026!");
  await page.getByRole("button", { name: "Get started", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Check your email");
  let verificationUrl = "";
  for (const name of await readdir(".local/mail")) {
    const mail = JSON.parse(await readFile(`.local/mail/${name}`, "utf8")) as {
      to: string;
      url: string;
    };
    if (mail.to === email) verificationUrl = mail.url;
  }
  expect(verificationUrl).toContain("/verify-email");
  await page.goto(verificationUrl);
  await expect(page).toHaveURL(/\/en\/dashboard/);
  await page.getByLabel("Restaurant name").fill("Integration Restaurant");
  await page.getByLabel("Menu address").fill(`test-${randomUUID()}`);
  await page
    .getByRole("button", { name: "Create restaurant", exact: true })
    .click();
  await expect(page).toHaveURL(/\/en\/dashboard\/[a-f0-9-]{36}$/);
  await expect(
    page.getByRole("heading", { name: "Overview", exact: true }),
  ).toBeVisible();
  await page.screenshot({ path: "test-results/dashboard.png", fullPage: true });
  const dashboard = page.url();
  await page.goto(`${dashboard}/categories`);
  await page.getByLabel("Category name · UZ").fill("Taomlar");
  await page.getByLabel("Category name · EN").fill("Dishes");
  await page.getByRole("button", { name: "Add category", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Taomlar", exact: true }),
  ).toBeVisible();
  await page.goto(`${dashboard}/products/new`);
  await page.getByLabel("Product name · UZ").fill("Osh");
  await page.getByLabel("Price · UZS").fill("45000");
  await page.getByLabel("Published", { exact: true }).check();
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page).toHaveURL(/\/products\?branch=/);
  await expect(
    page.getByRole("cell", { name: "Osh", exact: true }),
  ).toBeVisible();
  await page.goto(`${dashboard}/templates`);
  await page.getByRole("button", { name: "Publish menu", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Unpublish menu", exact: true }),
  ).toBeVisible();
  const publicPath = await page
    .getByRole("link", { name: "Open menu", exact: true })
    .last()
    .getAttribute("href");
  expect(publicPath).toBeTruthy();
  await page.goto(publicPath!.replace(/\/uz$/, "/en"));
  await expect(
    page.getByRole("heading", { name: "Osh", exact: true }),
  ).toBeVisible();
  await page.getByLabel("Search the menu").fill("missing dish");
  await expect(page.getByRole("status")).toContainText("No dishes found");
  await page.getByRole("button", { name: "Clear search" }).click();
  await page.getByRole("button", { name: "Osh", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page.goto(`${dashboard}/qr`);
  await page.getByLabel("Table name or number").fill("12");
  await page.getByRole("button", { name: "Add table", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "12", exact: true }),
  ).toBeVisible();
  const qrUrl = await page.locator("a.qr-url").first().getAttribute("href");
  expect(qrUrl).toContain("/q/");
  await page.goto(qrUrl!);
  await expect(page).toHaveURL(/\?q=/);
  await expect(page.getByText("Stol 12", { exact: true })).toBeVisible();
  await page.getByRole("link", { name: "EN", exact: true }).click();
  await expect(page.getByText("Table 12", { exact: true })).toBeVisible();
  await expect(page).toHaveURL(/\/en\?q=/);
  const customerUrl = page.url();
  await page.goto(`${dashboard}/settings`);
  await page.getByLabel("Enable ordering").check();
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByRole("status")).toBeVisible();
  const customerContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
  });
  const customer = await customerContext.newPage();
  await customer.goto(customerUrl);
  await customer.getByRole("button", { name: "Osh", exact: true }).click();
  await customer.getByRole("button", { name: /Add to cart/ }).click();
  await customer.getByRole("button", { name: /View cart/ }).click();
  await customer
    .getByRole("button", { name: "Send order", exact: true })
    .click();
  await expect(
    customer.getByRole("heading", { name: /Order #/ }),
  ).toBeVisible();
  await customer.reload();
  await customer
    .getByRole("button", { name: "Your order", exact: true })
    .click();
  await expect(
    customer.getByRole("heading", { name: /Order #/ }),
  ).toBeVisible();
  await page.goto(`${dashboard}/orders`);
  for (const name of [
    "Accept order",
    "Start preparing",
    "Mark ready",
    "Complete order",
  ]) {
    await page.getByRole("button", { name, exact: true }).click();
  }
  await expect(
    customer.getByRole("dialog").getByText("Completed", { exact: true }),
  ).toBeVisible();
  await customer.getByRole("link", { name: "Open receipt page" }).click();
  await expect(customer).toHaveURL(/\/en\/order\/[a-f0-9-]+/);
  await page.goto(`${dashboard}/qr`);
  await page
    .getByRole("button", { name: "Deactivate QR", exact: true })
    .click();
  await customer.reload();
  await expect(customer.getByText("Completed", { exact: true })).toBeVisible();
  await customerContext.close();
  await page.goto(`${dashboard}/analytics`);
  await expect(
    page.getByRole("heading", { name: "Analytics", exact: true }),
  ).toBeVisible();
  await expect(page.getByText("Completed", { exact: true })).toBeVisible();
  await page.goto(`${dashboard}/billing`);
  await expect(
    page.getByRole("heading", { name: "Starter", exact: true }),
  ).toBeVisible();
  await page.goto(`/en/dashboard/${randomUUID()}`);
  await expect(
    page.getByRole("heading", { name: "This page was not found" }),
  ).toBeVisible();
});
test("marketing and authentication remain usable on mobile", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/en");
  await expect(page.getByRole("heading", { name: /Good food/ })).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "test-results/marketing-mobile.png",
    fullPage: true,
  });
  await page.goto("/en/login");
  await expect(page.getByLabel("Email address")).toBeVisible();
});
