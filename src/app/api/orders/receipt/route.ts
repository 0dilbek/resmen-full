import { z } from "zod";
import { guestReceipt } from "@/modules/orders/server";
import { capabilitySchema } from "@/modules/orders/validation";
import {
  assertOrigin,
  jsonBody,
  httpFailure,
  rateLimit,
} from "@/infrastructure/http/security";
export async function POST(request: Request) {
  try {
    assertOrigin(request);
    const data = z
      .object({ orderId: z.uuid(), credential: capabilitySchema })
      .strict()
      .parse(await jsonBody(request));
    await rateLimit(`receipt:${data.orderId}`, 60);
    return Response.json(await guestReceipt(data), {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    return httpFailure(error);
  }
}
