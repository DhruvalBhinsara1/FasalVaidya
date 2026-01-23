'use client';

import { cn } from '@/lib/utils';
import { Bell, Settings, Shield, User } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const sections = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'security', label: 'Security', icon: Shield },
];

const advancedSections = [
  { id: 'system', label: 'System Preferences', icon: Settings },
];

export function SettingsSidebar() {
  const pathname = usePathname();

  return (
    <div className="w-56 space-y-6">
      {/* Account Section */}
      <div>
        <h3 className="px-3 text-xs font-semibold text-neutral-lighter uppercase tracking-wider">
          Account
        </h3>
        <nav className="mt-3 space-y-1">
          {sections.map((section) => {
            const isActive = pathname.includes(section.id) || 
              (section.id === 'profile' && pathname === '/dashboard/settings');

            return (
              <Link
                key={section.id}
                href={`/dashboard/settings#${section.id}`}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-neutral-light hover:bg-gray-100 hover:text-neutral'
                )}
              >
                <section.icon className="h-4 w-4" />
                {section.label}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Advanced Section */}
      <div>
        <h3 className="px-3 text-xs font-semibold text-neutral-lighter uppercase tracking-wider">
          Advanced
        </h3>
        <nav className="mt-3 space-y-1">
          {advancedSections.map((section) => (
            <Link
              key={section.id}
              href={`/dashboard/settings#${section.id}`}
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-neutral-light hover:bg-gray-100 hover:text-neutral transition-colors"
            >
              <section.icon className="h-4 w-4" />
              {section.label}
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}
