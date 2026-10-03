"use client";
import type { ReactNode } from "react";
import { useVisualPolicy } from "./use-visual-policy";
import "./visuals.css";
export function MotionSurface({
  children,
  enabled = true,
  depth = false,
}: {
  children: ReactNode;
  enabled?: boolean;
  depth?: boolean;
}) {
  const { ref, active } = useVisualPolicy(enabled);
  return (
    <div
      ref={ref}
      className="motion-surface"
      data-active={active}
      data-depth={depth && active}
      onPointerMove={
        depth && active
          ? (event) => {
              if (event.pointerType !== "mouse") return;
              const card = (event.target as Element).closest<HTMLElement>(
                ".menu-product",
              );
              if (!card) return;
              const r = card.getBoundingClientRect();
              card.style.setProperty(
                "--tilt-x",
                `${Math.max(-3, Math.min(3, ((event.clientY - r.top) / r.height) * 6 - 3))}deg`,
              );
              card.style.setProperty(
                "--tilt-y",
                `${Math.max(-3, Math.min(3, 3 - ((event.clientX - r.left) / r.width) * 6))}deg`,
              );
            }
          : undefined
      }
      onPointerOut={
        depth
          ? (event) => {
              const card = (event.target as Element).closest<HTMLElement>(
                ".menu-product",
              );
              card?.style.removeProperty("--tilt-x");
              card?.style.removeProperty("--tilt-y");
            }
          : undefined
      }
    >
      {children}
    </div>
  );
}
