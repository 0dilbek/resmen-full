import { recordQrScan } from "@/modules/analytics/server";
import { resolveQr } from "@/modules/qr/server";
import { AppError } from "@/infrastructure/errors";
import { env } from "@/infrastructure/env";
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  try {
    const { token } = await params;
    const q = await resolveQr(token);
    try {
      await recordQrScan({
        restaurantId: q.restaurant.id,
        branchId: q.branch.id,
        menuId: q.menu.id,
        locale: q.settings.defaultLocale,
      });
    } catch {
      console.warn("QR analytics unavailable");
    }
    const destination = new URL(
      `/r/${q.restaurant.slug}/${q.branch.slug}/${q.settings.defaultLocale}`,
      env().APP_URL,
    );
    if (q.table) destination.searchParams.set("q", token);
    return new Response(null, {
      status: 302,
      headers: {
        Location: destination.toString(),
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    if (error instanceof AppError)
      return new Response(null, {
        status: 404,
        headers: { "Cache-Control": "no-store" },
      });
    throw error;
  }
}
