import { templateIds } from "../../src/modules/templates/registry";
import { test, expect } from "@playwright/test";
import { AxeBuilder } from "@axe-core/playwright";
for (const path of [
  "/en",
  "/en/register",
  "/en/contact",
  "/en/pricing",
  ...templateIds.map((id) => `/en/templates/${id}`),
]) {
  test(`accessible landmarks and contrast ${path}`, async ({ page }) => {
    await page.goto(path);
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(
      results.violations.map((v) => ({
        id: v.id,
        nodes: v.nodes.map((n) => ({
          target: n.target,
          summary: n.failureSummary,
        })),
      })),
    ).toEqual([]);
  });
}

test("detail sheets retain contrast across light and dark compositions", async ({
  page,
}) => {
  for (const id of [
    "luxury-01",
    "dark-luxury",
    "cyberpunk",
    "scrapbook",
    "terminal",
    "dynamic-brand",
  ]) {
    await page.goto(`/en/templates/${id}`);
    await page
      .getByRole("button", { name: "Celebration plov", exact: true })
      .click();
    await expect(page.getByRole("dialog")).toBeVisible();
    const result = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(
      result.violations.map((v) => ({
        id: v.id,
        nodes: v.nodes.map((n) => n.target),
      })),
      id,
    ).toEqual([]);
    await page.keyboard.press("Escape");
  }
});
