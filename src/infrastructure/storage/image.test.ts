import { describe, it, expect } from "vitest";
import sharp from "sharp";
import { normalizeImage } from "./image";
describe("image validation", () => {
  it("rejects SVG disguised as an image", async () => {
    await expect(
      normalizeImage(
        Buffer.from(
          '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="10" height="10"/></svg>',
        ),
      ),
    ).rejects.toThrow();
  });
  it("re-encodes safe images into four bounded webp variants", async () => {
    const image = await sharp({
      create: { width: 120, height: 80, channels: 3, background: "#244b3f" },
    })
      .png()
      .toBuffer();
    const result = await normalizeImage(image);
    expect(result.variants).toHaveLength(4);
    const metadata = await sharp(result.variants[0].bytes).metadata();
    expect(metadata.format).toBe("webp");
    expect(metadata.width).toBe(120);
    expect(metadata.exif).toBeUndefined();
  });
});
