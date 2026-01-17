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
      <div className="absolute inset-0 subtle-grid opacity-50" />
      <div className="relative grid w-full max-w-4xl gap-8 rounded-3xl border border-border/60 bg-surface/80 p-8 shadow-glow backdrop-blur md:grid-cols-[1.1fr_0.9fr] animate-fade-in">
        <div className="space-y-6">
          <p className="text-xs uppercase tracking-[0.4em] text-muted">Acceso privado</p>
          <h1 className="text-3xl font-semibold leading-tight text-balance">
            Organizador personal de Ingeniería en Informática
          </h1>
          <p className="text-sm text-muted">
            Elegí tu rol y validá la contraseña. Todo el contenido queda protegido y
            se sirve solo desde el servidor.
          </p>
          <div className="rounded-2xl border border-border/60 bg-surface-2/80 p-4 text-xs text-muted">
            <p className="font-semibold text-text">Atajos rápidos</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <span className="rounded-full border border-border/50 px-2 py-1">Shift + D · Dashboard</span>
              <span className="rounded-full border border-border/50 px-2 py-1">Shift + M · Mapa</span>
            </div>
          </div>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
