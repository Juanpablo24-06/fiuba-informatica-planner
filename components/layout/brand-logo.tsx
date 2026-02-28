"use client";

import { Code2 } from "lucide-react";

export default function BrandLogo({ className = "" }: { className?: string }) {
  return (
    <div
      className={`brand-logo relative flex h-11 w-11 items-center justify-center rounded-[0.95rem] bg-accent text-accent-contrast shadow-soft ${className}`}
      aria-hidden="true"
    >
      <Code2 className="brand-logo-icon h-6 w-6" strokeWidth={2.5} />
    </div>
  );
}
