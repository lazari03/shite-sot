export default function Loading() {
  return (
    <div className="wrap pt-20" aria-busy="true" aria-live="polite">
      <div className="h-[220px] animate-pulse rounded-[var(--radius-lg)] bg-paper-2 motion-reduce:animate-none" />
      <div className="mt-6 grid grid-cols-2 gap-2.5 md:grid-cols-3 md:gap-4 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="overflow-hidden rounded-[var(--radius-md)] border border-line bg-white">
            <div className="aspect-[4/3] animate-pulse bg-placeholder motion-reduce:animate-none" />
            <div className="space-y-2 p-3">
              <div className="h-4 w-3/4 rounded bg-paper-2" />
              <div className="h-6 w-1/3 rounded bg-paper-2" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
