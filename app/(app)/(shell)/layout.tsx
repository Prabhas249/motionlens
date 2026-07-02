import { AppShell } from "@/components/app-shell";

// Shared shell for every signed-in page. Living in a LAYOUT (not per-page)
// means the sidebar + header persist across client-side navigations — no
// remount, no history refetch, no flicker when hopping dashboard ↔ settings.
export default function ShellLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
