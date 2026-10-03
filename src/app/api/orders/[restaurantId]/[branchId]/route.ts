import { orderBoard } from "@/modules/orders/server";
import { httpFailure } from "@/infrastructure/http/security";
export async function GET(
  request: Request,
  { params }: { params: Promise<{ restaurantId: string; branchId: string }> },
) {
  try {
    const { restaurantId, branchId } = await params;
    const url = new URL(request.url);
    const data = await orderBoard(restaurantId, branchId, {
      page: url.searchParams.get("page") ?? 1,
      status: url.searchParams.get("status") ?? "OPEN",
    });
    return Response.json(data, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    return httpFailure(error);
  }
}
