"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const roles = [
  { id: "admin", label: "Admin", detail: "Gestión total" },
  { id: "viewer", label: "Visualización", detail: "Solo lectura" }
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
    <form onSubmit={handleSubmit} className="space-y-6 rounded-[2rem] border border-border/70 bg-surface-2/70 p-6">
      <div className="space-y-2">
        <label className="text-xs uppercase tracking-[0.28em] text-muted">Rol</label>
        <div className="grid gap-2 sm:grid-cols-2">
          {roles.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setRole(item.id)}
              className={`rounded-2xl border px-4 py-3 text-left transition ${
                role === item.id
                  ? "border-accent/60 bg-accent/15 text-text"
                  : "border-border/70 bg-surface text-muted hover:text-text"
              }`}
            >
              <p className="text-sm font-semibold">{item.label}</p>
              <p className="text-xs">{item.detail}</p>
            </button>
          ))}
        </div>
      </div>
      <div className="space-y-2">
        <label htmlFor="password" className="text-xs uppercase tracking-[0.28em] text-muted">
          Contraseña
        </label>
        <Input
          id="password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Ingresá la clave compartida"
          required
        />
      </div>
      {error ? (
        <div className="rounded-2xl border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">
          {error}
        </div>
      ) : null}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Validando..." : "Entrar"}
      </Button>
      <p className="text-xs text-muted">
        La validación se realiza en servidor y la sesión se guarda en cookie segura.
      </p>
    </form>
  );
}
