/**
 * Stage Data Display Component
 *
 * Renders stage_data JSONB in a user-friendly, structured format.
 * Replaces raw JSON dump with proper labels, formatting, and icons.
 *
 * Feature 030 - Test Package Lifecycle Workflow
 */

import { Check, X } from 'lucide-react';
import type { StageData } from '@/types/workflow.types';

// ============================================================================
// TYPE GUARDS
// ============================================================================

function isPreHydroData(data: StageData): data is Extract<StageData, { stage: 'pre_hydro' }> {
  return data.stage === 'pre_hydro';
}

function isTestAcceptanceData(data: StageData): data is Extract<StageData, { stage: 'test_acceptance' }> {
  return data.stage === 'test_acceptance';
}

function isDrainFlushData(data: StageData): data is Extract<StageData, { stage: 'drain_flush' }> {
  return data.stage === 'drain_flush';
}

function isPostHydroData(data: StageData): data is Extract<StageData, { stage: 'post_hydro' }> {
  return data.stage === 'post_hydro';
}

function isProtectiveCoatingsData(data: StageData): data is Extract<StageData, { stage: 'protective_coatings' }> {
  return data.stage === 'protective_coatings';
}

function isInsulationData(data: StageData): data is Extract<StageData, { stage: 'insulation' }> {
  return data.stage === 'insulation';
}

function isFinalAcceptanceData(data: StageData): data is Extract<StageData, { stage: 'final_acceptance' }> {
  return data.stage === 'final_acceptance';
}

// ============================================================================
// UTILITY COMPONENTS
// ============================================================================

function DataField({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <span className="text-sm font-medium text-gray-700 min-w-[140px]">{label}:</span>
      <span className="text-sm text-gray-900">{value}</span>
    </div>
  );
}

function BooleanIndicator({ value }: { value: boolean }) {
  return value ? (
    <span className="inline-flex items-center gap-1 text-green-700">
      <Check className="h-4 w-4" />
      <span>Yes</span>
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-gray-500">
      <X className="h-4 w-4" />
      <span>No</span>
    </span>
  );
}

function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return dateString;
  }
}

// ============================================================================
// STAGE-SPECIFIC DISPLAY COMPONENTS
// ============================================================================

function PreHydroDisplay({ data }: { data: Extract<StageData, { stage: 'pre_hydro' }> }) {
  return (
    <div className="space-y-2">
      <DataField label="Inspector" value={data.inspector} />
      <DataField label="NDE Complete" value={<BooleanIndicator value={data.nde_complete} />} />
    </div>
  );
}

function TestAcceptanceDisplay({ data }: { data: Extract<StageData, { stage: 'test_acceptance' }> }) {
  return (
    <div className="space-y-2">
      <DataField
        label="Gauge Numbers"
        value={
          <ul className="list-disc list-inside space-y-1">
            {data.gauge_numbers.map((gauge, idx) => (
              <li key={idx} className="text-sm">
                {gauge}
              </li>
            ))}
          </ul>
        }
      />
      <DataField
        label="Calibration Dates"
        value={
          <ul className="list-disc list-inside space-y-1">
            {data.calibration_dates.map((date, idx) => (
              <li key={idx} className="text-sm">
                {formatDate(date)}
              </li>
            ))}
          </ul>
        }
      />
      <DataField label="Time Held" value={`${data.time_held} minutes`} />
    </div>
  );
}

function DrainFlushDisplay({ data }: { data: Extract<StageData, { stage: 'drain_flush' }> }) {
  return (
    <div className="space-y-2">
      <DataField label="Drain Date" value={formatDate(data.drain_date)} />
      <DataField label="Flush Date" value={formatDate(data.flush_date)} />
    </div>
  );
}

function PostHydroDisplay({ data }: { data: Extract<StageData, { stage: 'post_hydro' }> }) {
  return (
    <div className="space-y-2">
      <DataField label="Inspection Date" value={formatDate(data.inspection_date)} />
      <DataField label="Defects Found" value={<BooleanIndicator value={data.defects_found} />} />
      {data.defects_found && data.defect_description && (
        <DataField label="Defect Description" value={data.defect_description} />
      )}
    </div>
  );
}

function ProtectiveCoatingsDisplay({
  data,
}: {
  data: Extract<StageData, { stage: 'protective_coatings' }>;
}) {
  return (
    <div className="space-y-2">
      <DataField label="Coating Type" value={data.coating_type} />
      <DataField label="Client Paint Spec" value={data.client_paint_spec} />
    </div>
  );
}

function InsulationDisplay({ data }: { data: Extract<StageData, { stage: 'insulation' }> }) {
  return (
    <div className="space-y-2">
      <DataField label="Insulation Type" value={data.insulation_type} />
      <DataField label="Insulation Spec" value={data.insulation_spec} />
    </div>
  );
}

function FinalAcceptanceDisplay({
  data,
}: {
  data: Extract<StageData, { stage: 'final_acceptance' }>;
}) {
  return (
    <div className="space-y-2">
      <DataField
        label="Final Notes"
        value={
          <p className="text-sm text-gray-900 whitespace-pre-wrap max-w-prose">
            {data.final_notes}
          </p>
        }
      />
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

interface StageDataDisplayProps {
  stageData: StageData;
}

export function StageDataDisplay({ stageData }: StageDataDisplayProps) {
  if (!stageData) {
    return null;
  }

  return (
    <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
      <h4 className="text-sm font-medium text-gray-900 mb-3">Stage Data</h4>
      <div className="space-y-3">
        {isPreHydroData(stageData) && <PreHydroDisplay data={stageData} />}
        {isTestAcceptanceData(stageData) && <TestAcceptanceDisplay data={stageData} />}
        {isDrainFlushData(stageData) && <DrainFlushDisplay data={stageData} />}
        {isPostHydroData(stageData) && <PostHydroDisplay data={stageData} />}
        {isProtectiveCoatingsData(stageData) && <ProtectiveCoatingsDisplay data={stageData} />}
        {isInsulationData(stageData) && <InsulationDisplay data={stageData} />}
        {isFinalAcceptanceData(stageData) && <FinalAcceptanceDisplay data={stageData} />}
      </div>
    </div>
  );
}
