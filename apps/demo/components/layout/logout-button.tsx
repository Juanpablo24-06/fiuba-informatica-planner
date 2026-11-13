import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export default function LogoutButton({
  className,
  children,
  onLoggedOut
}: {
  className?: string;
  children?: ReactNode;
  onLoggedOut?: () => void;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  const handleLogout = async () => {
    setPending(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      onLoggedOut?.();
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
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-full border border-border/70 bg-surface px-3 py-2 text-xs font-semibold text-text transition hover:border-accent/60 hover:text-accent disabled:opacity-60",
        className
      )}
    >
      <LogOut className="h-3.5 w-3.5" />
      {pending ? "Saliendo..." : children ?? "Salir"}
    </button>
  );
}
