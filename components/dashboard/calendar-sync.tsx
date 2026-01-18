"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export default function CalendarSync() {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [livePending, setLivePending] = useState(false);
  const [liveMessage, setLiveMessage] = useState<string | null>(null);

  const handleSync = async () => {
    setPending(true);
    setMessage(null);
    const response = await fetch("/api/calendar/sync", { method: "POST" });
    if (!response.ok) {
      setMessage("No se pudo sincronizar.");
      setPending(false);
      return;
    }
    setMessage("Sincronización solicitada. Se actualizará en la próxima vista.");
    setPending(false);
  };

  const handleLiveSync = async () => {
    setLivePending(true);
    setLiveMessage(null);
    const response = await fetch("/api/calendar/sync-provider", { method: "POST" });
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      setLiveMessage(data?.error ?? "Sync en vivo no disponible.");
      setLivePending(false);
      return;
    }
    setLiveMessage("Sync en vivo activo. Escuchando cambios del calendario.");
    setLivePending(false);
  };

  return (
    <div className="space-y-3">
      <Button onClick={handleSync} disabled={pending} size="sm">
        {pending ? "Actualizando..." : "Actualizar ahora"}
      </Button>
      <Button onClick={handleLiveSync} disabled={livePending} size="sm" variant="outline">
        {livePending ? "Conectando..." : "Sync en vivo (beta)"}
      </Button>
      {message ? <p className="text-xs text-muted">{message}</p> : null}
      {liveMessage ? <p className="text-xs text-muted">{liveMessage}</p> : null}
    </div>
  );
}
