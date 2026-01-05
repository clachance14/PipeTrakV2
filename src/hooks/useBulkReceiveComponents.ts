import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useUpdateMilestone } from '@/hooks/useUpdateMilestone'
import type { ComponentRow } from '@/types/drawing-table.types'

/**
 * Input for bulk receive operation
 */
export interface BulkReceiveInput {
  /** Array of component IDs to receive */
  componentIds: string[]
  /** User ID performing the operation */
  userId: string
}

/**
 * Result summary from bulk receive operation
 */
export interface BulkReceiveResult {
  /** Total number of components attempted to update */
  attempted: number
  /** Number of components successfully updated */
  updated: number
  /** Number of components skipped (already received) */
  skipped: number
  /** Number of components that failed to update */
  failed: number
  /** Map of component ID to error message for failed updates */
  errors?: Record<string, string>
}

/**
 * Return type for useBulkReceiveComponents hook
 */
export interface UseBulkReceiveReturn {
  /** Execute bulk receive operation */
  bulkReceive: (input: BulkReceiveInput) => Promise<BulkReceiveResult>
  /** True while processing bulk operation */
  isProcessing: boolean
  /** Last operation result (for displaying summary) */
  lastResult: BulkReceiveResult | null
  /** Reset the last result */
  resetResult: () => void
}

/**
 * Hook for bulk receiving components with throttled parallel execution
 *
 * Features:
 * - Filters out already-received components (Receive >= 100)
 * - Executes updates with 5 concurrent max
 * - Returns detailed summary with errors
 * - Tracks processing state
 * - Stores last result for summary display
 *
 * @returns UseBulkReceiveReturn with bulkReceive function and state
 *
 * @example
 * ```tsx
 * const { bulkReceive, isProcessing, lastResult, resetResult } = useBulkReceiveComponents()
 *
 * const handleBulkReceive = async () => {
 *   const result = await bulkReceive({
 *     componentIds: ['id1', 'id2', 'id3'],
 *     userId: user.id
 *   })
 *
 *   if (result.failed > 0) {
 *     console.error('Some components failed:', result.errors)
 *   }
 * }
 * ```
 */
export function useBulkReceiveComponents(): UseBulkReceiveReturn {
  const updateMilestone = useUpdateMilestone()
  const queryClient = useQueryClient()
  const [isProcessing, setIsProcessing] = useState(false)
  const [lastResult, setLastResult] = useState<BulkReceiveResult | null>(null)

  const bulkReceive = async (input: BulkReceiveInput): Promise<BulkReceiveResult> => {
    setIsProcessing(true)

    const result: BulkReceiveResult = {
      attempted: 0,
      updated: 0,
      skipped: 0,
      failed: 0,
      errors: {},
    }

    try {
      // Get component data from query cache
      const allQueries = queryClient.getQueriesData<ComponentRow[]>({ queryKey: ['components'] })
      const components = allQueries.flatMap(([_, data]) => data ?? [])

      // Filter to only selected components that need receiving
      // Skip components where Receive milestone is already >= 100
      const toUpdate = components.filter((c) => {
        if (!input.componentIds.includes(c.id)) return false

        const receiveMilestone = c.current_milestones?.Receive

        // Skip if already received (value >= 100)
        if (receiveMilestone !== undefined && receiveMilestone !== null) {
          const numericValue = typeof receiveMilestone === 'boolean'
            ? (receiveMilestone ? 100 : 0)
            : Number(receiveMilestone)

          if (numericValue >= 100) return false
        }

        return true
      })

      result.skipped = input.componentIds.length - toUpdate.length
      result.attempted = toUpdate.length

      // Implement throttled parallel execution (5 concurrent max)
      const concurrency = 5
      for (let i = 0; i < toUpdate.length; i += concurrency) {
        const batch = toUpdate.slice(i, i + concurrency)

        const results = await Promise.allSettled(
          batch.map((c) =>
            updateMilestone.mutateAsync({
              component_id: c.id,
              milestone_name: 'Receive',
              value: 100,
              user_id: input.userId,
            })
          )
        )

        // Process batch results
        results.forEach((r, idx) => {
          if (r.status === 'fulfilled') {
            result.updated++
          } else {
            result.failed++
            const componentId = batch[idx]?.id
            if (componentId && result.errors) {
              result.errors[componentId] = r.reason?.message || 'Unknown error'
            }
          }
        })
      }

      setLastResult(result)
      return result
    } finally {
      setIsProcessing(false)
    }
  }

  const resetResult = () => {
    setLastResult(null)
  }

  return {
    bulkReceive,
    isProcessing,
    lastResult,
    resetResult,
  }
}
