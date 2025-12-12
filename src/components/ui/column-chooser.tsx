import { Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface Column {
  id: string;
  label: string;
  canHide: boolean; // false for pinned columns
}

interface ColumnChooserProps {
  columns: Column[];
  visibleColumns: string[];
  onToggle: (columnId: string) => void;
  onShowAll: () => void;
}

export function ColumnChooser({ columns, visibleColumns, onToggle, onShowAll }: ColumnChooserProps) {
  const hiddenCount = columns.filter(c => c.canHide && !visibleColumns.includes(c.id)).length;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1">
          <Settings2 className="h-4 w-4" />
          <span className="hidden sm:inline">Columns</span>
          {hiddenCount > 0 && (
            <span className="text-xs bg-muted px-1.5 rounded">{hiddenCount} hidden</span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel>Toggle Columns</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {columns.map(column => (
          <DropdownMenuCheckboxItem
            key={column.id}
            checked={visibleColumns.includes(column.id)}
            onCheckedChange={() => onToggle(column.id)}
            disabled={!column.canHide}
          >
            {column.label}
            {!column.canHide && <span className="ml-auto text-xs text-muted-foreground">Pinned</span>}
          </DropdownMenuCheckboxItem>
        ))}
        <DropdownMenuSeparator />
        <Button variant="ghost" size="sm" className="w-full" onClick={onShowAll}>
          Show All
        </Button>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
