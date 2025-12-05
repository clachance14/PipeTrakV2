/**
 * DistributionResults component (Feature 032)
 * Displays results from manhour budget distribution RPC
 */

import { useState } from 'react';
import { CheckCircle, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { cn } from '@/lib/utils';

interface DistributionSummary {
  total_components: number;
  components_allocated: number;
  components_with_warnings: number;
  total_weight: number;
  total_allocated_mh: number;
}

interface Warning {
  component_id: string;
  component_type?: string;
  message: string;
  identity_key?: Record<string, unknown>;
}

interface DistributionResultsProps {
  summary: DistributionSummary;
  warnings: Warning[];
  onDismiss?: () => void;
}

const INITIAL_WARNING_DISPLAY_COUNT = 5;

export function DistributionResults({
  summary,
  warnings,
  onDismiss,
}: DistributionResultsProps) {
  const [showAllWarnings, setShowAllWarnings] = useState(false);

  const displayedWarnings = showAllWarnings
    ? warnings
    : warnings.slice(0, INITIAL_WARNING_DISPLAY_COUNT);

  const hasMoreWarnings = warnings.length > INITIAL_WARNING_DISPLAY_COUNT;

  // Format identity key into readable string based on component type
  const formatIdentityKey = (
    identityKey: Record<string, unknown> | undefined,
    componentType?: string
  ): string => {
    if (!identityKey) return componentType || 'Component';

    // Spool: show spool_id
    if (identityKey.spool_id) {
      return String(identityKey.spool_id);
    }

    // Field weld: show weld_number
    if (identityKey.weld_number) {
      return `Weld ${identityKey.weld_number}`;
    }

    // Threaded pipe with pipe_id (legacy format)
    if (identityKey.pipe_id) {
      return String(identityKey.pipe_id);
    }

    // Standard components with drawing_norm, commodity_code, size, seq
    const parts: string[] = [];
    if (identityKey.drawing_norm) parts.push(String(identityKey.drawing_norm));
    if (identityKey.commodity_code) parts.push(String(identityKey.commodity_code));
    if (identityKey.size) parts.push(`${identityKey.size}"`);
    if (identityKey.seq !== undefined) parts.push(`#${identityKey.seq}`);

    if (parts.length > 0) {
      return parts.join(' / ');
    }

    // Fallback: show component type if available
    return componentType || 'Component';
  };

  return (
    <div className="space-y-4">
      {/* Success Header */}
      <Card className="border-green-200 bg-green-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-800">
            <CheckCircle className="h-5 w-5" />
            Budget Distribution Complete
          </CardTitle>
        </CardHeader>
      </Card>

      {/* Summary Stats Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Components Processed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.total_components}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Manhours Allocated
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {summary.total_allocated_mh.toFixed(2)} MH
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Components with Warnings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className={cn(
                'text-2xl font-bold',
                summary.components_with_warnings > 0 ? 'text-yellow-600' : 'text-green-600'
              )}
            >
              {summary.components_with_warnings}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Warnings Section */}
      {warnings.length > 0 && (
        <Alert variant="default" className="border-yellow-300 bg-yellow-50">
          <AlertTriangle className="h-4 w-4 text-yellow-600" />
          <AlertTitle className="text-yellow-800">
            {warnings.length} Warning{warnings.length !== 1 ? 's' : ''}
          </AlertTitle>
          <AlertDescription className="mt-2 space-y-2">
            <p className="text-sm text-yellow-700">
              Some components could not be allocated manhours. Review the warnings below:
            </p>

            {/* Warning List */}
            <div className="mt-3 space-y-2">
              {displayedWarnings.map((warning, index) => (
                <div
                  key={`${warning.component_id}-${index}`}
                  className="rounded-md bg-white p-3 text-sm"
                >
                  <div className="font-medium text-gray-900">
                    {formatIdentityKey(warning.identity_key, warning.component_type)}
                  </div>
                  <div className="mt-1 text-gray-600">{warning.message}</div>
                </div>
              ))}
            </div>

            {/* Show More/Less Button */}
            {hasMoreWarnings && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAllWarnings(!showAllWarnings)}
                className="mt-3 w-full sm:w-auto"
              >
                {showAllWarnings ? (
                  <>
                    <ChevronUp className="h-4 w-4" />
                    Show Less
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-4 w-4" />
                    Show {warnings.length - INITIAL_WARNING_DISPLAY_COUNT} More
                  </>
                )}
              </Button>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Dismiss Button */}
      {onDismiss && (
        <div className="flex justify-end">
          <Button onClick={onDismiss} variant="outline">
            Dismiss
          </Button>
        </div>
      )}
    </div>
  );
}
