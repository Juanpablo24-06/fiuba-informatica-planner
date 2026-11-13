export default function PlannerLoadingSurface({ className }: { className?: string }) {
  return <div className={`mx-auto flex min-h-[65vh] w-full max-w-xl items-center justify-center px-6 ${className ?? ""}`} aria-hidden="true">
    <div className="grid w-full grid-cols-[32px_repeat(5,1fr)] grid-rows-[24px_repeat(5,42px)] gap-px overflow-hidden rounded-xl border border-border/40 bg-border/30 p-px">
      {Array.from({ length: 36 }, (_, index) => <span key={index} className="bg-surface/85" />)}
      <span className="col-start-3 row-start-3 row-span-2 z-10 m-1 animate-pulse rounded-md border-l-2 border-accent bg-accent/15" />
      <span className="col-start-5 row-start-2 row-span-3 z-10 m-1 animate-pulse rounded-md border-l-2 border-accent-2 bg-accent-2/15 [animation-delay:240ms]" />
      <span className="col-start-3 row-start-5 z-10 m-1 animate-pulse rounded-md border-l-2 border-accent-3 bg-accent-3/15 [animation-delay:480ms]" />
    </div>
  </div>;
}
