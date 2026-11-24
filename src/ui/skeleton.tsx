export function Skeleton({ className }: { className: string }) {
  return <div aria-hidden="true" className={`animate-pulse rounded-sm bg-paper-2 motion-reduce:animate-none ${className}`} />;
}

export function ListingSkeletons({ count = 4 }: { count?: number }) {
  return Array.from({ length: count }, (_, i) => (
    <div key={i} aria-hidden="true" className="card">
      <Skeleton className="aspect-[4/3] rounded-none" />
      <div className="grid gap-2 p-3 md:p-4">
        <Skeleton className="h-4 w-4/5" />
        <Skeleton className="h-5 w-2/5" />
        <Skeleton className="h-3 w-1/2" />
        <Skeleton className="mt-1 h-1.5 w-full" />
        <Skeleton className="h-3 w-2/5" />
      </div>
    </div>
  ));
}

export function PageSkeleton({ variant = "home" }: { variant?: "home" | "discovery" | "detail" | "form" }) {
  return (
    <div role="status" aria-busy="true">
      <div className="border-b border-line">
        <div className="wrap flex h-12 items-center justify-between gap-4 md:h-16">
          <Skeleton className="h-7 w-36" />
          <Skeleton className="hidden h-10 w-2/5 rounded-full md:block" />
        </div>
      </div>
      <div className="wrap grid gap-4 py-4 md:py-7">
        {variant === "home" && <Skeleton className="h-44 rounded-lg md:h-64" />}
        {variant === "detail" ? (
          <div className="grid gap-5 lg:grid-cols-2">
            <Skeleton className="aspect-[4/3] rounded-lg" />
            <div className="grid content-start gap-4">
              <Skeleton className="h-8 w-4/5" />
              <Skeleton className="h-9 w-1/3" />
              <Skeleton className="h-20 w-full rounded-md" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-3/4" />
              <Skeleton className="h-11 w-2/3" />
            </div>
          </div>
        ) : variant === "form" ? (
          <div className="panel mx-auto grid w-full max-w-xl gap-4">
            <Skeleton className="h-7 w-2/3" />
            {Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-11 w-full" />)}
          </div>
        ) : (
          <>
            {variant === "discovery" && <Skeleton className="h-11 w-full" />}
            <div className="flex gap-2">
              <Skeleton className="h-9 w-20 rounded-full" />
              <Skeleton className="h-9 w-28 rounded-full" />
              <Skeleton className="h-9 w-24 rounded-full" />
            </div>
            <Skeleton className="h-6 w-40" />
            <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3 md:gap-3 xl:grid-cols-4">
              <ListingSkeletons count={8} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
