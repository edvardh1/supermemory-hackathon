"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Search, LayoutDashboard, Briefcase, ClipboardList, Brain, User, Settings,
  type LucideIcon,
} from "lucide-react";

const NAV: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/jobs", label: "Jobs", icon: Briefcase },
  { href: "/applications", label: "Applications", icon: ClipboardList },
  { href: "/memory", label: "Memory", icon: Brain },
  { href: "/profile", label: "Profile", icon: User },
  { href: "/settings", label: "Settings", icon: Settings },
];

/** Sidebar "Find" box + ⌘K command palette: jump to a page or search jobs. */
export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setQ("");
        setActive(0);
        setOpen((o) => !o);
      } else if (e.key === "Escape") {
        setOpen(false);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const go = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  const query = q.trim();
  const matches = NAV.filter((n) => n.label.toLowerCase().includes(query.toLowerCase()));

  // Unified, keyboard-navigable result list: matching pages, then a jobs search.
  const items: { key: string; label: string; icon: LucideIcon; href: string }[] = [
    ...matches.map((n) => ({ key: n.href, label: n.label, icon: n.icon, href: n.href })),
    ...(query
      ? [{ key: "search-jobs", label: `Search jobs for “${query}”`, icon: Briefcase, href: `/jobs?q=${encodeURIComponent(query)}` }]
      : []),
  ];
  const activeIdx = Math.min(active, Math.max(items.length - 1, 0));

  return (
    <>
      <button
        onClick={() => {
          setQ("");
          setActive(0);
          setOpen(true);
        }}
        className="flex w-full items-center gap-2 rounded-lg border border-border bg-black/[0.015] px-3 py-1.5 text-sm text-muted transition-colors hover:border-foreground/30"
      >
        <Search size={15} strokeWidth={2.25} className="shrink-0" />
        <span className="flex-1 text-left">Search</span>
        <kbd className="shrink-0 rounded border border-border px-1 text-[10px] leading-4 text-muted">⌘K</kbd>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[200] flex items-start justify-center bg-black/30 p-4 pt-[14vh]"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-lg overflow-hidden rounded-xl border border-border bg-background shadow-card"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2.5 border-b border-border px-4">
              <Search size={16} className="shrink-0 text-muted" />
              <input
                ref={inputRef}
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setActive(0);
                }}
                placeholder="Search or jump to…"
                className="w-full bg-transparent py-3.5 text-sm text-foreground outline-none placeholder:text-muted"
                onKeyDown={(e) => {
                  if (e.key === "ArrowDown") {
                    e.preventDefault();
                    setActive((a) => Math.min(a + 1, items.length - 1));
                  } else if (e.key === "ArrowUp") {
                    e.preventDefault();
                    setActive((a) => Math.max(a - 1, 0));
                  } else if (e.key === "Enter") {
                    e.preventDefault();
                    const it = items[activeIdx];
                    if (it) go(it.href);
                  }
                }}
              />
            </div>
            <ul className="max-h-80 overflow-y-auto p-2">
              {items.map((it, i) => {
                const Icon = it.icon;
                return (
                  <li key={it.key}>
                    <button
                      onClick={() => go(it.href)}
                      onMouseMove={() => setActive(i)}
                      className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-foreground transition-colors ${
                        i === activeIdx ? "bg-black/[0.06]" : ""
                      }`}
                    >
                      <Icon size={16} className="text-muted" />
                      {it.label}
                    </button>
                  </li>
                );
              })}
              {!items.length && (
                <li className="px-3 py-6 text-center text-sm text-muted">No results.</li>
              )}
            </ul>
          </div>
        </div>
      )}
    </>
  );
}
