import { test, expect } from "@playwright/test";
test("reduced-motion renders the landing fallback and menus without a GPU", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/en");
  await expect(page.locator(".visual-fallback .phone-mock")).toBeVisible();
  await expect(page.locator(".visual-canvas")).toHaveCount(0);
  await page.goto("/en/templates/food-cards-3d");
  await expect(page.locator(".menu-opening")).not.toBeVisible();
  await expect(page.locator(".motion-surface")).toHaveAttribute(
    "data-active",
    "false",
  );
  await expect(page.locator("canvas")).toHaveCount(0);
  await page
    .getByRole("button", { name: "Celebration plov", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
});
test("menus open with a skippable template-specific 3D intro", async ({
  page,
}) => {
  await page.goto("/en/templates/food-cards-3d?intro=always");
  const premiumIntro = page.locator(".menu-opening");
  await expect(premiumIntro).toBeVisible();
  await expect(premiumIntro).toHaveAttribute("data-intro-variant", "gallery");
  await expect(premiumIntro.locator(".intro-3d-scene")).toBeVisible();
  await page.getByRole("button", { name: "Skip intro" }).click();
  await expect(premiumIntro).toHaveCount(0);

  await page.goto("/en/templates/minimal-01?intro=always");
  await expect(page.locator(".menu-opening")).toHaveAttribute(
    "data-intro-variant",
    "minimal",
  );
});
test("WebGL failure keeps the static landing composition usable", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (
      this: HTMLCanvasElement,
      context: string,
      ...args: unknown[]
    ) {
      if (context.includes("webgl")) return null;
      return Reflect.apply(original, this, [context, ...args]);
    } as typeof original;
  });
  await page.goto("/en");
  await expect(page.locator(".visual-fallback .phone-mock")).toBeVisible();
  await page.getByRole("link", { name: "Explore a menu", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Navro‘z", exact: true }),
  ).toBeVisible();
});
test("all premium layouts fit common phones and tablet", async ({ page }) => {
  test.setTimeout(180000);
  const { premiumTemplateIds } =
    await import("../../src/modules/templates/premium/catalog");
  for (const id of premiumTemplateIds) {
    await page.goto(`/en/templates/${id}`);
    for (const width of [375, 390, 430, 768]) {
      await page.setViewportSize({ width, height: 844 });
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        `${id} at ${width}`,
      ).toBe(true);
    }
  }
});
