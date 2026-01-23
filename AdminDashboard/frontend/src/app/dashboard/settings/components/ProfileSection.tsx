'use client';

import { Button, Card, CardHeader } from '@/components/ui';
import { Camera } from 'lucide-react';
import { useState } from 'react';

export function ProfileSection() {
  const [profile, setProfile] = useState({
    fullName: 'Amit Sharma',
    email: 'amit.sharma@fasalvaidya.com',
    bio: 'Agriculture Data Specialist overseeing AI model integration and regional farmer support operations.',
    avatarUrl: '/avatar-placeholder.jpg',
  });

  return (
    <Card id="profile">
      <CardHeader
        title="Profile Management"
        subtitle="Update your account details and profile picture"
      />

      <div className="mt-6 flex gap-6">
        {/* Avatar */}
        <div className="relative">
          <div className="relative h-24 w-24 rounded-full overflow-hidden bg-gray-100">
            <div className="flex items-center justify-center h-full text-4xl">
              👨‍🌾
            </div>
          </div>
          <button
            className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-white shadow-lg hover:bg-primary-dark transition-colors"
            title="Change avatar"
          >
            <Camera className="h-4 w-4" />
          </button>
        </div>

        {/* Form */}
        <div className="flex-1 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-neutral-lighter uppercase tracking-wider mb-2">
                Full Name
              </label>
              <input
                type="text"
                value={profile.fullName}
                onChange={(e) =>
                  setProfile((p) => ({ ...p, fullName: e.target.value }))
                }
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-neutral focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-lighter uppercase tracking-wider mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={profile.email}
                onChange={(e) =>
                  setProfile((p) => ({ ...p, email: e.target.value }))
                }
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-neutral focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-lighter uppercase tracking-wider mb-2">
              Bio
            </label>
            <textarea
              value={profile.bio}
              onChange={(e) =>
                setProfile((p) => ({ ...p, bio: e.target.value }))
              }
              rows={3}
              className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-neutral focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary resize-none"
            />
          </div>

          <div className="flex justify-end">
            <Button>Save Changes</Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
