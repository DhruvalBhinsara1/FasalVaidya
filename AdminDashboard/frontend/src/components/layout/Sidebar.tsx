'use client';

import { cn } from '@/lib/utils';
import {
    BarChart3,
    LayoutDashboard,
    Leaf,
    LogOut,
    ScanLine,
    Settings,
    Users
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Users', href: '/dashboard/users', icon: Users },
  { name: 'Scans', href: '/dashboard/scans', icon: ScanLine },
  { name: 'Reports', href: '/dashboard/reports', icon: BarChart3 },
  { name: 'Crops', href: '/dashboard/crops', icon: Leaf },
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
];

interface SidebarProps {
  user?: {
    full_name: string | null;
    email: string;
    role: string;
  };
}

export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();

  return (
    <div className="flex h-screen w-64 flex-col bg-[#1a2e1a]">
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 px-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
          <Leaf className="h-6 w-6 text-white" />
        </div>
        <span className="text-xl font-bold text-white">FasalVaidya</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navigation.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== '/dashboard' && pathname.startsWith(item.href));

          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-white'
                  : 'text-gray-300 hover:bg-white/10 hover:text-white'
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* User Profile */}
      <div className="border-t border-white/10 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-white">
            {user?.full_name?.[0] || 'A'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">
              {user?.full_name || 'Admin User'}
            </p>
            <p className="text-xs text-gray-400 uppercase">
              {user?.role || 'SUPER ADMIN'}
            </p>
          </div>
          <form action="/auth/signout" method="post">
            <button
              type="submit"
              className="p-2 text-gray-400 hover:text-white transition-colors"
              title="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
