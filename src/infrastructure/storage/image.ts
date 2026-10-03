import sharp from "sharp";
import { AppError } from "@/infrastructure/errors";
export const imageWidths = [320, 640, 960, 1440] as const;
export async function normalizeImage(input: Buffer) {
  if (input.length > 8 * 1024 * 1024 || input.length < 12)
    throw new AppError("INVALID_INPUT");
  const metadata = await sharp(input, {
    limitInputPixels: 24_000_000,
    failOn: "warning",
  })
    .metadata()
    .catch(() => {
      throw new AppError("INVALID_INPUT", 400);
    });
  if (
    !["jpeg", "png", "webp"].includes(metadata.format ?? "") ||
    (metadata.pages ?? 1) > 1 ||
    !metadata.width ||
    !metadata.height
  )
    throw new AppError("INVALID_INPUT");
  const variants = [];
  for (const width of imageWidths) {
    const bytes = await sharp(input, {
      limitInputPixels: 24_000_000,
      failOn: "warning",
    })
      .timeout({ seconds: 10 })
      .rotate()
      .resize({ width, withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer();
    variants.push({ width, bytes });
  }
  return { variants, width: metadata.width, height: metadata.height };
}
