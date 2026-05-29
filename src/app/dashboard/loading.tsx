export default function DashboardLoading() {
  return (
    <div className="p-4 pb-16 space-y-4 lg:p-6 lg:space-y-6 animate-pulse">
      {/* Header skeleton */}
      <div className="h-16 w-full bg-white border-b flex items-center px-6 -mt-0">
        <div className="h-5 w-48 bg-gray-200 rounded" />
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 gap-3 lg:gap-4 lg:grid-cols-4 pt-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-xl border bg-white p-5 space-y-3">
            <div className="h-3 w-24 bg-gray-200 rounded" />
            <div className="h-8 w-16 bg-gray-200 rounded" />
            <div className="h-3 w-32 bg-gray-200 rounded" />
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-xl border bg-white p-5 h-64" />
        <div className="rounded-xl border bg-white p-5 h-64" />
      </div>

      {/* List */}
      <div className="rounded-xl border bg-white p-5 space-y-3">
        <div className="h-4 w-40 bg-gray-200 rounded" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-12 w-full bg-gray-100 rounded-lg" />
        ))}
      </div>
    </div>
  );
}
