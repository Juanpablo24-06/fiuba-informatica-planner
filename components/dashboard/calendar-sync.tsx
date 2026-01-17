"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export default function CalendarSync() {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

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

  return (
    <div className="space-y-3">
      <Button onClick={handleSync} disabled={pending} size="sm">
        {pending ? "Actualizando..." : "Actualizar ahora"}
      </Button>
      {message ? <p className="text-xs text-muted">{message}</p> : null}
    </div>
  );
}
