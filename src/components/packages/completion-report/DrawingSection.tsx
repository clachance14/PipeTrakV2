/**
 * DrawingSection Component (Package Completion Report)
 * Feature 030: Test Package Workflow - Expandable drawing section
 *
 * Displays drawing header with component stats and expandable content
 * showing component summary, weld log, and NDE summary.
 */

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { WeldLogTable } from './WeldLogTable';
import type { DrawingGroup } from '@/types/packageReport';

interface DrawingSectionProps {
  drawingGroup: DrawingGroup;
}

/**
 * Pluralize helper
 */
function pluralize(count: number, singular: string, plural?: string): string {
  if (count === 1) return singular;
  return plural || `${singular}s`;
}

export function DrawingSection({ drawingGroup }: DrawingSectionProps) {
  const {
    drawing_id,
    drawing_no_norm,
    component_count,
    unique_supports_count,
    weld_log,
    nde_summary,
  } = drawingGroup;

  return (
    <Accordion type="single" collapsible className="w-full">
      <AccordionItem value={drawing_id}>
        <AccordionTrigger className="hover:no-underline">
          <div className="flex w-full items-center justify-between pr-4 text-left">
            <div>
              <span className="text-base font-semibold text-slate-900">
                {drawing_no_norm}
              </span>
              <span className="ml-3 text-sm text-slate-600">
                {component_count} {pluralize(component_count, 'component')},{' '}
                {unique_supports_count}{' '}
                {pluralize(unique_supports_count, 'unique support')}
              </span>
            </div>
          </div>
        </AccordionTrigger>

        <AccordionContent className="space-y-6 pt-4">
          {/* Component Summary */}
          <div>
            <h4 className="mb-2 text-sm font-semibold text-slate-900">
              Component Summary
            </h4>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-slate-700">Total:</span>{' '}
                  <span className="text-slate-900">{component_count}</span>
                </div>
                <div>
                  <span className="font-medium text-slate-700">
                    Unique Supports:
                  </span>{' '}
                  <span className="text-slate-900">{unique_supports_count}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Weld Log */}
          <div>
            <h4 className="mb-2 text-sm font-semibold text-slate-900">
              Weld Log
            </h4>
            <WeldLogTable welds={weld_log} />
          </div>

          {/* NDE Summary */}
          <div>
            <h4 className="mb-2 text-sm font-semibold text-slate-900">
              NDE Summary
            </h4>
            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <div className="grid grid-cols-2 gap-3 text-sm md:grid-cols-5">
                <div>
                  <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Total Welds
                  </div>
                  <div className="mt-1 text-lg font-semibold text-slate-900">
                    {nde_summary.total_welds}
                  </div>
                </div>
                <div>
                  <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    NDE Required
                  </div>
                  <div className="mt-1 text-lg font-semibold text-slate-900">
                    {nde_summary.nde_required_count}
                  </div>
                </div>
                <div>
                  <div className="text-xs font-medium uppercase tracking-wide text-green-600">
                    Passed
                  </div>
                  <div className="mt-1 text-lg font-semibold text-green-700">
                    {nde_summary.nde_pass_count}
                  </div>
                </div>
                <div>
                  <div className="text-xs font-medium uppercase tracking-wide text-red-600">
                    Failed
                  </div>
                  <div className="mt-1 text-lg font-semibold text-red-700">
                    {nde_summary.nde_fail_count}
                  </div>
                </div>
                <div>
                  <div className="text-xs font-medium uppercase tracking-wide text-yellow-600">
                    Pending
                  </div>
                  <div className="mt-1 text-lg font-semibold text-yellow-700">
                    {nde_summary.nde_pending_count}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
