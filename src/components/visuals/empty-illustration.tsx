import "./visuals.css";
/** Decorative, original inline vector. No GPU, remote assets or uploaded SVG. */
export function EmptyIllustration({
  kind = "menu",
}: {
  kind?: "menu" | "category" | "product" | "restaurant" | "order";
}) {
  return (
    <svg className="isometric-empty" viewBox="0 0 120 100" aria-hidden="true">
      <path d="M12 70 58 94 110 64 65 41Z" fill="#e3e9dd" />
      <path d="m30 28 40-16 29 17-40 17Z" fill="#e5cf9f" />
      <path d="M30 28v39l29 17V46Z" fill="#547a63" />
      <path d="M59 46v38l40-17V29Z" fill="#b5c9b4" />
      {kind === "restaurant" ? (
        <path d="m25 28 32-24 47 25-45 21Z" fill="#c38855" />
      ) : kind === "product" ? (
        <ellipse cx="62" cy="28" rx="20" ry="11" fill="#f9f2e3" />
      ) : kind === "order" ? (
        <path
          d="m51 28 9 7 17-15"
          fill="none"
          stroke="#285746"
          strokeWidth="4"
        />
      ) : (
        <path
          d="m46 28 24-10m-15 17 24-10m-21 17 17-7"
          stroke="#fff7e8"
          strokeWidth="3"
        />
      )}
    </svg>
  );
}
