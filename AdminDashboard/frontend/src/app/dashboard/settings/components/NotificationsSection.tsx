'use client';

import { Card, CardHeader, Toggle } from '@/components/ui';
import { useState } from 'react';

interface NotificationSetting {
  id: string;
  title: string;
  description: string;
  enabled: boolean;
}

export function NotificationsSection() {
  const [notifications, setNotifications] = useState<NotificationSetting[]>([
    {
      id: 'critical-alerts',
      title: 'Critical Disease Alerts',
      description: 'Real-time push notifications for urgent crop threats',
      enabled: true,
    },
    {
      id: 'performance-reports',
      title: 'System Performance Reports',
      description: 'Weekly analytical summaries of AI accuracy',
      enabled: true,
    },
    {
      id: 'farmer-activity',
      title: 'Regional Farmer Activity',
      description: 'Daily digests of new farmer registrations',
      enabled: false,
    },
  ]);

  const toggleNotification = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, enabled: !n.enabled } : n))
    );
  };

  return (
    <Card id="notifications">
      <CardHeader
        title="Notification Alerts"
        subtitle="Choose how you receive platform updates"
      />

      <div className="mt-6 space-y-4">
        {notifications.map((notification) => (
          <div
            key={notification.id}
            className="flex items-center justify-between rounded-lg border border-gray-100 p-4"
          >
            <div>
              <h4 className="text-sm font-medium text-neutral">
                {notification.title}
              </h4>
              <p className="mt-0.5 text-sm text-neutral-light">
                {notification.description}
              </p>
            </div>
            <Toggle
              checked={notification.enabled}
              onChange={() => toggleNotification(notification.id)}
            />
          </div>
        ))}
      </div>
    </Card>
  );
}
