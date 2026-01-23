import { CardLoadingSkeleton, TableLoadingSkeleton } from '@/components/ui';

export default function UsersLoading() {
  return (
    <div className="p-6 space-y-6">
      {/* Stats Grid Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white rounded-lg border border-gray-200">
            <CardLoadingSkeleton />
          </div>
        ))}
      </div>

      {/* Users Table Skeleton */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="p-6">
          <div className="animate-pulse space-y-2 mb-4">
            <div className="h-7 w-32 bg-gray-200 rounded" />
            <div className="h-4 w-48 bg-gray-100 rounded" />
          </div>
        </div>
        <TableLoadingSkeleton rows={8} />
      </div>
    </div>
  );
}
