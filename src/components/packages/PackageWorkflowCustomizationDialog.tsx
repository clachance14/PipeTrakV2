import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  PackageWorkflowPDFOptions,
  DEFAULT_PDF_OPTIONS,
} from '@/stores/usePackageWorkflowCustomizationStore';
import { validatePDFOptions } from '@/utils/pdfFilters';
import { toast } from 'sonner';

interface PackageWorkflowCustomizationDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (options: PackageWorkflowPDFOptions) => void;
  initialOptions: PackageWorkflowPDFOptions;
}

/**
 * Customization dialog for Package Workflow PDF exports.
 *
 * Features:
 * - Tabbed layout (Content, Filtering, Customization, Layout)
 * - Form validation before save
 * - Reset to defaults
 * - Temp state (changes not saved until user clicks Save)
 */
export function PackageWorkflowCustomizationDialog({
  open,
  onClose,
  onSave,
  initialOptions,
}: PackageWorkflowCustomizationDialogProps) {
  const [tempOptions, setTempOptions] = useState<PackageWorkflowPDFOptions>(initialOptions);

  // Sync tempOptions when initialOptions changes (e.g., modal reopened)
  useEffect(() => {
    if (open) {
      setTempOptions(initialOptions);
    }
  }, [open, initialOptions]);

  const updateOption = <K extends keyof PackageWorkflowPDFOptions>(
    key: K,
    value: PackageWorkflowPDFOptions[K]
  ) => {
    setTempOptions((prev) => ({ ...prev, [key]: value }));
  };

  const handleReset = () => {
    setTempOptions(DEFAULT_PDF_OPTIONS);
    toast.success('Reset to default settings');
  };

  const handleSave = () => {
    // Validate options
    const validationError = validatePDFOptions(tempOptions);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    // Save and close
    onSave(tempOptions);
    toast.success('PDF settings saved');
  };

  const handleCancel = () => {
    // Discard changes
    setTempOptions(initialOptions);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleCancel}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Customize Package Workflow Report</DialogTitle>
          <DialogDescription>
            Configure what to include in the PDF export
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="content" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="content">Content</TabsTrigger>
            <TabsTrigger value="filtering">Filtering</TabsTrigger>
            <TabsTrigger value="customization">Customization</TabsTrigger>
            <TabsTrigger value="layout">Layout</TabsTrigger>
          </TabsList>

          {/* Content Tab */}
          <TabsContent value="content" className="space-y-4">
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium mb-2">Package Information</h3>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="includePackageInfo"
                      checked={tempOptions.includePackageInfo}
                      onCheckedChange={(checked) =>
                        updateOption('includePackageInfo', !!checked)
                      }
                    />
                    <Label htmlFor="includePackageInfo">Include package info section</Label>
                  </div>

                  {tempOptions.includePackageInfo && (
                    <div className="ml-6 space-y-2">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="includeDescription"
                          checked={tempOptions.includeDescription}
                          onCheckedChange={(checked) =>
                            updateOption('includeDescription', !!checked)
                          }
                        />
                        <Label htmlFor="includeDescription">Include description</Label>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="includeTestType"
                          checked={tempOptions.includeTestType}
                          onCheckedChange={(checked) =>
                            updateOption('includeTestType', !!checked)
                          }
                        />
                        <Label htmlFor="includeTestType">Include test type</Label>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="includeTargetDate"
                          checked={tempOptions.includeTargetDate}
                          onCheckedChange={(checked) =>
                            updateOption('includeTargetDate', !!checked)
                          }
                        />
                        <Label htmlFor="includeTargetDate">Include target date</Label>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="includeRequirements"
                          checked={tempOptions.includeRequirements}
                          onCheckedChange={(checked) =>
                            updateOption('includeRequirements', !!checked)
                          }
                        />
                        <Label htmlFor="includeRequirements">
                          Include coating/insulation requirements
                        </Label>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium mb-2">Workflow Stages</h3>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="includeSkippedStages"
                      checked={tempOptions.includeSkippedStages}
                      onCheckedChange={(checked) =>
                        updateOption('includeSkippedStages', !!checked)
                      }
                    />
                    <Label htmlFor="includeSkippedStages">Include skipped stages</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="showStageData"
                      checked={tempOptions.showStageData}
                      onCheckedChange={(checked) =>
                        updateOption('showStageData', !!checked)
                      }
                    />
                    <Label htmlFor="showStageData">Show stage data fields</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="showSignOffs"
                      checked={tempOptions.showSignOffs}
                      onCheckedChange={(checked) =>
                        updateOption('showSignOffs', !!checked)
                      }
                    />
                    <Label htmlFor="showSignOffs">Show sign-offs</Label>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Filtering Tab */}
          <TabsContent value="filtering" className="space-y-4">
            <div>
              <Label className="text-sm font-medium">Stage Status Filter</Label>
              <RadioGroup
                value={tempOptions.stageStatusFilter}
                onValueChange={(value) =>
                  updateOption(
                    'stageStatusFilter',
                    value as PackageWorkflowPDFOptions['stageStatusFilter']
                  )
                }
                className="mt-2 space-y-2"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="all" id="filter-all" />
                  <Label htmlFor="filter-all">All stages</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="completed" id="filter-completed" />
                  <Label htmlFor="filter-completed">Completed only</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="in-progress" id="filter-in-progress" />
                  <Label htmlFor="filter-in-progress">In progress only</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="not-started" id="filter-not-started" />
                  <Label htmlFor="filter-not-started">Not started only</Label>
                </div>
              </RadioGroup>
            </div>
          </TabsContent>

          {/* Customization Tab */}
          <TabsContent value="customization" className="space-y-4">
            <div>
              <Label htmlFor="customTitle">Custom Report Title (optional)</Label>
              <Input
                id="customTitle"
                placeholder="Package Workflow Report"
                value={tempOptions.customTitle || ''}
                onChange={(e) => updateOption('customTitle', e.target.value || undefined)}
                maxLength={100}
              />
              <p className="text-xs text-muted-foreground mt-1">
                {tempOptions.customTitle?.length || 0}/100 characters
              </p>
            </div>

            <div>
              <Label htmlFor="customHeaderText">Custom Header Text (optional)</Label>
              <Input
                id="customHeaderText"
                placeholder="Additional header information"
                value={tempOptions.customHeaderText || ''}
                onChange={(e) => updateOption('customHeaderText', e.target.value || undefined)}
                maxLength={200}
              />
              <p className="text-xs text-muted-foreground mt-1">
                {tempOptions.customHeaderText?.length || 0}/200 characters
              </p>
            </div>

            <div>
              <Label htmlFor="customNotes">Custom Notes (optional)</Label>
              <Textarea
                id="customNotes"
                placeholder="Add any additional notes or instructions..."
                value={tempOptions.customNotes || ''}
                onChange={(e) => updateOption('customNotes', e.target.value || undefined)}
                maxLength={1000}
                rows={4}
              />
              <p className="text-xs text-muted-foreground mt-1">
                {tempOptions.customNotes?.length || 0}/1000 characters
              </p>
            </div>
          </TabsContent>

          {/* Layout Tab */}
          <TabsContent value="layout" className="space-y-4">
            <div>
              <Label className="text-sm font-medium">View Mode</Label>
              <RadioGroup
                value={tempOptions.viewMode}
                onValueChange={(value) =>
                  updateOption('viewMode', value as PackageWorkflowPDFOptions['viewMode'])
                }
                className="mt-2 space-y-2"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="summary" id="view-summary" />
                  <Label htmlFor="view-summary">
                    Summary view (stage titles + status only)
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="detailed" id="view-detailed" />
                  <Label htmlFor="view-detailed">
                    Detailed view (all data and sign-offs)
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="includeCompanyLogo"
                checked={tempOptions.includeCompanyLogo}
                onCheckedChange={(checked) =>
                  updateOption('includeCompanyLogo', !!checked)
                }
              />
              <Label htmlFor="includeCompanyLogo">Include company logo</Label>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="flex justify-between">
          <Button variant="outline" onClick={handleReset}>
            Reset to Defaults
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <Button onClick={handleSave}>Save Settings</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
