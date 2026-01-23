import { Sidebar } from '@/components/layout/Sidebar';
import { createClient } from '@/lib/supabase/server';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Mock admin user for MVP - in production, fetch from admin_users table
  const adminUser = {
    full_name: user?.user_metadata?.full_name || 'Amit Sharma',
    email: user?.email || 'admin@fasalvaidya.com',
    role: 'SUPER ADMIN',
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar user={adminUser} />
      <main className="flex-1 overflow-auto bg-bg-primary">
        {children}
      </main>
    </div>
  );
}
