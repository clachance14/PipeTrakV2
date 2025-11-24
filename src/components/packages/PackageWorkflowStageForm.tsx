/**
 * Package Workflow Stage Form Component
 *
 * Dynamic form for completing/editing workflow stages.
 * Feature 030 - Test Package Lifecycle Workflow
 *
 * Features:
 * - Stage-specific fields (varies by stage type)
 * - Sign-off inputs (QC, Client, MFG based on stage requirements)
 * - Skip functionality with required reason
 * - Audit trail display for completed stages (read-only)
 * - Validation for required fields + sign-offs
 *
 * Business Rules:
 * - FR-021: Skip requires non-empty reason
 * - FR-024: Completion requires stage data + required sign-offs
 * - FR-026: Completed stages show audit trail (who, when, what)
 */

import { useState } from 'react';
import { useUpdateWorkflowStage } from '@/hooks/usePackageWorkflow';
import { useAuth } from '@/contexts/AuthContext';
import { getStageConfig } from '@/lib/workflowStageConfig';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Calendar, User, AlertTriangle, Plus, Trash2 } from 'lucide-react';
import { StageDataDisplay } from './StageDataDisplay';
import type {
  PackageWorkflowStage,
  StageData,
  StageSignOffs,
  PreHydroStageData,
  TestAcceptanceStageData,
  DrainFlushStageData,
  PostHydroStageData,
  ProtectiveCoatingsStageData,
  InsulationStageData,
  FinalAcceptanceStageData,
} from '@/types/workflow.types';

interface PackageWorkflowStageFormProps {
  stage: PackageWorkflowStage;
}

/**
 * Format ISO date string to display format
 */
