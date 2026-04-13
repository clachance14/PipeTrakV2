interface BulkDeleteBarProps {
  selectedCount: number;
  onDelete: () => void;
}

export function BulkDeleteBar({ selectedCount, onDelete }: BulkDeleteBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="flex items-center gap-3 px-3 py-2">
      <span className="text-sm font-medium text-red-500">{selectedCount} selected</span>
      <button
        onClick={onDelete}
        className="text-xs px-2.5 py-1 bg-red-500/10 text-red-500 border border-red-500/30 rounded hover:bg-red-500/20"
      >
        Delete Selected
      </button>
    </div>
  );
}
