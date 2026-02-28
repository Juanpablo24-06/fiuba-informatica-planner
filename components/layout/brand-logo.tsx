"use client";

export default function BrandLogo({ className = "" }: { className?: string }) {
  return (
    <div
      className={`brand-logo relative flex h-11 w-11 items-center justify-center rounded-[0.95rem] bg-gradient-to-br from-accent via-accent-2 to-accent-4 text-accent-contrast shadow-soft ${className}`}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 24 24"
        className="brand-logo-icon h-6 w-6"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M3 9.5L12 5L21 9.5L12 14L3 9.5Z"
          fill="currentColor"
          fillOpacity="0.95"
        />
        <path
          d="M8 12.1V15.15C8 16.35 9.8 17.4 12 17.4C14.2 17.4 16 16.35 16 15.15V12.1"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M21 9.5V13.6"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <circle
          cx="21"
          cy="14.8"
          r="1.1"
          fill="rgb(var(--color-accent-3))"
        />
      </svg>
    </div>
  );
}
