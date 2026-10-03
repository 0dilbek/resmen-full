import createMiddleware from "next-intl/middleware";
import { NextResponse, NextRequest } from "next/server";
import { routing } from "./i18n/routing";
import { isLocale } from "./i18n/config";
const localized = createMiddleware(routing);
export default function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const policy = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' blob: data:",
    "font-src 'self'",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'self'",
  ].join("; ");
  const headers = new Headers(request.headers);
  headers.set("x-nonce", nonce);
  headers.set("Content-Security-Policy", policy);
  let response: NextResponse;
  if (request.nextUrl.pathname.startsWith("/r/")) {
    const language = request.nextUrl.pathname.split("/")[4];
    headers.set("X-NEXT-INTL-LOCALE", isLocale(language) ? language : "uz");
    response = NextResponse.next({ request: { headers } });
  } else {
    response = localized(new NextRequest(request, { headers }));
  }
  response.headers.set("Content-Security-Policy", policy);
  return response;
}
export const config = { matcher: ["/", "/(uz|ru|en)/:path*", "/r/:path*"] };
