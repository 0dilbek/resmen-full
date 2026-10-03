"use client";
import dynamic from "next/dynamic";
import { Component, useState, type ReactNode } from "react";
import { useVisualPolicy } from "./use-visual-policy";
import "./visuals.css";
const CanvasScene = dynamic(() => import("./scene-canvas"), { ssr: false });
class SceneBoundary extends Component<
  { children: ReactNode; onFailure: () => void },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    this.props.onFailure();
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}
export function Scene3D({
  children,
  variant = "hero",
  enabled = true,
}: {
  children: ReactNode;
  variant?: "hero" | "plate";
  enabled?: boolean;
}) {
  const { ref, active } = useVisualPolicy(enabled);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  return (
    <div
      ref={ref}
      className={`visual-scene visual-${variant}`}
      data-ready={ready && active && !failed}
    >
      <div className="visual-fallback">{children}</div>
      {active && !failed && (
        <div className="visual-canvas" aria-hidden="true">
          <SceneBoundary onFailure={() => setFailed(true)}>
            <CanvasScene
              variant={variant}
              onReady={() => setReady(true)}
              onFailure={() => setFailed(true)}
            />
          </SceneBoundary>
        </div>
      )}
    </div>
  );
}
