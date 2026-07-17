"use client";

import { useEffect, useRef, useState } from "react";
import { Bell, CheckCircle2, AlertTriangle, KeyRound, ClipboardList } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { openNotification, markAllRead } from "./notification-actions";

export interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body: string | null;
  action_url: string | null;
  read_at: string | null;
  created_at: string;
}

const ICONS: Record<string, LucideIcon> = {
  submitted: CheckCircle2,
  failed: AlertTriangle,
  awaiting_code: KeyRound,
  action_required: ClipboardList,
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return d < 7 ? `${d}d ago` : new Date(iso).toLocaleDateString();
}

export function NotificationBell({
  notifications,
  unreadCount,
}: {
  notifications: NotificationItem[];
  unreadCount: number;
}) {
  const [open, setOpen] = useState(false);
  // Ids that were unread when the dropdown was opened — keep them visually
  // highlighted for this viewing even after we mark them read on open.
  const [seen, setSeen] = useState<Set<string>>(() => new Set());
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  // Opening the dropdown = the user has seen the notifications; mark them read
  // so the unread badge clears. (Persists read_at + revalidates the layout.)
  useEffect(() => {
    if (open && unreadCount > 0) markAllRead().catch(() => {});
  }, [open, unreadCount]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => {
          if (!open) setSeen(new Set(notifications.filter((n) => !n.read_at).map((n) => n.id)));
          setOpen((o) => !o);
        }}
        aria-label="Notifications"
        className="relative flex h-9 w-9 items-center justify-center rounded-lg text-muted transition-colors hover:bg-black/[0.04] hover:text-foreground"
      >
        <Bell size={18} strokeWidth={2.25} />
        {unreadCount > 0 && (
          <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-foreground px-1 text-[10px] font-semibold leading-none text-background">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-[22rem] overflow-hidden rounded-xl border border-border bg-background shadow-card">
          <div className="flex items-center border-b border-border px-4 py-3">
            <span className="text-sm font-semibold text-foreground">Notifications</span>
          </div>

          <div className="max-h-[26rem] overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="px-4 py-10 text-center text-sm text-muted">You&apos;re all caught up.</p>
            ) : (
              notifications.map((n) => {
                const Icon = ICONS[n.type] ?? Bell;
                const unread = seen.has(n.id);
                return (
                  <form key={n.id} action={openNotification}>
                    <input type="hidden" name="id" value={n.id} />
                    <input type="hidden" name="href" value={n.action_url ?? "/applications"} />
                    <button
                      type="submit"
                      className={`flex w-full gap-3 border-b border-border/60 px-4 py-3 text-left transition-colors last:border-0 hover:bg-black/[0.03] ${
                        unread ? "bg-black/[0.02]" : ""
                      }`}
                    >
                      <span
                        className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
                          unread ? "bg-black/[0.06] text-foreground" : "bg-black/[0.03] text-muted"
                        }`}
                      >
                        <Icon size={15} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          <span className="truncate text-sm font-medium text-foreground">{n.title}</span>
                          {unread && <span aria-hidden className="h-1.5 w-1.5 shrink-0 rounded-full bg-red-500" />}
                        </span>
                        {n.body && <span className="mt-0.5 line-clamp-2 block text-xs text-muted">{n.body}</span>}
                        <span className="mt-1 block text-[11px] text-muted">{timeAgo(n.created_at)}</span>
                      </span>
                    </button>
                  </form>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
