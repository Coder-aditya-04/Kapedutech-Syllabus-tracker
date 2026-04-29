export default function Loading() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="flex items-center justify-between mb-8">
        <div className="space-y-2">
          <div className="h-9 w-52 bg-gray-200 rounded-xl" />
          <div className="h-4 w-80 bg-gray-100 rounded-lg" />
        </div>
        <div className="flex gap-3">
          <div className="h-9 w-24 bg-gray-200 rounded-xl" />
          <div className="h-9 w-24 bg-gray-200 rounded-xl" />
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="rounded-2xl p-5 border border-gray-100 bg-gray-50/60">
            <div className="h-10 w-10 bg-gray-200 rounded-lg mb-2" />
            <div className="h-4 w-20 bg-gray-100 rounded" />
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
          <div className="h-5 w-48 bg-gray-200 rounded" />
        </div>
        <div className="divide-y divide-gray-50">
          {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
            <div key={i} className="px-6 py-4 flex items-center gap-6">
              <div className="h-4 w-32 bg-gray-100 rounded" />
              <div className="h-4 w-24 bg-gray-100 rounded" />
              <div className="h-4 w-16 bg-gray-100 rounded" />
              <div className="h-4 w-20 bg-gray-100 rounded ml-auto" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
