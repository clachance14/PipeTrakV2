/**
 * DrawingsPage (Feature 007)
 * Page for viewing and retiring drawings
 */

import { useState } from 'react';
import { DrawingRetireDialog } from '@/components/DrawingRetireDialog';
import { PermissionGate } from '@/components/PermissionGate';
import { useDrawings } from '@/hooks/useDrawings';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface DrawingsPageProps {
  projectId: string;
}

export function DrawingsPage({ projectId }: DrawingsPageProps) {
  const [search, setSearch] = useState('');
  const [showRetired, setShowRetired] = useState(false);
  const [retireDialog, setRetireDialog] = useState<{
    id: string;
    number: string;
  } | null>(null);

  const { data: drawings = [], isLoading } = useDrawings(projectId, {
    is_retired: showRetired,
    search,
  });

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Drawings</h1>
        <p className="text-muted-foreground">
          Manage construction drawings and their retirement
        </p>
      </div>

      {/* Filters */}
      <div className="flex gap-4 items-end">
        <div className="flex-1 space-y-2">
          <Label>Search Drawings</Label>
          <Input
            placeholder="Search by drawing number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label>Status</Label>
          <Select
            value={showRetired ? 'retired' : 'active'}
            onValueChange={(value) => setShowRetired(value === 'retired')}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active Only</SelectItem>
              <SelectItem value="retired">Show Retired</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Drawings List */}
      {isLoading ? (
        <div className="text-center py-12">Loading drawings...</div>
      ) : drawings.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          No drawings found
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-muted">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium">Drawing Number</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Title</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Revision</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Status</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {drawings.map((drawing) => (
                <tr key={drawing.id} className="hover:bg-muted/50">
                  <td className="px-4 py-3 font-medium">{drawing.drawing_no_norm}</td>
                  <td className="px-4 py-3 text-sm">{drawing.title || 'N/A'}</td>
                  <td className="px-4 py-3 text-sm">{drawing.rev || 'N/A'}</td>
                  <td className="px-4 py-3">
                    {drawing.is_retired ? (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                        Retired
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Active
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {!drawing.is_retired && (
                      <PermissionGate permission="can_manage_team">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            setRetireDialog({
                              id: drawing.id,
                              number: drawing.drawing_no_norm,
                            })
                          }
                        >
                          Retire
                        </Button>
                      </PermissionGate>
                    )}
                    {drawing.is_retired && drawing.retire_reason && (
                      <div className="text-xs text-muted-foreground">
                        Reason: {drawing.retire_reason}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Retire Dialog */}
      {retireDialog && (
        <DrawingRetireDialog
          drawingId={retireDialog.id}
          drawingNumber={retireDialog.number}
          open={true}
          onOpenChange={(open) => !open && setRetireDialog(null)}
          onSuccess={() => setRetireDialog(null)}
        />
      )}
    </div>
  );
}
