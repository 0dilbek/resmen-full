"use client";
import { useEffect, useRef, useState } from "react";
/** One policy for CSS motion, pointer depth and GPU enhancement. Defaults static during SSR. */
export function useVisualPolicy(enabled = true) {
  const ref = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);
  useEffect(() => {
    const node = ref.current;
    if (!node || !enabled) return;
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    const connection = (
      navigator as Navigator & {
        connection?: EventTarget & { saveData?: boolean };
      }
    ).connection;
    let visible = false;
    const update = () =>
      setActive(
        visible &&
          !document.hidden &&
          !media.matches &&
          !connection?.saveData &&
          (navigator.hardwareConcurrency || 4) > 2,
      );
    const observer = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
        update();
      },
      { threshold: 0.05 },
    );
    observer.observe(node);
    media.addEventListener("change", update);
    connection?.addEventListener("change", update);
    document.addEventListener("visibilitychange", update);
    return () => {
      observer.disconnect();
      media.removeEventListener("change", update);
      connection?.removeEventListener("change", update);
      document.removeEventListener("visibilitychange", update);
    };
  }, [enabled]);
  return { ref, active: enabled && active };
}
