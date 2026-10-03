"use client";

import { useEffect, useState } from "react";

type IntroPhase = "waiting" | "running" | "closing" | "hidden";

const skipLabels = {
  uz: "O‘tkazib yuborish",
  ru: "Пропустить",
  en: "Skip intro",
} as const;

export function MenuOpeningIntro({
  restaurantName,
  templateId,
  variant,
  locale,
  motion,
}: {
  restaurantName: string;
  templateId: string;
  variant: string;
  locale: keyof typeof skipLabels;
  motion: "subtle" | "medium" | "expressive";
}) {
  const [phase, setPhase] = useState<IntroPhase>("waiting");

  useEffect(() => {
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    const connection = (
      navigator as Navigator & { connection?: { saveData?: boolean } }
    ).connection;
    const search = new URLSearchParams(window.location.search);
    const mode = search.get("intro");
    const key = `resmen:menu-intro:${templateId}`;
    if (
      mode === "off" ||
      reduced.matches ||
      connection?.saveData ||
      (mode !== "always" && sessionStorage.getItem(key))
    ) {
      const frame = requestAnimationFrame(() => setPhase("hidden"));
      return () => cancelAnimationFrame(frame);
    }

    sessionStorage.setItem(key, "shown");
    const duration =
      motion === "expressive" ? 2400 : motion === "medium" ? 2050 : 1750;
    const frame = requestAnimationFrame(() => setPhase("running"));
    const closing = window.setTimeout(
      () => setPhase("closing"),
      duration - 420,
    );
    const hidden = window.setTimeout(() => setPhase("hidden"), duration);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPhase("hidden");
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(closing);
      clearTimeout(hidden);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [motion, templateId]);

  if (phase === "hidden") return null;
  return (
    <div
      className="menu-opening"
      data-phase={phase}
      data-intro-variant={variant}
    >
      <div className="menu-opening-grain" aria-hidden="true" />
      <div className="intro-3d-scene" aria-hidden="true">
        <div className="intro-orbit intro-orbit-one" />
        <div className="intro-orbit intro-orbit-two" />
        <div className="intro-object intro-object-back" />
        <div className="intro-object intro-object-main">
          <span />
        </div>
        <div className="intro-object intro-object-front" />
        <div className="intro-spark intro-spark-one" />
        <div className="intro-spark intro-spark-two" />
        <div className="intro-spark intro-spark-three" />
      </div>
      <div className="menu-opening-copy" aria-hidden="true">
        <small>RESMEN · DIGITAL MENU</small>
        <strong>{restaurantName}</strong>
        <span className="menu-opening-line" />
      </div>
      <button
        type="button"
        className="menu-opening-skip"
        onClick={() => setPhase("hidden")}
        aria-label={skipLabels[locale]}
      >
        {skipLabels[locale]}
      </button>
    </div>
  );
}
