/** Original stylized solid forms for marketing; vector depth without a WebGL context. */
export function FoodObject({
  kind,
}: {
  kind: "cup" | "burger" | "plate" | "croissant" | "cake";
}) {
  return (
    <svg viewBox="0 0 160 120" className="food-object" aria-hidden="true">
      <ellipse cx="80" cy="103" rx="54" ry="9" fill="#dfe5d8" />
      {kind === "cup" && (
        <>
          <ellipse cx="78" cy="96" rx="55" ry="17" fill="#d5c4a1" />
          <path
            d="M112 42c42-10 42 43-4 35"
            fill="none"
            stroke="#c9b491"
            strokeWidth="11"
          />
          <path d="M38 36h77v41c-3 30-73 30-77 0Z" fill="#e9d9b9" />
          <path
            d="M38 36h14v45c4 8 12 12 21 14-20-1-32-9-35-18Z"
            fill="#c9b491"
          />
          <ellipse cx="76" cy="36" rx="39" ry="17" fill="#f1e4c9" />
          <ellipse cx="76" cy="36" rx="31" ry="12" fill="#70513e" />
          <path d="M60 35q16-20 33 0-13 20-33 0" fill="#dbc39b" />
        </>
      )}
      {kind === "burger" && (
        <>
          <path d="M28 79h106q-4 25-53 25T28 79" fill="#bd8646" />
          <path
            d="M27 76q53 16 107 0"
            fill="none"
            stroke="#674331"
            strokeWidth="19"
          />
          <path
            d="m25 67 20 10 17-8 20 9 22-8 27 7"
            fill="none"
            stroke="#64814b"
            strokeWidth="12"
          />
          <path d="M25 58q2-40 55-42t56 42q-55 22-111 0" fill="#dfac61" />
          <path
            d="m49 37 6 3m27-13 6 4m21 12 6 3"
            stroke="#f4dfb1"
            strokeWidth="4"
          />
        </>
      )}
      {kind === "plate" && (
        <>
          <ellipse cx="80" cy="75" rx="66" ry="34" fill="#cbbfa6" />
          <ellipse cx="80" cy="68" rx="66" ry="34" fill="#f4ecd9" />
          <ellipse
            cx="80"
            cy="68"
            rx="50"
            ry="23"
            fill="none"
            stroke="#ccb386"
            strokeWidth="3"
          />
          <ellipse cx="80" cy="68" rx="29" ry="17" fill="#c8944e" />
          <path d="M71 66q5-26 22-16-2 16-22 16" fill="#5a7752" />
        </>
      )}
      {kind === "croissant" && (
        <>
          <path
            d="M24 79q1-58 58-58t56 58l-24-4q-3-29-32-27T49 79Z"
            fill="#b97c3d"
          />
          <path
            d="M26 73q3-58 56-58t53 58l-22-5q-9-33-31-29T48 76Z"
            fill="#dda858"
          />
          <path
            d="m48 30 15 20m9-34 6 24m24-19-8 23m29-6-14 17"
            stroke="#bc823e"
            strokeWidth="6"
          />
        </>
      )}
      {kind === "cake" && (
        <>
          <path d="m32 50 76-28 29 48-74 26Z" fill="#e6c58a" />
          <path d="m32 50 31 46v17L32 68Z" fill="#a87143" />
          <path d="m63 96 74-26v17l-74 26Z" fill="#c39b62" />
          <path
            d="m62 81 66-24m-67 10 58-21"
            stroke="#f5e5c4"
            strokeWidth="7"
          />
          <ellipse cx="84" cy="40" rx="14" ry="9" fill="#f3e7d0" />
          <circle cx="86" cy="30" r="8" fill="#a9543a" />
        </>
      )}
    </svg>
  );
}
