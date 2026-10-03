import { test, expect } from "@playwright/test";
for (const locale of ["uz", "ru", "en"]) {
  test(`${locale} marketing routes fit a 320px screen`, async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 760 });
    const failures: string[] = [];
    page.on("console", (m) => {
      if (m.type() === "error" && m.text().includes("MISSING_MESSAGE"))
        failures.push(m.text());
    });
    for (const path of [
      "features",
      "templates",
      "pricing",
      "faq",
      "contact",
      "privacy",
    ]) {
      const response = await page.goto(`/${locale}/${path}`);
      expect(response?.status()).toBe(200);
      await expect(page.locator("h1")).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        path,
      ).toBe(true);
    }
    expect(failures).toEqual([]);
  });
}
test("contact message is acknowledged without an external send", async ({
  page,
}) => {
  await page.goto("/en/contact");
  await page.getByLabel("Your name").fill("Restaurant Team");
  await page
    .getByLabel("Email address")
    .fill(`contact-${Date.now()}@example.test`);
  await page
    .getByLabel("Message", { exact: true })
    .fill("We need help choosing a plan for two restaurant branches.");
  await page.getByRole("button", { name: "Send message" }).click();
  await expect(page.getByRole("status")).toBeVisible();
});
