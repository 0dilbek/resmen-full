import { test, expect } from "@playwright/test";
import { readdir, readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { templateIds } from "../../src/modules/templates/registry";

test("every private template handles long Cyrillic content and no photographs", async ({
  page,
}) => {
  test.setTimeout(300000);
  const email = `layout-${randomUUID()}@example.test`;
  const restaurant = "Чайхана «Гостеприимный дворик» — семейные традиции";
  const dish =
    "Праздничный плов по старинному семейному рецепту с жёлтой морковью и нутом";
  await page.goto("/en/register");
  await page.getByLabel("Your name").fill("Layout Tester");
  await page.getByLabel("Email address").fill(email);
  await page
    .getByLabel("Password", { exact: true })
    .fill("Layout-fixture-password-2026!");
  await page.getByRole("button", { name: "Get started", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Check your email");
  let verification = "";
  for (const filename of await readdir(".local/mail")) {
    const mail = JSON.parse(
      await readFile(`.local/mail/${filename}`, "utf8"),
    ) as { to: string; url: string };
    if (mail.to === email) verification = mail.url;
  }
  expect(verification).toContain("/verify-email");
  await page.goto(verification);
  await page.getByLabel("Restaurant name").fill(restaurant);
  await page.getByLabel("Menu address").fill(`layout-${randomUUID()}`);
  await page
    .getByRole("button", { name: "Create restaurant", exact: true })
    .click();
  await expect(page).toHaveURL(/\/en\/dashboard\/[a-f0-9-]{36}$/);
  const dashboard = page.url();
  await page.goto(`${dashboard}/categories`);
  await page
    .getByLabel("Category name · UZ")
    .fill("Традиционные праздничные блюда нашей семьи");
  await page.getByRole("button", { name: "Add category", exact: true }).click();
  await expect(
    page.getByRole("heading", {
      name: "Традиционные праздничные блюда нашей семьи",
      exact: true,
    }),
  ).toBeVisible();
  await page.goto(`${dashboard}/products/new`);
  await page.getByLabel("Product name · UZ").fill(dish);
  await page.getByLabel("Price · UZS").fill("48000");
  await page.getByLabel("Published", { exact: true }).check();
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page).toHaveURL(/\/products\?branch=/);
  await page.goto(`${dashboard}/templates`, { waitUntil: "domcontentloaded" });
  const editorial = page.locator(".studio-template-card").filter({
    has: page.getByRole("heading", {
      name: "Editorial Magazine",
      exact: true,
    }),
  });
  await editorial
    .getByRole("button", { name: "Use template", exact: true })
    .click();
  await page.getByLabel("Heading font", { exact: true }).selectOption("mono");
  await page.getByLabel("Image shape", { exact: true }).selectOption("circle");
  const iframe = page.frameLocator(".live-preview iframe");
  await expect(iframe.locator("main[data-template]")).toHaveAttribute(
    "data-template",
    "editorial-magazine",
  );
  await expect(iframe.locator("main[data-template]")).toHaveAttribute(
    "data-image-style",
    "circle",
  );
  await expect(
    iframe.getByRole("heading", { name: restaurant, exact: true }),
  ).toBeVisible();
  await page
    .getByRole("link", { name: "Preview · Dark Luxury", exact: true })
    .click();
  const modal = page.getByRole("dialog");
  await expect(modal).toBeVisible();
  await modal.getByRole("button", { name: "Tablet", exact: true }).click();
  await expect(modal.locator(".device-tablet")).toBeVisible();
  await expect(
    page
      .frameLocator(".design-preview-dialog iframe")
      .locator("main[data-template]"),
  ).toHaveAttribute("data-template", "dark-luxury");
  await modal.getByRole("button", { name: "Close", exact: true }).click();
  await expect(page.getByLabel("Heading font", { exact: true })).toHaveValue(
    "mono",
  );
  await expect(iframe.locator("main[data-template]")).toHaveAttribute(
    "data-template",
    "editorial-magazine",
  );
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Publish design", exact: true }),
  ).toBeEnabled();
  await page.reload();
  await expect(page.getByLabel("Image shape", { exact: true })).toHaveValue(
    "circle",
  );
  await expect(page.getByLabel("Heading font", { exact: true })).toHaveValue(
    "mono",
  );

  await page
    .getByRole("button", { name: "Classic collection", exact: true })
    .click();
  const href = await page
    .getByRole("link", { name: "Preview · Everyday", exact: true })
    .getAttribute("href");
  expect(href).toBeTruthy();
  const preview = new URL(href!, page.url());
  preview.pathname = preview.pathname.replace("/en/", "/ru/");
  await page.setViewportSize({ width: 320, height: 844 });
  for (const id of templateIds) {
    await test.step(id, async () => {
      preview.searchParams.set("template", id);
      await page.goto(preview.href);
      await expect(
        page.getByRole("heading", { name: restaurant, exact: true }),
      ).toBeVisible();
      await expect(page.locator(".menu-product-photo")).toHaveCount(0);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        id,
      ).toBe(true);
      await page.getByRole("button", { name: dish, exact: true }).click();
      await expect(page.getByRole("dialog")).toBeVisible();
      await page.keyboard.press("Escape");
      await page.setViewportSize({ width: 1440, height: 900 });
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        `${id} desktop`,
      ).toBe(true);
      await page.setViewportSize({ width: 320, height: 844 });
    });
  }
});
