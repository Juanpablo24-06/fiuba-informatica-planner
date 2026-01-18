"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const roles = [
  { id: "admin", label: "Admin" },
  { id: "viewer", label: "Usuario" }
] as const;

export default function LoginForm() {
  const router = useRouter();
  const [role, setRole] = useState<(typeof roles)[number]["id"]>("viewer");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setPending(true);
    setError(null);

    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role, password })
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      setError(payload?.error ?? "No se pudo iniciar sesión.");
      setPending(false);
      return;
    }

    router.replace("/");
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <label className="text-xs uppercase tracking-[0.3em] text-muted">Rol</label>
        <div className="flex gap-2">
          {roles.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setRole(item.id)}
              className={`flex-1 rounded-2xl border px-4 py-3 text-sm font-semibold transition ${
                role === item.id
                  ? "border-accent/70 bg-accent/10 text-text"
                  : "border-white/[0.12] bg-surface/80 text-muted hover:text-text"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
      <div className="space-y-2">
        <label htmlFor="password" className="text-xs uppercase tracking-[0.3em] text-muted">
          Contraseña
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="w-full rounded-2xl border border-white/[0.12] bg-surface/80 px-4 py-3 text-sm text-text outline-none ring-1 ring-transparent transition focus:ring-accent/60"
          placeholder="Ingresá la clave compartida"
          required
        />
      </div>
      {error ? (
        <div className="rounded-2xl border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">
          {error}
        </div>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-2xl border border-accent/60 bg-accent/20 px-4 py-3 text-sm font-semibold text-text transition hover:bg-accent/30 disabled:opacity-60"
      >
        {pending ? "Validando..." : "Entrar"}
      </button>
      <p className="text-xs text-muted">
        El acceso se valida en el servidor y la sesión se guarda en una cookie segura.
      </p>
    </form>
  );
}
