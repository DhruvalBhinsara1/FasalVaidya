import { Header } from '@/components/layout/Header';
import { Badge, Card, CardHeader } from '@/components/ui';
import { createAdminClient } from '@/lib/supabase/server';
import { Mail, MapPin, Phone, Smartphone } from 'lucide-react';

interface User {
  id: string;
  full_name: string | null;
  email: string;
  phone_number: string | null;
  location: string | null;
  device_id: string | null;
  created_at: string;
  last_active: string | null;
  is_active: boolean;
  total_scans?: number;
  last_scan?: string | null;
}

async function getUsersData() {
  const supabase = await createAdminClient();

  try {
    // Get all users (fast, single query)
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('*')
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (usersError) {
      console.error('Error fetching users:', usersError);
      return [];
    }

    if (!users || users.length === 0) {
      return [];
    }

    // Get all scan data in ONE query with aggregation
    const { data: scanStats } = await supabase
      .from('leaf_scans')
      .select('user_id, created_at')
      .in('user_id', users.map(u => u.id))
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    // Aggregate scan data in memory (much faster than N queries)
    const scansByUser = (scanStats || []).reduce((acc: any, scan: any) => {
      if (!acc[scan.user_id]) {
        acc[scan.user_id] = { count: 0, lastScan: null };
      }
      acc[scan.user_id].count++;
      if (!acc[scan.user_id].lastScan) {
        acc[scan.user_id].lastScan = scan.created_at;
      }
      return acc;
    }, {});

    // Merge data
    return users.map(user => ({
      ...user,
      total_scans: scansByUser[user.id]?.count || 0,
      last_scan: scansByUser[user.id]?.lastScan || null,
    })) as User[];
  } catch (error) {
    console.error('Error in getUsersData:', error);
    return [];
  }
}

async function getUserStats() {
  const supabase = await createAdminClient();

  try {
    // Total users
    const { count: totalUsers } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .is('deleted_at', null);

    // Active users (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const { count: activeUsers } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .is('deleted_at', null)
      .gte('last_active', sevenDaysAgo.toISOString());

    // New users this month
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const { count: newThisMonth } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .is('deleted_at', null)
      .gte('created_at', monthStart.toISOString());

    // Users with devices
    const { count: usersWithDevices } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .is('deleted_at', null)
      .not('device_id', 'is', null);

    return {
      total: totalUsers || 0,
      active: activeUsers || 0,
      newThisMonth: newThisMonth || 0,
      withDevices: usersWithDevices || 0,
    };
  } catch (error) {
    console.error('Error fetching user stats:', error);
    return {
      total: 0,
      active: 0,
      newThisMonth: 0,
      withDevices: 0,
    };
  }
}

function formatDate(dateString: string | null) {
  if (!dateString) return 'Never';
  const date = new Date(dateString);
  const now = new Date();
  const diffInMs = now.getTime() - date.getTime();
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

  if (diffInDays === 0) return 'Today';
  if (diffInDays === 1) return 'Yesterday';
  if (diffInDays < 7) return `${diffInDays} days ago`;
  if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} weeks ago`;
  
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function getActivityStatus(lastActive: string | null): { label: string; color: string } {
  if (!lastActive) return { label: 'Inactive', color: 'gray' };
  
  const now = new Date();
  const lastActiveDate = new Date(lastActive);
  const diffInDays = Math.floor((now.getTime() - lastActiveDate.getTime()) / (1000 * 60 * 60 * 24));

  if (diffInDays <= 1) return { label: 'Active', color: 'success' };
  if (diffInDays <= 7) return { label: 'Recent', color: 'warning' };
  return { label: 'Inactive', color: 'gray' };
}

export default async function UsersPage() {
  const [users, stats] = await Promise.all([getUsersData(), getUserStats()]);

  return (
    <>
      <Header
        title="User Management"
        subtitle="Manage and monitor platform users"
      />

      <div className="p-6 space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <p className="text-sm text-neutral-light">Total Users</p>
            <p className="mt-2 text-3xl font-bold text-neutral">{stats.total}</p>
            <p className="mt-1 text-xs text-success">All registered users</p>
          </Card>
          <Card>
            <p className="text-sm text-neutral-light">Active Users</p>
            <p className="mt-2 text-3xl font-bold text-neutral">{stats.active}</p>
            <p className="mt-1 text-xs text-neutral-light">Last 7 days</p>
          </Card>
          <Card>
            <p className="text-sm text-neutral-light">New This Month</p>
            <p className="mt-2 text-3xl font-bold text-neutral">{stats.newThisMonth}</p>
            <p className="mt-1 text-xs text-success">+{Math.round((stats.newThisMonth / stats.total) * 100)}% growth</p>
          </Card>
          <Card>
            <p className="text-sm text-neutral-light">With Devices</p>
            <p className="mt-2 text-3xl font-bold text-neutral">{stats.withDevices}</p>
            <p className="mt-1 text-xs text-neutral-light">Device-linked accounts</p>
          </Card>
        </div>

        {/* Users Table */}
        <Card padding="none">
          <div className="p-6 pb-0">
            <CardHeader
              title="All Users"
              subtitle={`${users.length} registered users`}
            />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-light uppercase">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-light uppercase">
                    Contact
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-light uppercase">
                    Location
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-light uppercase">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-light uppercase">
                    Total Scans
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-light uppercase">
                    Last Active
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-light uppercase">
                    Joined
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-neutral-light">
                      No users found
                    </td>
                  </tr>
                ) : (
                  users.map((user) => {
                    const activityStatus = getActivityStatus(user.last_active);
                    return (
                      <tr key={user.id} className="hover:bg-gray-50/50">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-white font-medium">
                              {user.full_name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || '?'}
                            </div>
                            <div>
                              <p className="font-medium text-neutral">
                                {user.full_name || 'Unnamed User'}
                              </p>
                              {user.device_id && (
                                <p className="text-xs text-neutral-light flex items-center gap-1 mt-0.5">
                                  <Smartphone className="h-3 w-3" />
                                  {user.device_id.substring(0, 8)}...
                                </p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="space-y-1">
                            <p className="text-sm text-neutral flex items-center gap-1.5">
                              <Mail className="h-3.5 w-3.5 text-neutral-light" />
                              {user.email}
                            </p>
                            {user.phone_number && (
                              <p className="text-sm text-neutral-light flex items-center gap-1.5">
                                <Phone className="h-3.5 w-3.5 text-neutral-light" />
                                {user.phone_number}
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {user.location ? (
                            <p className="text-sm text-neutral flex items-center gap-1.5">
                              <MapPin className="h-3.5 w-3.5 text-neutral-light" />
                              {user.location}
                            </p>
                          ) : (
                            <span className="text-xs text-neutral-light">Not set</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <Badge variant={activityStatus.color as any}>
                            {activityStatus.label}
                          </Badge>
                        </td>
                        <td className="px-6 py-4">
                          <div>
                            <p className="font-semibold text-neutral">{user.total_scans}</p>
                            {user.last_scan && (
                              <p className="text-xs text-neutral-light">
                                Last: {formatDate(user.last_scan)}
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm text-neutral">{formatDate(user.last_active)}</p>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm text-neutral-light">
                            {formatDate(user.created_at)}
                          </p>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </>
  );
}
