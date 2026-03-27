import dynamic from "next/dynamic";
import AppBackground from "@/components/layout/app-background";
import AppShell from "@/components/layout/app-shell";
import ShortcutHandler from "@/components/layout/shortcut-handler";
import TopNav from "@/components/layout/top-nav";
import { getSession } from "@/lib/auth";
import { buildProgressSnapshot } from "@/lib/progress";
import { getLatestEnrollmentStatus, getSubjects } from "@/lib/queries";

const SynapseLauncher = dynamic(() => import("@/components/layout/synapse-launcher"), {
  ssr: false,
  loading: () => null
});

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
    <div className="relative min-h-screen overflow-x-hidden">
      <AppBackground />
      <TopNav role={session?.role} />
      <ShortcutHandler />
      <AppShell progress={progress}>{children}</AppShell>
      <SynapseLauncher role={session?.role} />
    </div>
  );
}
