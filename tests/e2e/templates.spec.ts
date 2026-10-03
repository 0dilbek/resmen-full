import { templateIds } from "../../src/modules/templates/registry";
import { test, expect } from "@playwright/test";
for (const id of templateIds) {
  test(`${id} shares mobile search and keyboard detail behavior`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 320, height: 844 });
    await page.goto(`/en/templates/${id}`);
    await expect(
      page.getByRole("heading", { name: "Navro‘z", exact: true }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    // The dense mobile layout must preserve usable controls, including sold-out items.
    await expect(
      page.getByText("Sold out", { exact: true }).first(),
    ).toBeVisible();
    await page.getByLabel("Search the menu").fill("Green tea");
    await expect(
      page.getByRole("heading", { name: "Celebration plov", exact: true }),
    ).not.toBeVisible();
    await page.getByRole("button", { name: "Green tea", exact: true }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).not.toBeVisible();
  });
}
test("public menu content exists without JavaScript", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto("/r/navroz/main/en");
  await expect(
    page.getByRole("heading", { name: "Celebration plov", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "From the kitchen", exact: true }),
  ).toHaveAttribute("href", /^#category-/);
  await context.close();
});
