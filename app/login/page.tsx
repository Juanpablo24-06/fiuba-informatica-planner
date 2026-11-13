import { redirect } from "next/navigation";
import LoginForm from "@/app/login/login-form";
import { getSession } from "@/lib/auth";

export default async function LoginPage() {
  const session = await getSession();
  if (session) {
    redirect("/");
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center px-6 py-12">
      <div className="pointer-events-none absolute inset-0 subtle-grid opacity-35" />
      <div className="relative grid w-full max-w-5xl gap-8 rounded-[2rem] border border-border/70 bg-surface/95 p-8 shadow-soft md:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-6">
          <p className="text-xs uppercase tracking-[0.35em] text-muted">Acceso privado</p>
          <h1 className="text-4xl font-semibold leading-tight text-balance">
            Plan Ing Informática
          </h1>
          <p className="text-sm text-muted">
            Entrá como admin o visualización. La vista de visualización está pensada para
            seguimiento rápido y la de admin para gestión completa.
          </p>
          <div className="rounded-3xl border border-border/70 bg-surface-2/75 p-4 text-xs text-muted">
            <p className="font-semibold text-text">Atajos rápidos</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <span className="rounded-full border border-border/70 px-2 py-1">Shift + D · Resumen</span>
              <span className="rounded-full border border-border/70 px-2 py-1">Shift + M · Mapa</span>
              <span className="rounded-full border border-border/70 px-2 py-1">Shift + P · Planificar</span>
              <span className="rounded-full border border-border/70 px-2 py-1">Shift + C · Calendario</span>
            </div>
          </div>
        </div>
        <LoginForm demoLoginEnabled={process.env.NODE_ENV !== "production" && process.env.DEMO_LOGIN_ENABLED === "true"} />
      </div>
    </div>
  );
}
