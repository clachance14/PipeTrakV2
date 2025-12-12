import { useState } from 'react';
import { Bookmark, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useComponentPreferencesStore } from '@/stores/useComponentPreferencesStore';

const BUILT_IN_VIEW_IDS = ['default', 'by-area', 'needs-work'];

export function SavedViewManager() {
  const { savedViews, activeViewId, loadView, saveView, deleteView } = useComponentPreferencesStore();
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [newViewName, setNewViewName] = useState('');

  const activeView = savedViews.find(v => v.id === activeViewId);

  const handleSave = () => {
    if (newViewName.trim()) {
      saveView(newViewName.trim());
      setNewViewName('');
      setShowSaveDialog(false);
    }
  };

  const handleDelete = (viewId: string) => {
    if (!BUILT_IN_VIEW_IDS.includes(viewId)) {
      deleteView(viewId);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-1">
            <Bookmark className="h-4 w-4" />
            <span className="hidden sm:inline">{activeView?.name || 'Views'}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>Saved Views</DropdownMenuLabel>
          <DropdownMenuSeparator />

          {savedViews.map(view => (
            <DropdownMenuItem
              key={view.id}
              className="flex justify-between items-center"
              onClick={() => loadView(view.id)}
            >
              <span className={view.id === activeViewId ? 'font-semibold' : ''}>
                {view.name}
              </span>
              {!BUILT_IN_VIEW_IDS.includes(view.id) && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(view.id);
                  }}
                  aria-label={`Delete ${view.name} view`}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              )}
            </DropdownMenuItem>
          ))}

          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setShowSaveDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Save Current View
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Current View</DialogTitle>
            <DialogDescription>
              Save your current column visibility and sort settings as a named view.
            </DialogDescription>
          </DialogHeader>
          <Input
            placeholder="View name"
            value={newViewName}
            onChange={(e) => setNewViewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaveDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!newViewName.trim()}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
