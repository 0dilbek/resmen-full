import { createOrder } from "@/modules/orders/server";
import {
  assertOrigin,
  jsonBody,
  httpFailure,
  rateLimit,
} from "@/infrastructure/http/security";
import { createOrderSchema } from "@/modules/orders/validation";
export async function POST(request: Request) {
  try {
    assertOrigin(request);
    const data = createOrderSchema.parse(await jsonBody(request));
    await rateLimit(`checkout:${data.qrToken}`, 60);
    await rateLimit(`checkout-guest:${data.credential}`, 10);
    const order = await createOrder(data);
    return Response.json(order, {
      status: 201,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return httpFailure(error);
  }
}