function formatDate(isoDate: string): string {
  return new Date(isoDate).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Audit trail display for completed stages
 */
function AuditTrail({ stage }: { stage: PackageWorkflowStage }) {
  if (stage.status !== 'completed' && stage.status !== 'skipped') {
    return null;
  }

  return (
    <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
      <h4 className="text-sm font-medium text-blue-900 mb-3">Audit Trail</h4>

      {stage.status === 'completed' && (
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2 text-blue-800">
            <User className="h-4 w-4" />
            <span className="font-medium">Completed by:</span>
            <span>{stage.completed_by_user?.full_name || 'Unknown'}</span>
          </div>

          <div className="flex items-center gap-2 text-blue-800">
            <Calendar className="h-4 w-4" />
            <span className="font-medium">Completed at:</span>
            <span>{stage.completed_at ? formatDate(stage.completed_at) : 'Unknown'}</span>
          </div>

          {/* Display sign-offs */}
          {stage.signoffs && (
            <div className="mt-3 pt-3 border-t border-blue-200">
              <p className="font-medium text-blue-900 mb-2">Sign-offs:</p>
              <div className="space-y-1">
                {stage.signoffs.qc_rep && (
                  <div className="text-blue-800">
                    <span className="font-medium">QC Rep:</span> {stage.signoffs.qc_rep.name} (
                    {new Date(stage.signoffs.qc_rep.date).toLocaleDateString()})
                  </div>
                )}
                {stage.signoffs.client_rep && (
                  <div className="text-blue-800">
                    <span className="font-medium">Client Rep:</span>{' '}
                    {stage.signoffs.client_rep.name} (
                    {new Date(stage.signoffs.client_rep.date).toLocaleDateString()})
                  </div>
                )}
                {stage.signoffs.mfg_rep && (
                  <div className="text-blue-800">
                    <span className="font-medium">MFG Rep:</span> {stage.signoffs.mfg_rep.name} (
                    {new Date(stage.signoffs.mfg_rep.date).toLocaleDateString()})
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {stage.status === 'skipped' && (
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2 text-yellow-800">
            <AlertTriangle className="h-4 w-4" />
            <span className="font-medium">Skipped</span>
          </div>
          {stage.skip_reason && (
            <div className="mt-2 p-2 bg-yellow-100 rounded text-yellow-900">
              <span className="font-medium">Reason:</span> {stage.skip_reason}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Pre-Hydro Acceptance form fields
 */
function PreHydroFields({
  data,
  onChange,
}: {
  data: Partial<PreHydroStageData>;
  onChange: (data: Partial<PreHydroStageData>) => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="inspector">Inspector Name</Label>
        <Input
          id="inspector"
          value={data.inspector || ''}
          onChange={(e) => onChange({ ...data, inspector: e.target.value })}
          placeholder="Enter inspector name"
          required
        />
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="nde_complete"
          checked={data.nde_complete || false}
          onChange={(e) => onChange({ ...data, nde_complete: e.target.checked })}
          className="h-4 w-4 text-blue-600 rounded border-gray-300"
        />
        <Label htmlFor="nde_complete" className="cursor-pointer">
          NDE (Non-Destructive Examination) Complete
        </Label>
      </div>
    </div>
  );
}

/**
 * Test Acceptance form fields
 */
function TestAcceptanceFields({
  data,
  onChange,
}: {
  data: Partial<TestAcceptanceStageData>;
  onChange: (data: Partial<TestAcceptanceStageData>) => void;
}) {
  // Initialize gauges array from existing data or with one empty row
  const gauges: Array<{ number: string; calibration_date: string }> = [];

  if (data.gauge_numbers && data.calibration_dates) {
    for (let i = 0; i < Math.max(data.gauge_numbers.length, data.calibration_dates.length); i++) {
      gauges.push({
        number: data.gauge_numbers[i] || '',
        calibration_date: data.calibration_dates[i] || '',
      });
    }
  }

  if (gauges.length === 0) {
    gauges.push({ number: '', calibration_date: '' });
  }

  const handleGaugeChange = (index: number, field: 'number' | 'calibration_date', value: string) => {
    const newGauges = [...gauges];
    const currentGauge = newGauges[index];
    if (!currentGauge) return;

    if (field === 'number') {
      newGauges[index] = { number: value, calibration_date: currentGauge.calibration_date };
    } else {
      newGauges[index] = { number: currentGauge.number, calibration_date: value };
    }

    onChange({
      ...data,
      gauge_numbers: newGauges.map((g) => g.number),
      calibration_dates: newGauges.map((g) => g.calibration_date),
    });
  };

  const handleAddGauge = () => {
    const newGauges = [...gauges, { number: '', calibration_date: '' }];
    onChange({
      ...data,
      gauge_numbers: newGauges.map((g) => g.number),
      calibration_dates: newGauges.map((g) => g.calibration_date),
    });
  };

  const handleRemoveGauge = (index: number) => {
    if (gauges.length === 1) return; // Keep at least one row

    const newGauges = gauges.filter((_, i) => i !== index);
    onChange({
      ...data,
      gauge_numbers: newGauges.map((g) => g.number),
      calibration_dates: newGauges.map((g) => g.calibration_date),
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <Label>Gauges Used</Label>
        <div className="mt-2 border rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Gauge Number
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Calibration Date
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-20">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {gauges.map((gauge, index) => (
                <tr key={index}>
                  <td className="px-4 py-3">
                    <Input
                      value={gauge.number}
                      onChange={(e) => handleGaugeChange(index, 'number', e.target.value)}
                      placeholder="G-001"
                      required
                      className="w-full"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <Input
                      type="date"
                      value={gauge.calibration_date}
                      onChange={(e) => handleGaugeChange(index, 'calibration_date', e.target.value)}
                      required
                      className="w-full"
                    />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveGauge(index)}
                      disabled={gauges.length === 1}
                      className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleAddGauge}
          className="mt-2"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Gauge
        </Button>
      </div>

      <div>
        <Label htmlFor="time_held">Time Held (minutes)</Label>
        <Input
          id="time_held"
          type="number"
          value={data.time_held || ''}
          onChange={(e) => onChange({ ...data, time_held: parseInt(e.target.value, 10) })}
          placeholder="240"
          required
        />
      </div>
    </div>
  );
}

/**
 * Drain/Flush Acceptance form fields
 */
function DrainFlushFields({
  data,
  onChange,
}: {
  data: Partial<DrainFlushStageData>;
  onChange: (data: Partial<DrainFlushStageData>) => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="drain_date">Drain Date</Label>
        <Input
          id="drain_date"
          type="date"
          value={data.drain_date || ''}
          onChange={(e) => onChange({ ...data, drain_date: e.target.value })}
          required
        />
      </div>

      <div>
        <Label htmlFor="flush_date">Flush Date</Label>
        <Input
          id="flush_date"
          type="date"
          value={data.flush_date || ''}
          onChange={(e) => onChange({ ...data, flush_date: e.target.value })}
          required
        />
      </div>
    </div>
  );
}

/**
 * Post-Hydro Acceptance form fields
 */
function PostHydroFields({
  data,
  onChange,
}: {
  data: Partial<PostHydroStageData>;
  onChange: (data: Partial<PostHydroStageData>) => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="inspection_date">Inspection Date</Label>
        <Input
          id="inspection_date"
          type="date"
          value={data.inspection_date || ''}
          onChange={(e) => onChange({ ...data, inspection_date: e.target.value })}
          required
        />
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="defects_found"
          checked={data.defects_found || false}
          onChange={(e) => onChange({ ...data, defects_found: e.target.checked })}
          className="h-4 w-4 text-blue-600 rounded border-gray-300"
        />
        <Label htmlFor="defects_found" className="cursor-pointer">
          Defects Found
        </Label>
      </div>

      {data.defects_found && (
        <div>
          <Label htmlFor="defect_description">Defect Description</Label>
          <Textarea
            id="defect_description"
            value={data.defect_description || ''}
            onChange={(e) => onChange({ ...data, defect_description: e.target.value })}
            placeholder="Describe defects found"
            rows={3}
          />
        </div>
      )}
    </div>
  );
}

/**
 * Protective Coatings Acceptance form fields
 * Simplified: Only coating type and spec. Completion date captured in sign-off.
 */
function ProtectiveCoatingsFields({
  data,
  onChange,
}: {
  data: Partial<ProtectiveCoatingsStageData>;
  onChange: (data: Partial<ProtectiveCoatingsStageData>) => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="coating_type">Coating Type</Label>
        <Input
          id="coating_type"
          value={data.coating_type || ''}
          onChange={(e) => onChange({ ...data, coating_type: e.target.value })}
          placeholder="e.g., Epoxy, Polyurethane"
          required
        />
      </div>

      <div>
        <Label htmlFor="client_paint_spec">Client Paint Spec</Label>
        <Input
          id="client_paint_spec"
          value={data.client_paint_spec || ''}
          onChange={(e) => onChange({ ...data, client_paint_spec: e.target.value })}
          placeholder="e.g., ABC-123, XYZ Spec Rev 2"
          required
        />
      </div>
    </div>
  );
}

/**
 * Insulation Acceptance form fields
 * Simplified: Only insulation type and spec. Completion date captured in sign-off.
 */
function InsulationFields({
  data,
  onChange,
}: {
  data: Partial<InsulationStageData>;
  onChange: (data: Partial<InsulationStageData>) => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="insulation_type">Insulation Type</Label>
        <Input
          id="insulation_type"
          value={data.insulation_type || ''}
          onChange={(e) => onChange({ ...data, insulation_type: e.target.value })}
          placeholder="e.g., Fiberglass, Mineral Wool"
          required
        />
      </div>

      <div>
        <Label htmlFor="insulation_spec">Insulation Spec</Label>
        <Input
          id="insulation_spec"
          value={data.insulation_spec || ''}
          onChange={(e) => onChange({ ...data, insulation_spec: e.target.value })}
          placeholder="e.g., ASTM C553, Client Spec INS-100"
          required
        />
      </div>
    </div>
  );
}

/**
 * Final Package Acceptance form fields
 */
function FinalAcceptanceFields({
  data,
  onChange,
}: {
  data: Partial<FinalAcceptanceStageData>;
  onChange: (data: Partial<FinalAcceptanceStageData>) => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="final_notes">Final Notes</Label>
        <Textarea
          id="final_notes"
          value={data.final_notes || ''}
          onChange={(e) => onChange({ ...data, final_notes: e.target.value })}
          placeholder="Enter final acceptance notes"
          rows={4}
          required
        />
      </div>
    </div>
  );
}

/**
 * Sign-off inputs
 */
function SignOffInputs({
  stageName,
  signoffs,
  onChange,
}: {
  stageName: string;
  signoffs: Partial<StageSignOffs>;
  onChange: (signoffs: Partial<StageSignOffs>) => void;
}) {
  const config = getStageConfig(stageName as any);
  const { user } = useAuth();

  return (
    <div className="space-y-4 mt-6 pt-6 border-t border-gray-200">
      <h4 className="text-sm font-medium text-gray-900">Required Sign-offs</h4>

      {/* QC Rep */}
      {config.required_signoffs.includes('qc_rep') && (
        <div>
          <Label htmlFor="qc_rep_name">QC Representative Name</Label>
          <Input
            id="qc_rep_name"
            value={signoffs.qc_rep?.name || ''}
            onChange={(e) =>
              onChange({
                ...signoffs,
                qc_rep: {
                  name: e.target.value,
                  date: new Date().toISOString(),
                  user_id: user?.id || '',
                },
              })
            }
            placeholder="Enter QC representative name"
            required
          />
        </div>
      )}

      {/* Client Rep */}
      {config.required_signoffs.includes('client_rep') && (
        <div>
          <Label htmlFor="client_rep_name">Client Representative Name</Label>
          <Input
            id="client_rep_name"
            value={signoffs.client_rep?.name || ''}
            onChange={(e) =>
              onChange({
                ...signoffs,
                client_rep: {
                  name: e.target.value,
                  date: new Date().toISOString(),
                  user_id: user?.id || '',
                },
              })
            }
            placeholder="Enter client representative name"
            required
          />
        </div>
      )}

      {/* MFG Rep */}
      {config.required_signoffs.includes('mfg_rep') && (
        <div>
          <Label htmlFor="mfg_rep_name">MFG Representative Name</Label>
          <Input
            id="mfg_rep_name"
            value={signoffs.mfg_rep?.name || ''}
            onChange={(e) =>
              onChange({
                ...signoffs,
                mfg_rep: {
                  name: e.target.value,
                  date: new Date().toISOString(),
                  user_id: user?.id || '',
                },
              })
            }
            placeholder="Enter MFG representative name"
            required
          />
        </div>
      )}
    </div>
  );
}

/**
 * Package Workflow Stage Form
 *
 * Main form component with dynamic fields based on stage type.
 */
export function PackageWorkflowStageForm({ stage }: PackageWorkflowStageFormProps) {
  const { user } = useAuth();
  const { mutate: updateStage, isPending } = useUpdateWorkflowStage();

  const [stageData, setStageData] = useState<Partial<StageData>>(
    stage.stage_data || ({} as Partial<StageData>)
  );
  const [signoffs, setSignoffs] = useState<Partial<StageSignOffs>>(
    stage.signoffs || {}
  );
  const [skipReason, setSkipReason] = useState(stage.skip_reason || '');
  const [isSkipping, setIsSkipping] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Completed stages are read-only by default, but can be edited
  if ((stage.status === 'completed' || stage.status === 'skipped') && !isEditing) {
    return (
      <div>
        <AuditTrail stage={stage} />

        {/* Display completed stage data (read-only) */}
        {stage.stage_data && <StageDataDisplay stageData={stage.stage_data} />}

        {/* Edit button for completed stages */}
        <div className="mt-4">
          <Button
            type="button"
            onClick={() => setIsEditing(true)}
            variant="outline"
          >
            Edit
          </Button>
        </div>
      </div>
    );
  }

  // Handle mark complete
  const handleComplete = () => {
    if (!user) return;

    // Add stage discriminator
    let finalStageData: StageData;

    // Preserve original completion data if editing
    const originalCompletion =
      isEditing && stage.status === 'completed'
        ? {
            completed_by: stage.completed_by,
            completed_at: stage.completed_at,
            completed_by_name: stage.signoffs?.qc_rep?.name || 'Unknown',
          }
        : undefined;

    switch (stage.stage_name) {
      case 'Pre-Hydro Acceptance':
        finalStageData = {
          ...stageData,
          stage: 'pre_hydro',
          ...(originalCompletion && { original_completion: originalCompletion }),
        } as PreHydroStageData;
        break;
      case 'Test Acceptance':
        finalStageData = {
          ...stageData,
          stage: 'test_acceptance',
          ...(originalCompletion && { original_completion: originalCompletion }),
        } as TestAcceptanceStageData;
        break;
      case 'Drain/Flush Acceptance':
        finalStageData = {
          ...stageData,
          stage: 'drain_flush',
          ...(originalCompletion && { original_completion: originalCompletion }),
        } as DrainFlushStageData;
        break;
      case 'Post-Hydro Acceptance':
        finalStageData = {
          ...stageData,
          stage: 'post_hydro',
          ...(originalCompletion && { original_completion: originalCompletion }),
        } as PostHydroStageData;
        break;
      case 'Protective Coatings Acceptance':
        finalStageData = {
          ...stageData,
          stage: 'protective_coatings',
          ...(originalCompletion && { original_completion: originalCompletion }),
        } as ProtectiveCoatingsStageData;
        break;
      case 'Insulation Acceptance':
        finalStageData = {
          ...stageData,
          stage: 'insulation',
          ...(originalCompletion && { original_completion: originalCompletion }),
        } as InsulationStageData;
        break;
      case 'Final Package Acceptance':
        finalStageData = {
          ...stageData,
          stage: 'final_acceptance',
          ...(originalCompletion && { original_completion: originalCompletion }),
        } as FinalAcceptanceStageData;
        break;
      default:
        return;
    }

    updateStage(
      {
        stageId: stage.id,
        input: {
          status: 'completed',
          stage_data: finalStageData,
          signoffs: signoffs as StageSignOffs,
          completed_by: user.id,
          completed_at: new Date().toISOString(),
        },
      },
      {
        onSuccess: () => {
          setIsEditing(false);
        },
      }
    );
  };

  // Handle skip
  const handleSkip = () => {
    updateStage({
      stageId: stage.id,
      input: {
        status: 'skipped',
        skip_reason: skipReason,
      },
    });
  };

  // Skip mode UI
  if (isSkipping) {
    return (
      <div className="space-y-4">
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-800 font-medium mb-2">
            You are about to skip this stage
          </p>
          <p className="text-xs text-yellow-700">
            A reason is required to skip a workflow stage.
          </p>
        </div>

        <div>
          <Label htmlFor="skip_reason">Skip Reason</Label>
          <Textarea
            id="skip_reason"
            value={skipReason}
            onChange={(e) => setSkipReason(e.target.value)}
            placeholder="Enter reason for skipping this stage"
            rows={3}
            required
          />
        </div>

        <div className="flex gap-2">
          <Button
            type="button"
            onClick={handleSkip}
            disabled={isPending || !skipReason.trim()}
            variant="destructive"
          >
            {isPending ? 'Skipping...' : 'Confirm Skip'}
          </Button>
          <Button
            type="button"
            onClick={() => setIsSkipping(false)}
            variant="outline"
            disabled={isPending}
          >
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  // Render stage-specific fields
  const renderStageFields = () => {
    switch (stage.stage_name) {
      case 'Pre-Hydro Acceptance':
        return (
          <PreHydroFields
            data={stageData as Partial<PreHydroStageData>}
            onChange={setStageData}
          />
        );
      case 'Test Acceptance':
        return (
          <TestAcceptanceFields
            data={stageData as Partial<TestAcceptanceStageData>}
            onChange={setStageData}
          />
        );
      case 'Drain/Flush Acceptance':
        return (
          <DrainFlushFields
            data={stageData as Partial<DrainFlushStageData>}
            onChange={setStageData}
          />
        );
      case 'Post-Hydro Acceptance':
        return (
          <PostHydroFields
            data={stageData as Partial<PostHydroStageData>}
            onChange={setStageData}
          />
        );
      case 'Protective Coatings Acceptance':
        return (
          <ProtectiveCoatingsFields
            data={stageData as Partial<ProtectiveCoatingsStageData>}
            onChange={setStageData}
          />
        );
      case 'Insulation Acceptance':
        return (
          <InsulationFields
            data={stageData as Partial<InsulationStageData>}
            onChange={setStageData}
          />
        );
      case 'Final Package Acceptance':
        return (
          <FinalAcceptanceFields
            data={stageData as Partial<FinalAcceptanceStageData>}
            onChange={setStageData}
          />
        );
      default:
        return null;
    }
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        handleComplete();
      }}
      className="space-y-6"
    >
      {/* Audit trail notice when editing completed stage */}
      {isEditing && stage.status === 'completed' && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-amber-900">
              <p className="font-medium">Editing Completed Stage</p>
              <p className="mt-1">
                Previously completed by {stage.signoffs?.qc_rep?.name || 'Unknown'} on{' '}
                {stage.completed_at ? formatDate(stage.completed_at) : 'Unknown date'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Stage-specific fields */}
      {renderStageFields()}

      {/* Sign-off inputs */}
      <SignOffInputs
        stageName={stage.stage_name}
        signoffs={signoffs}
        onChange={setSignoffs}
      />

      {/* Action buttons */}
      <div className="flex gap-2 pt-4 border-t border-gray-200">
        <Button type="submit" disabled={isPending}>
          {isPending ? 'Saving...' : isEditing ? 'Save Changes' : 'Mark Complete'}
        </Button>
        {!isEditing && (
          <Button
            type="button"
            onClick={() => setIsSkipping(true)}
            variant="outline"
            disabled={isPending}
          >
            Skip Stage
          </Button>
        )}
        {isEditing && (
          <Button
            type="button"
            onClick={() => setIsEditing(false)}
            variant="outline"
            disabled={isPending}
          >
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}
