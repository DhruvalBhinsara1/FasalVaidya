import { CardLoadingSkeleton } from '@/components/ui';

export default function DashboardLoading() {
  return (
    <div className="p-6 space-y-6">
      {/* Stats Grid Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white rounded-lg border border-gray-200">
            <CardLoadingSkeleton />
          </div>
        ))}
      </div>

      {/* Charts Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-lg border border-gray-200">
          <div className="p-6">
            <div className="animate-pulse space-y-3">
              <div className="h-6 w-32 bg-gray-200 rounded" />
              <div className="h-[250px] bg-gray-100 rounded" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="p-6">
            <div className="animate-pulse space-y-3">
              <div className="h-6 w-32 bg-gray-200 rounded" />
              <div className="h-[200px] bg-gray-100 rounded-full mx-auto" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
