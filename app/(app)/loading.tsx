export default function AppLoading() {
  return (
    <div className="mx-auto w-full max-w-[1380px] space-y-6 pb-8">
      <section className="panel p-6">
        <div className="h-3 w-32 animate-pulse rounded-full bg-surface-2/80" />
        <div className="mt-4 h-10 w-72 animate-pulse rounded-full bg-surface-2/80" />
        <div className="mt-4 h-4 w-full max-w-2xl animate-pulse rounded-full bg-surface-2/70" />
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.7fr_0.9fr]">
        <div className="space-y-6">
          {Array.from({ length: 3 }).map((_, index) => (
            <section key={index} className="panel min-h-[220px] animate-pulse p-6">
              <div className="h-3 w-28 rounded-full bg-surface-2/80" />
              <div className="mt-4 h-8 w-52 rounded-full bg-surface-2/80" />
              <div className="mt-6 grid gap-3 md:grid-cols-2">
                {Array.from({ length: 4 }).map((__, cardIndex) => (
                  <div
                    key={cardIndex}
                    className="h-24 rounded-2xl border border-border/50 bg-surface-2/60"
                  />
                ))}
              </div>
            </section>
          ))}
        </div>

        <aside className="panel min-h-[420px] animate-pulse p-8">
          <div className="h-3 w-24 rounded-full bg-surface-2/80" />
          <div className="mt-4 h-9 w-40 rounded-full bg-surface-2/80" />
          <div className="mt-6 space-y-4">
            {Array.from({ length: 5 }).map((_, itemIndex) => (
              <div
                key={itemIndex}
                className="h-20 rounded-2xl border border-border/50 bg-surface-2/60"
              />
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}
