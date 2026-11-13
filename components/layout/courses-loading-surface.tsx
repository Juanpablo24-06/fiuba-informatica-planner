"use client";

export default function CoursesLoadingSurface({ className }: { className?: string }) {
  return <div className={`flex min-h-[65vh] items-center justify-center ${className ?? ""}`} aria-hidden="true">
    <div className="relative h-36 w-52">
      {[0, 1, 2, 3].map((book) => <div key={book} className="absolute left-1/2 h-7 -translate-x-1/2 animate-pulse rounded-[6px_10px_10px_6px] border border-border/50 bg-surface-2 shadow-sm" style={{ bottom: book * 27, width: `${196 - book * 18}px`, animationDelay: `${book * 150}ms` }}><span className="absolute inset-y-1 left-2 w-px bg-accent/45" /><span className="absolute left-5 top-1/2 h-px w-12 bg-muted/25" /></div>)}
      <span className="absolute -right-1 top-1 h-10 w-1 animate-pulse rounded-full bg-accent" />
    </div>
  </div>;
}
