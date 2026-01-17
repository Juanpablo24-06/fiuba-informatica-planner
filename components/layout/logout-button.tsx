"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LogoutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  const handleLogout = async () => {
    setPending(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.replace("/login");
    } finally {
      setPending(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={pending}
      className="rounded-full border border-border/60 bg-surface/80 px-3 py-1 text-xs text-text transition hover:border-accent/60 hover:text-accent disabled:opacity-60"
    >
      {pending ? "Saliendo..." : "Salir"}
    </button>
  );
}
