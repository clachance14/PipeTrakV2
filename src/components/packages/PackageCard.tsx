import { useNavigate } from 'react-router-dom';
import { Package, AlertTriangle, Edit } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface PackageCardData {
  id: string;
  name: string;
  description?: string | null;
  progress: number; // 0-100
  componentCount: number;
  blockerCount: number;
  targetDate?: string;
  statusColor: 'green' | 'blue' | 'amber';
}

export interface PackageCardProps {
  package: PackageCardData;
  onEdit?: () => void;
}

/**
 * Package card component displaying test package readiness
 * Shows progress, component count, blockers, description, and target date
 * Clicking navigates to package detail page
 */
export function PackageCard({ package: pkg, onEdit }: PackageCardProps) {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate(`/packages/${pkg.id}/components`);
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit?.();
  };

  const truncateDescription = (text: string | null | undefined, maxLength: number) => {
    if (!text) return null;
    return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
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
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Package className="h-5 w-5 text-gray-600 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900">{pkg.name}</h3>
            {pkg.description && (
              <p className="text-sm text-gray-500 truncate mt-0.5">
                {truncateDescription(pkg.description, 60)}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 ml-2">
          {onEdit && (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 w-7 p-0"
              onClick={handleEdit}
              aria-label="Edit package"
            >
              <Edit className="h-4 w-4" />
            </Button>
          )}
          {pkg.blockerCount > 0 && (
            <div className="flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-800 rounded-md text-xs font-medium">
              <AlertTriangle className="h-3 w-3" />
              {pkg.blockerCount}
            </div>
          )}
        </div>
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
