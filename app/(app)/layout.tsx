import dynamic from "next/dynamic";
import AppBackground from "@/components/layout/app-background";
import AppShell from "@/components/layout/app-shell";
import ShortcutHandler from "@/components/layout/shortcut-handler";
import TopNav from "@/components/layout/top-nav";
import { getSession } from "@/lib/auth";

const SynapseLauncher = dynamic(() => import("@/components/layout/synapse-launcher"), {
  ssr: false,
  loading: () => null
});

export default async function AppLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  const session = await getSession();

  return (
    <div className="relative min-h-screen">
      <AppBackground />
      <TopNav role={session?.role} />
      <ShortcutHandler />
      <AppShell>{children}</AppShell>
      <SynapseLauncher role={session?.role} />
    </div>
  );
}
