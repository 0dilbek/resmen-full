import { transitionOrder } from "@/modules/orders/server";
import {
  assertOrigin,
  jsonBody,
  httpFailure,
  rateLimit,
} from "@/infrastructure/http/security";
import { requireActor } from "@/modules/memberships/server";
export async function POST(
  request: Request,
  { params }: { params: Promise<{ restaurantId: string }> },
) {
  try {
    assertOrigin(request);
    const { restaurantId } = await params;
    const actor = await requireActor(restaurantId, "order:transition");
    await rateLimit(
      `order-transition:${actor.restaurantId}:${actor.userId}`,
      120,
    );
    return Response.json(
      await transitionOrder(restaurantId, await jsonBody(request)),
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    return httpFailure(error);
  }
}
