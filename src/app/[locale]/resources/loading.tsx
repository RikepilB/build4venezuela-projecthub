// Streaming skeleton shown while the resources directory loads.
export default function ResourcesLoading() {
  return (
    <section className="flex animate-pulse flex-col gap-8">
      <header className="flex flex-col gap-2">
        <div className="h-3 w-24 rounded-token bg-surface-2" />
        <div className="h-8 w-72 rounded-token bg-surface-2" />
        <div className="h-4 w-full max-w-2xl rounded-token bg-surface-2" />
      </header>
      {Array.from({ length: 2 }).map((_, g) => (
        <div key={g} className="flex flex-col gap-3">
          <div className="h-3 w-40 rounded-token bg-surface-2" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-32 rounded-token border border-border bg-surface" />
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}
