/** Instant route-transition skeleton (root). */
export default function RootLoading() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 space-y-4 animate-pulse">
      <div className="h-8 w-2/3 rounded-lg bg-slate-200" />
      <div className="h-4 w-1/2 rounded bg-slate-200" />
      <div className="grid gap-4 sm:grid-cols-3 pt-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-32 rounded-2xl bg-slate-200" />
        ))}
      </div>
    </div>
  );
}
