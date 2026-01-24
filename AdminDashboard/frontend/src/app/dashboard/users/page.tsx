import { Header } from '@/components/layout/Header';
import { Card, CardHeader } from '@/components/ui';
import { createAdminClient } from '@/lib/supabase/server';
import { UserTable } from './UserTable';

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
    // Try direct query with column names from device_auth migration
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select(`
        id,
        auth_user_id,
        device_id,
        device_fingerprint,
        name,
        phone,
        profile_photo,
        created_at,
        updated_at,
        last_active,
        deleted_at
      `)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (usersError) {
      console.error('Error fetching users:', usersError);
      return [];
    }

    if (!users || users.length === 0) {
      return [];
    }

    // Transform to expected format
    const transformedUsers = users.map(user => ({
      id: user.id,
      auth_user_id: user.auth_user_id,
      full_name: user.name || null,
      email: user.phone || 'No contact',  // Use phone as identifier for now
      phone_number: user.phone || null,
      location: null,
      device_id: user.device_id || user.device_fingerprint,
      created_at: user.created_at,
      updated_at: user.updated_at,
      last_active: user.last_active,
      deleted_at: user.deleted_at,
      is_active: user.last_active ? new Date(user.last_active) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) : false,
    }));

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
    return transformedUsers.map(user => ({
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
          <UserTable users={users} />
        </Card>
      </div>
    </>
  );
}
