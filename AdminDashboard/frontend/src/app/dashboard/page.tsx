import { Header } from '@/components/layout/Header';
import { Card, CardHeader, StatCard } from '@/components/ui';
import { createAdminClient } from '@/lib/supabase/server';
import { AlertTriangle, Brain, ScanLine, Users } from 'lucide-react';
import { CropDistributionChart } from './components/CropDistributionChart';
import { RecentAlertsCard } from './components/RecentAlertsCard';
import { RecentScansTable } from './components/RecentScansTable';
import { ScanActivityChart } from './components/ScanActivityChart';

async function getDashboardStats() {
  const supabase = await createAdminClient();

  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Batch ALL queries in parallel for maximum speed
    const [
      { count: totalUsers },
      { count: activeUsers },
      { count: totalScans },
      { count: scansToday },
    ] = await Promise.all([
      supabase.from('users').select('*', { count: 'exact', head: true }).is('deleted_at', null),
      supabase.from('users').select('*', { count: 'exact', head: true }).is('deleted_at', null).gte('last_active', sevenDaysAgo.toISOString()),
      supabase.from('leaf_scans').select('*', { count: 'exact', head: true }).is('deleted_at', null),
      supabase.from('leaf_scans').select('*', { count: 'exact', head: true }).is('deleted_at', null).gte('created_at', today.toISOString()),
    ]);

    return {
      totalUsers: totalUsers || 0,
      activeUsers: activeUsers || 0,
      totalScans: totalScans || 0,
      scansToday: scansToday || 0,
      averageAccuracy: 87.5, // Mock for MVP - calculate from feedback
      feedbackCount: 0, // Mock for MVP
      criticalAlerts: 3, // Mock for MVP
    };
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    // Return default values on error
    return {
      totalUsers: 0,
      activeUsers: 0,
      totalScans: 0,
      scansToday: 0,
      averageAccuracy: 0,
      feedbackCount: 0,
      criticalAlerts: 0,
    };
  }
}

async function getRecentScans() {
  const supabase = await createAdminClient();

  try {
    const { data: scans, error } = await supabase
      .from('leaf_scans')
      .select(`
        *,
        crop:crops(*),
        diagnosis:diagnoses(*),
        user:users(*)
      `)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(5);

    if (error) {
      console.error('Error fetching recent scans:', error);
      return [];
    }

    return scans || [];
  } catch (error) {
    console.error('Error fetching recent scans:', error);
    return [];
  }
}

async function getScansByDay() {
  const supabase = await createAdminClient();
  
  try {
    // Get last 7 days of scans
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data: scans, error } = await supabase
      .from('leaf_scans')
      .select('created_at')
      .is('deleted_at', null)
      .gte('created_at', sevenDaysAgo.toISOString());

    if (error) {
      console.error('Error fetching scans by day:', error);
      return getEmptyScansByDay();
    }

    // Group by day
    const scansByDay: Record<string, number> = {};
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    
    // Initialize all days
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dayName = days[date.getDay()];
      scansByDay[dayName] = 0;
    }

    // Count scans per day
    scans?.forEach((scan) => {
      const date = new Date(scan.created_at);
      const dayName = days[date.getDay()];
      scansByDay[dayName] = (scansByDay[dayName] || 0) + 1;
    });

    return Object.entries(scansByDay).map(([day, count]) => ({
      day,
      scans: count,
    }));
  } catch (error) {
    console.error('Error in getScansByDay:', error);
    return getEmptyScansByDay();
  }
}

function getEmptyScansByDay() {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const emptyData: Record<string, number> = {};
  
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dayName = days[date.getDay()];
    emptyData[dayName] = 0;
  }
  
  return Object.entries(emptyData).map(([day, count]) => ({
    day,
    scans: count,
  }));
}

async function getCropDistribution() {
  const supabase = await createAdminClient();

  try {
    const { data: scans, error } = await supabase
      .from('leaf_scans')
      .select('crop_id, crop:crops(name)')
      .is('deleted_at', null);

    if (error) {
      console.error('Error fetching crop distribution:', error);
      return [];
    }

    // Group by crop
    const distribution: Record<string, number> = {};
    scans?.forEach((scan) => {
      const cropName = (scan.crop as unknown as { name: string })?.name || 'Unknown';
      distribution[cropName] = (distribution[cropName] || 0) + 1;
    });

    const total = Object.values(distribution).reduce((a, b) => a + b, 0);

    return Object.entries(distribution).map(([name, count]) => ({
      name,
      value: count,
      percentage: total > 0 ? Math.round((count / total) * 100) : 0,
    }));
  } catch (error) {
    console.error('Error in getCropDistribution:', error);
    return [];
  }
}

export default async function DashboardPage() {
  const [stats, recentScans, scansByDay, cropDistribution] = await Promise.all([
    getDashboardStats(),
    getRecentScans(),
    getScansByDay(),
    getCropDistribution(),
  ]);

  return (
    <>
      <Header 
        title="Dashboard" 
        subtitle="Overview of your agriculture monitoring system" 
      />
      
      <div className="p-6 space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Total Users"
            value={stats.totalUsers.toLocaleString()}
            subtitle={`${stats.activeUsers} active this week`}
            icon={Users}
            trend={{ value: 12, isPositive: true }}
          />
          <StatCard
            title="Total Scans"
            value={stats.totalScans.toLocaleString()}
            subtitle={`${stats.scansToday} scans today`}
            icon={ScanLine}
            trend={{ value: 8, isPositive: true }}
          />
          <StatCard
            title="AI Accuracy"
            value={`${stats.averageAccuracy}%`}
            subtitle="Based on user feedback"
            icon={Brain}
            trend={{ value: 2.5, isPositive: true }}
          />
          <StatCard
            title="Critical Alerts"
            value={stats.criticalAlerts}
            subtitle="Requires attention"
            icon={AlertTriangle}
            className={stats.criticalAlerts > 0 ? 'border-danger' : ''}
          />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <CardHeader 
              title="Scan Activity" 
              subtitle="Last 7 days"
            />
            <div className="mt-4">
              <ScanActivityChart data={scansByDay} />
            </div>
          </Card>
          
          <Card>
            <CardHeader 
              title="Crop Distribution" 
              subtitle="All time"
            />
            <div className="mt-4">
              <CropDistributionChart data={cropDistribution} />
            </div>
          </Card>
        </div>

        {/* Tables Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2" padding="none">
            <div className="p-6 pb-0">
              <CardHeader 
                title="Recent Scans" 
                subtitle="Latest diagnosis results"
              />
            </div>
            <RecentScansTable scans={recentScans} />
          </Card>
          
          <RecentAlertsCard />
        </div>
      </div>
    </>
  );
}
