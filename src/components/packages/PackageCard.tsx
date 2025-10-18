import { useNavigate } from 'react-router-dom';
import { Package, AlertTriangle } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export interface PackageCardData {
  id: string;
  name: string;
  progress: number; // 0-100
  componentCount: number;
  blockerCount: number;
  targetDate?: string;
  statusColor: 'green' | 'blue' | 'amber';
}

export interface PackageCardProps {
  package: PackageCardData;
}

/**
 * Package card component displaying test package readiness
 * Shows progress, component count, blockers, and target date
 * Clicking navigates to components page filtered by this package
 */
export function PackageCard({ package: pkg }: PackageCardProps) {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate(`/components?package=${pkg.id}`);
  };

  const borderColorClass = {
    green: 'border-l-green-500',
    blue: 'border-l-blue-500',
    amber: 'border-l-amber-500'
  }[pkg.statusColor];

  const progressColorClass = {
    green: 'bg-green-500',
    blue: 'bg-blue-500',
    amber: 'bg-amber-500'
  }[pkg.statusColor];

  return (
    <Card
      className={cn(
        'p-6 border-l-4 cursor-pointer hover:shadow-lg transition-shadow',
        borderColorClass
      )}
      onClick={handleClick}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2">
          <Package className="h-5 w-5 text-gray-600" />
          <h3 className="font-semibold text-gray-900">{pkg.name}</h3>
        </div>
        {pkg.blockerCount > 0 && (
          <div className="flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-800 rounded-md text-xs font-medium">
            <AlertTriangle className="h-3 w-3" />
            {pkg.blockerCount} blocker{pkg.blockerCount > 1 ? 's' : ''}
          </div>
        )}
      </div>

      {/* Progress bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm text-gray-600">Progress</span>
          <span className="text-sm font-semibold text-gray-900">{pkg.progress}%</span>
        </div>
        <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={cn('h-full transition-all duration-300', progressColorClass)}
            style={{ width: `${pkg.progress}%` }}
          />
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between text-sm text-gray-600">
        <span>{pkg.componentCount} component{pkg.componentCount !== 1 ? 's' : ''}</span>
        {pkg.targetDate && (
          <span>Target: {new Date(pkg.targetDate).toLocaleDateString()}</span>
        )}
      </div>
    </Card>
  );
}
