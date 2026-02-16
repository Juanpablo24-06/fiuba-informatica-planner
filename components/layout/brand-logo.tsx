"use client";

export default function BrandLogo({ className = "" }: { className?: string }) {
  return (
    <div
      className={`relative flex h-11 w-11 items-center justify-center rounded-[0.95rem] border border-white/15 bg-[#111318] text-white shadow-soft animate-logo-float ${className}`}
      aria-hidden="true"
    >
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none">
        <circle cx="11.4" cy="7.6" r="0.95" fill="currentColor" className="animate-eye-blink" />
        <circle cx="14.8" cy="7.6" r="0.95" fill="currentColor" className="animate-eye-blink" />
        <path
          d="M6.3 10.4L9.4 13.2L6.3 16"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path d="M11.5 16H16.8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="animate-caret-blink" />
      </svg>
      <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-accent/90 animate-caret-blink" />
    </div>
  );
}
