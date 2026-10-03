"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import {
  LayoutDashboard,
  UtensilsCrossed,
  Layers,
  Palette,
  QrCode,
  ShoppingBag,
  Users,
  GitBranch,
  BarChart3,
  Settings,
  CreditCard,
  SlidersHorizontal,
  PanelLeftClose,
  PanelLeftOpen,
  LogOut,
} from "lucide-react";
import { useState } from "react";
import { Brand } from "@/components/brand";
import { can, type Role, type Permission } from "@/modules/memberships/policy";
import { authClient } from "@/modules/auth/client";
import { useRouter } from "next/navigation";
const links = [
  {
    key: "dashboard",
    path: "",
    icon: LayoutDashboard,
    permission: "restaurant:read",
  },
  {
    key: "products",
    path: "products",
    icon: UtensilsCrossed,
    permission: "catalog:read",
  },
  {
    key: "categories",
    path: "categories",
    icon: Layers,
    permission: "catalog:read",
  },
  {
    key: "modifiers",
    path: "modifiers",
    icon: SlidersHorizontal,
    permission: "catalog:manage",
  },
  {
    key: "templates",
    path: "templates",
    icon: Palette,
    permission: "template:manage",
  },
  { key: "qr", path: "qr", icon: QrCode, permission: "qr:manage" },
  {
    key: "orders",
    path: "orders",
    icon: ShoppingBag,
    permission: "order:read",
  },
  {
    key: "analytics",
    path: "analytics",
    icon: BarChart3,
    permission: "analytics:read",
  },
  {
    key: "branches",
    path: "branches",
    icon: GitBranch,
    permission: "branch:manage",
  },
  { key: "team", path: "team", icon: Users, permission: "member:manage" },
  {
    key: "settings",
    path: "settings",
    icon: Settings,
    permission: "restaurant:update",
  },
  {
    key: "billing",
    path: "billing",
    icon: CreditCard,
    permission: "billing:manage",
  },
] as const satisfies readonly {
  key: string;
  path: string;
  icon: typeof LayoutDashboard;
  permission: Permission;
}[];
export function Navigation({
  restaurantId,
  name,
  role,
  userName,
}: {
  restaurantId: string;
  name: string;
  role: Role;
  userName: string;
}) {
  const path = usePathname();
  const locale = useLocale();
  const t = useTranslations();
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const base = `/${locale}/dashboard/${restaurantId}`;
  return (
    <>
      <button
        className="mobile-nav-toggle button button-outline"
        aria-label={t("workspace")}
        aria-expanded={open}
        aria-controls="dashboard-nav"
        onClick={() => setOpen(!open)}
      >
        {open ? <PanelLeftClose size={20} /> : <PanelLeftOpen size={20} />}
      </button>
      {open && (
        <button
          className="nav-backdrop"
          aria-label={t("cancel")}
          onClick={() => setOpen(false)}
        />
      )}
      <aside
        id="dashboard-nav"
        className={`sidebar ${open ? "sidebar-open" : ""}`}
      >
        <Brand href={`/${locale}/dashboard`} />
        <Link className="restaurant-switch" href={`/${locale}/dashboard`}>
          <span className="restaurant-avatar">{name.slice(0, 1)}</span>
          <span>
            <strong>{name}</strong>
            <small>{t(role.toLowerCase())}</small>
          </span>
          <span>⌄</span>
        </Link>
        <span className="nav-label">{t("workspace")}</span>
        <nav>
          {links
            .filter((link) => can(role, link.permission))
            .map((link) => (
              <Link
                onClick={() => setOpen(false)}
                href={`${base}${link.path ? `/${link.path}` : ""}`}
                key={link.key}
                className={
                  path === `${base}${link.path ? `/${link.path}` : ""}`
                    ? "nav-active"
                    : ""
                }
              >
                <link.icon size={17} />
                {t(link.key)}
              </Link>
            ))}
        </nav>
        <div className="sidebar-bottom">
          <Link href={`/${locale}/account`}>
            <span className="user-avatar">{userName.slice(0, 1)}</span>
            <span>
              <strong>{userName}</strong>
              <small>{t("account")}</small>
            </span>
          </Link>
          <button
            aria-label={t("logout")}
            onClick={async () => {
              await authClient.signOut();
              router.push(`/${locale}/login`);
              router.refresh();
            }}
          >
            <LogOut size={17} />
          </button>
        </div>
      </aside>
    </>
  );
}
