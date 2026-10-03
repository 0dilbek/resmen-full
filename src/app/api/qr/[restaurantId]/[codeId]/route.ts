import { z } from "zod";
import { authorizedCode, qrImage } from "@/modules/qr/server";
import { httpFailure, rateLimit } from "@/infrastructure/http/security";
export async function GET(
  request: Request,
  { params }: { params: Promise<{ restaurantId: string; codeId: string }> },
) {
  try {
    const { restaurantId, codeId } = await params;
    const { actor, code } = await authorizedCode(restaurantId, codeId);
    await rateLimit(`qr-export:${actor.userId}:${actor.restaurantId}`, 60);
    const format = z
      .enum(["png", "svg"])
      .parse(new URL(request.url).searchParams.get("format") ?? "png");
    const bytes = await qrImage(code.token, format);
    return new Response(
      typeof bytes === "string" ? bytes : new Uint8Array(bytes),
      {
        headers: {
          "Content-Type": format === "svg" ? "image/svg+xml" : "image/png",
          "Content-Disposition": `attachment; filename="ravoq-${code.id}.${format}"`,
          "Cache-Control": "private, no-store",
          "Content-Security-Policy": "default-src 'none'; sandbox",
        },
      },
    );
  } catch (error) {
    return httpFailure(error);
  }
}
