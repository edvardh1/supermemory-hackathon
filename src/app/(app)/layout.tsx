import { Suspense } from "react";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "./_components/sidebar";
import { NotificationBell, type NotificationItem } from "./_components/notification-bell";
import { Toaster } from "./_components/toaster";
import { CommandPalette } from "./_components/command-palette";
import { Headset } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const cookieStore = await cookies();
  const sidebarCollapsed = cookieStore.get("sidebar_collapsed")?.value === "1";

  const [{ data: notifications }, { count: unread }, { count: reviewCount }] = await Promise.all([
    supabase
      .from("notifications")
      .select("id, type, title, body, action_url, read_at, created_at")
      .eq("profile_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("profile_id", user.id)
      .is("read_at", null),
    supabase
      .from("applications")
      .select("id", { count: "exact", head: true })
      .eq("profile_id", user.id)
      .eq("status", "needs_review"),
  ]);

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar reviewCount={reviewCount ?? 0} defaultCollapsed={sidebarCollapsed} />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex h-12 shrink-0 items-center justify-end gap-2 border-b border-border bg-background px-4">
          <div className="w-56 max-w-[45vw]">
            <CommandPalette />
          </div>
          <a
            href="mailto:support@employable.app"
            title="Support"
            aria-label="Support"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-muted transition-colors hover:bg-black/[0.04] hover:text-foreground"
          >
            <Headset size={18} strokeWidth={2.25} />
          </a>
          <NotificationBell
            notifications={(notifications ?? []) as NotificationItem[]}
            unreadCount={unread ?? 0}
          />
        </header>
        <div className="min-w-0 flex-1 overflow-y-auto bg-black/[0.025]">{children}</div>
      </div>
      <Suspense fallback={null}>
        <Toaster />
      </Suspense>
    </div>
  );
}
