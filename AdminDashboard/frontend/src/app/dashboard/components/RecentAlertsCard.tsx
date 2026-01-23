import { Badge, Card, CardHeader } from '@/components/ui';
import { AlertCircle, AlertTriangle, Info } from 'lucide-react';

// Mock alerts for MVP - in production, fetch from database
const alerts = [
  {
    id: 1,
    type: 'critical',
    message: 'High disease prevalence detected in Wheat crops',
    region: 'Punjab Region',
    time: '2 hours ago',
  },
  {
    id: 2,
    type: 'warning',
    message: 'Model accuracy dropped below threshold',
    region: 'System Alert',
    time: '5 hours ago',
  },
  {
    id: 3,
    type: 'info',
    message: 'New crop variety added to detection model',
    region: 'System Update',
    time: '1 day ago',
  },
];

const alertStyles = {
  critical: {
    icon: AlertTriangle,
    bgColor: 'bg-red-50',
    iconColor: 'text-red-500',
    badge: 'danger',
  },
  warning: {
    icon: AlertCircle,
    bgColor: 'bg-amber-50',
    iconColor: 'text-amber-500',
    badge: 'warning',
  },
  info: {
    icon: Info,
    bgColor: 'bg-blue-50',
    iconColor: 'text-blue-500',
    badge: 'info',
  },
} as const;

export function RecentAlertsCard() {
  return (
    <Card padding="none">
      <div className="p-6 pb-4">
        <CardHeader 
          title="Recent Alerts" 
          subtitle="System notifications"
        />
      </div>
      <div className="px-6 pb-6 space-y-3">
        {alerts.map((alert) => {
          const style = alertStyles[alert.type as keyof typeof alertStyles];
          const Icon = style.icon;
          
          return (
            <div
              key={alert.id}
              className={`flex items-start gap-3 p-3 rounded-lg ${style.bgColor}`}
            >
              <Icon className={`h-5 w-5 mt-0.5 ${style.iconColor}`} />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-neutral">{alert.message}</p>
                <div className="mt-1 flex items-center gap-2">
                  <span className="text-xs text-neutral-light">{alert.region}</span>
                  <span className="text-xs text-neutral-lighter">•</span>
                  <span className="text-xs text-neutral-lighter">{alert.time}</span>
                </div>
              </div>
              <Badge variant={style.badge as 'danger' | 'warning' | 'info'}>
                {alert.type}
              </Badge>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
