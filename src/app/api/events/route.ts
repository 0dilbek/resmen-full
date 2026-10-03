import { recordPublicEvent } from "@/modules/analytics/server";
import {
  assertOrigin,
  jsonBody,
  httpFailure,
} from "@/infrastructure/http/security";
export async function POST(request: Request) {
  try {
    assertOrigin(request);
    await recordPublicEvent(await jsonBody(request, 2048));
    return new Response(null, {
      status: 204,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return httpFailure(error);
  }
}
