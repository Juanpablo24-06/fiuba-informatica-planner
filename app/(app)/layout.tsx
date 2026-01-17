import AppBackground from "@/components/layout/app-background";
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
      <main className="mx-auto w-full max-w-6xl px-6 pb-20 pt-8">
        {children}
      </main>
    </div>
  );
}
