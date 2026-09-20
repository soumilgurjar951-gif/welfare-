/** Instant route-transition skeleton (officer workspace). */
export default function AdminLoading() {
  return (
    <div className="space-y-5 animate-pulse">
      <div className="space-y-2">
        <div className="h-6 w-64 rounded-lg bg-slate-200" />
        <div className="h-3 w-96 max-w-full rounded bg-slate-200" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-28 rounded-xl bg-white border border-slate-200 p-4 space-y-2">
            <div className="h-8 w-16 rounded bg-slate-200" />
            <div className="h-3 w-3/4 rounded bg-slate-200" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-64 rounded-xl bg-white border border-slate-200" />
        ))}
      </div>
    </div>
  );
}
