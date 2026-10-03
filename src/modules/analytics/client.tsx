"use client";
import { useEffect } from "react";
export function emitMenuEvent(
  kind: "PRODUCT_VIEW" | "CART_ADD",
  productId: string,
) {
  window.dispatchEvent(
    new CustomEvent("ravoq:menu-event", { detail: { kind, productId } }),
  );
}
export function MenuAnalytics({
  slug,
  branch,
  locale,
}: {
  slug: string;
  branch: string;
  locale: string;
}) {
  useEffect(() => {
    let alive = true;
    const send = (kind: string, productId?: string) => {
      if (!alive) return;
      void fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: crypto.randomUUID(),
          slug,
          branch,
          locale,
          kind,
          productId,
        }),
        keepalive: true,
      }).catch(() => {
        /* Optional telemetry must not interrupt browsing. */
      });
    };
    const timer = setTimeout(() => send("MENU_VIEW"), 500);
    const listener = (event: Event) => {
      if (event instanceof CustomEvent) {
        const d = event.detail as { kind: string; productId: string };
        send(d.kind, d.productId);
      }
    };
    window.addEventListener("ravoq:menu-event", listener);
    return () => {
      alive = false;
      clearTimeout(timer);
      window.removeEventListener("ravoq:menu-event", listener);
    };
  }, [slug, branch, locale]);
  return null;
}
