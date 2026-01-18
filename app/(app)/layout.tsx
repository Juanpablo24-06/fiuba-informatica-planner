import AppBackground from "@/components/layout/app-background";
import AppShell from "@/components/layout/app-shell";
import ShortcutHandler from "@/components/layout/shortcut-handler";
import TopNav from "@/components/layout/top-nav";
import { getSession } from "@/lib/auth";

export default async function AppLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  const session = await getSession();

  return (
    <div className="min-h-screen">
      <AppBackground />
      <TopNav role={session?.role} />
      <ShortcutHandler />
      <AppShell>{children}</AppShell>
    </div>
  );
}
