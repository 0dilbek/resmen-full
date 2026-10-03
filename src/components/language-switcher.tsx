"use client";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { locales } from "@/i18n/config";
export function LanguageSwitcher() {
  const path = usePathname();
  return (
    <nav className="language-switcher" aria-label="Language">
      {locales.map((locale) => (
        <Link
          lang={locale}
          key={locale}
          href={path.replace(/^\/(uz|ru|en)(?=\/|$)/, `/${locale}`)}
          aria-current={path.startsWith(`/${locale}`) ? "page" : undefined}
        >
          {locale.toUpperCase()}
        </Link>
      ))}
    </nav>
  );
}
