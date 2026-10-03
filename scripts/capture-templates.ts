import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import {
  templates,
  templatePreviewVersion,
  previewVersion,
} from "../src/modules/templates/registry";
async function main() {
  const browser = await chromium.launch();
  try {
    for (const template of templates.filter(
      (t) => process.env.CAPTURE_COLLECTION !== "premium" || t.premium,
    )) {
      const directory = `public/template-previews/${template.id}/${previewVersion(template)}`;
      await mkdir(directory, { recursive: true });
      for (const [name, viewport] of Object.entries({
        mobile: { width: 390, height: 650 },
        desktop: { width: 1440, height: 900 },
      })) {
        const page = await browser.newPage({ viewport });
        await page.goto(`http://localhost:3000/en/templates/${template.id}`, {
          waitUntil: "networkidle",
        });
        await page.locator(`[data-template="${template.id}"]`).waitFor();
        await page.screenshot({ path: `${directory}/${name}.png` });
        await page.close();
      }
    }
    await writeFile(
      "public/template-previews/manifest.json",
      JSON.stringify(
        {
          rendererVersions: { legacy: templatePreviewVersion, premium: 3 },
          captureScope: process.env.CAPTURE_COLLECTION ?? "all",
          previewVersion,

          locale: "en",
          capturedAt: new Date().toISOString(),
          templates: templates.map((t) => ({
            id: t.id,
            version: previewVersion(t),
            fixture: t.premium
              ? "immutable-showcase-v2"
              : "immutable-showcase-v1",
          })),
        },
        null,
        2,
      ),
    );
  } finally {
    await browser.close();
  }
}
main().catch(() => {
  console.error("Template capture failed; verify local standalone server.");
  process.exitCode = 1;
});
