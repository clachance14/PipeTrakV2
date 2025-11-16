import { LucideIcon } from 'lucide-react';
import { Card } from '@/components/ui/card';

export interface MetricCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: string;
  badge?: number;
}

/**
 * Dashboard metric card component
 * Displays a single metric with icon, value, and optional badge/trend
 */
export function MetricCard({ title, value, icon: Icon, trend, badge }: MetricCardProps) {
  return (
    <Card className="p-6">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-3xl font-bold text-foreground mt-2">{value}</p>
          {trend && (
            <p className="text-sm text-muted-foreground mt-2">
              {trend}
            </p>
          )}
        </div>
        <div className="relative">
          <div className="p-3 bg-primary/10 rounded-lg">
            <Icon className="h-6 w-6 text-primary" />
          </div>
          {badge !== undefined && badge > 0 && (
            <div className="absolute -top-2 -right-2 flex items-center justify-center h-6 w-6 bg-red-500 text-white text-xs font-bold rounded-full">
              {badge > 99 ? '99+' : badge}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
