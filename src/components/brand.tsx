import Link from "next/link";
export function Brand({
  href = "/uz",
  inverse = false,
}: {
  href?: string;
  inverse?: boolean;
}) {
  return (
    <Link
      className={`brand ${inverse ? "brand-inverse" : ""}`}
      href={href}
      aria-label="Resmen"
    >
      <svg
        width="32"
        height="36"
        viewBox="0 0 32 36"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M4 32V16C4 9 8 5 16 2c8 3 12 7 12 14v16h-7V17c0-4-1-6-5-8-4 2-5 4-5 8v15H4Z"
          fill="currentColor"
        />
        <path d="m17 23 11 9h-9l-8-7 6-2Z" fill="currentColor" />
      </svg>
      <span>
        resmen<span className="brand-dot">.</span>
      </span>
    </Link>
  );
}
