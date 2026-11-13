import AppBackground from "@/components/layout/app-background";
import AppShell from "@/components/layout/app-shell";
import ScrollbarCompensationSync from "@/components/layout/scrollbar-compensation-sync";
import ShortcutHandler from "@/components/layout/shortcut-handler";
import TopNav from "@/components/layout/top-nav";
import SynapseLauncher from "@/components/layout/synapse-launcher";
import { getSession } from "@/lib/auth";
import { buildProgressSnapshot } from "@/lib/progress";
import { getLatestEnrollmentStatus, getSubjects } from "@/lib/queries";

export default async function AppLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  const [session, subjects, latestStatusMap] = await Promise.all([
    getSession(),
    getSubjects(),
    getLatestEnrollmentStatus()
  ]);
  const progress = buildProgressSnapshot(subjects, latestStatusMap);

  return (
    <div className="relative min-h-screen overflow-x-clip">
      <AppBackground />
      <ScrollbarCompensationSync />
      <TopNav role={session?.role} />
      <ShortcutHandler />
      <AppShell progress={progress}>{children}</AppShell>
      <SynapseLauncher role={session?.role} />
    </div>
  );
}
