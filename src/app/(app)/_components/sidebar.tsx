"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Briefcase,
  ClipboardList,
  Brain,
  User,
  Settings,
  PanelLeft,
  PanelLeftClose,
  type LucideIcon,
} from "lucide-react";

const PRIMARY_NAV: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/jobs", label: "Jobs", icon: Briefcase },
  { href: "/applications", label: "Applications", icon: ClipboardList },
  { href: "/memory", label: "Memory", icon: Brain },
];

const SECONDARY_NAV: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/profile", label: "Profile", icon: User },
  { href: "/settings", label: "Settings", icon: Settings },
];

function NavLink({
  href,
  label,
  icon: Icon,
  active,
  badge,
  collapsed,
}: {
  href: string;
  label: string;
  icon: LucideIcon;
  active: boolean;
  badge?: number;
  collapsed: boolean;
}) {
  const hasBadge = badge != null && badge > 0;
  return (
    <Link
      href={href}
      title={collapsed ? label : undefined}
      className={`flex items-center gap-2.5 rounded-lg text-sm transition-colors ${
        collapsed ? "justify-center px-0 py-2" : "px-3 py-2"
      } ${
        active
          ? "bg-black/[0.06] font-medium text-foreground"
          : "text-muted hover:bg-black/[0.03] hover:text-foreground"
      }`}
    >
      <span className="relative shrink-0">
        <Icon size={17} strokeWidth={active ? 2.5 : 2.25} />
        {collapsed && hasBadge && (
          <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-foreground ring-2 ring-background" />
        )}
      </span>
      {!collapsed && (
        <>
          <span className="flex-1 truncate">{label}</span>
          {hasBadge && (
            <span className="shrink-0 rounded-full bg-black/[0.08] px-1.5 py-0.5 text-[10px] font-semibold leading-none text-foreground">
              {badge > 99 ? "99+" : badge}
            </span>
          )}
        </>
      )}
    </Link>
  );
}

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Sidebar({
  reviewCount = 0,
  defaultCollapsed = false,
}: {
  reviewCount?: number;
  defaultCollapsed?: boolean;
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(defaultCollapsed);

  function toggle() {
    const next = !collapsed;
    setCollapsed(next);
    // Persist across reloads; the server layout reads this to render the right
    // width on first paint (no flash).
    document.cookie = `sidebar_collapsed=${next ? "1" : "0"}; path=/; max-age=31536000; samesite=lax`;
  }

  return (
    <aside
      className={`flex shrink-0 flex-col border-r border-border bg-background transition-[width] duration-150 ${
        collapsed ? "w-16" : "w-56"
      }`}
    >
      {/* Workspace chip + collapse toggle, on one row */}
      {collapsed ? (
        <div className="p-3">
          <button
            type="button"
            onClick={toggle}
            title="Expand sidebar"
            className="group flex w-full items-center justify-center rounded-lg py-1.5 transition-colors hover:bg-black/[0.04]"
          >
            <Image
              src="/logo.png"
              alt="Employable"
              width={22}
              height={22}
              className="shrink-0 rounded group-hover:hidden"
            />
            <PanelLeft
              size={17}
              strokeWidth={2.25}
              className="hidden shrink-0 text-muted group-hover:block"
            />
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-1 p-3">
          <Link
            href="/dashboard"
            className="flex min-w-0 flex-1 items-center gap-2.5 rounded-lg px-2 py-1.5 transition-colors hover:bg-black/[0.04]"
          >
            <Image src="/logo.png" alt="Employable" width={22} height={22} className="shrink-0 rounded" />
            <span className="truncate text-sm font-semibold tracking-tight text-foreground">
              Employable
            </span>
          </Link>
          <button
            type="button"
            onClick={toggle}
            title="Collapse sidebar"
            className="shrink-0 rounded-lg p-1.5 text-muted transition-colors hover:bg-black/[0.03] hover:text-foreground"
          >
            <PanelLeftClose size={17} strokeWidth={2.25} />
          </button>
        </div>
      )}

      <nav className="mt-1 flex flex-col gap-0.5 px-3 py-1">
        {PRIMARY_NAV.map((item) => (
          <NavLink
            key={item.href}
            href={item.href}
            label={item.label}
            icon={item.icon}
            active={isActive(pathname, item.href)}
            badge={item.href === "/applications" ? reviewCount : undefined}
            collapsed={collapsed}
          />
        ))}
      </nav>

      {/* Divider between primary and account nav */}
      <div className="mx-7 my-2 border-t border-border" />

      <nav className="flex flex-col gap-0.5 px-3 py-1">
        {SECONDARY_NAV.map((item) => (
          <NavLink
            key={item.href}
            href={item.href}
            label={item.label}
            icon={item.icon}
            active={isActive(pathname, item.href)}
            collapsed={collapsed}
          />
        ))}
      </nav>

    </aside>
  );
}
