import { LayoutGrid, LayoutList } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface DensityToggleProps {
  density: 'compact' | 'comfortable';
  onChange: (density: 'compact' | 'comfortable') => void;
}

export function DensityToggle({ density, onChange }: DensityToggleProps) {
  return (
    <div className="flex border rounded-md overflow-hidden" role="group" aria-label="Table density">
      <Button
        variant="ghost"
        size="sm"
        className={cn(
          'rounded-none h-11 px-3',
          density === 'compact' && 'bg-muted'
        )}
        onClick={() => onChange('compact')}
        title="Compact view"
        aria-label="Compact view"
        aria-pressed={density === 'compact'}
      >
        <LayoutList className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className={cn(
          'rounded-none h-11 px-3',
          density === 'comfortable' && 'bg-muted'
        )}
        onClick={() => onChange('comfortable')}
        title="Comfortable view"
        aria-label="Comfortable view"
        aria-pressed={density === 'comfortable'}
      >
        <LayoutGrid className="h-4 w-4" />
      </Button>
    </div>
  );
}
