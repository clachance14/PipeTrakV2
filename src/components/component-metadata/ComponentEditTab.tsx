/**
 * ComponentEditTab — Edit tab for ComponentMetadataModal
 *
 * Feature: 035 - AI Drawing Import
 * Task: T009
 *
 * Allows privileged users to reclassify components, edit identity/attributes,
 * and delete components. Uses react-hook-form for form state.
 */

import { useForm, Controller } from 'react-hook-form'
import { useMemo } from 'react'
import {
  COMPONENT_TYPE_LABELS,
  AGGREGATE_TYPES,
  UNIQUE_ID_TYPES,
  type ComponentType,
} from '@/types/drawing-table.types'
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

// ============================================================================
// Types
// ============================================================================

export interface ComponentEditChanges {
  newType?: ComponentType
  identityChanges: Record<string, unknown>
  attributeChanges: Record<string, unknown>
}

export interface ComponentEditTabProps {
  component: {
    id: string
    component_type: ComponentType
    identity_key: Record<string, unknown>
    attributes: Record<string, unknown> | null
    percent_complete: number
  }
  siblingCount: number
  hasProgress: boolean
  onSave: (changes: ComponentEditChanges) => void
  onDelete: () => void
  onCancel: () => void
  isSaving: boolean
}

// ============================================================================
// Form value types
// ============================================================================

interface FormValues {
  component_type: ComponentType
  // Identity fields
  commodity_code: string
  size: string
  spool_id: string
  weld_number: string
  pipe_id: string
  // Attribute fields
  description: string
  item_number: string
  quantity: string
  total_linear_feet: string
}

// ============================================================================
// Helpers
// ============================================================================

function getIdentityFields(type: ComponentType): Array<'commodity_code' | 'size' | 'spool_id' | 'weld_number' | 'pipe_id'> {
  if (type === 'spool') return ['spool_id']
  if (type === 'field_weld') return ['weld_number']
  if (AGGREGATE_TYPES.includes(type)) return ['pipe_id']
  return ['commodity_code', 'size']
}

function isExplodedType(type: ComponentType): boolean {
  return !AGGREGATE_TYPES.includes(type) && !UNIQUE_ID_TYPES.includes(type)
}

const IDENTITY_FIELD_LABELS: Record<string, string> = {
  commodity_code: 'Commodity Code',
  size: 'Size',
  spool_id: 'Spool ID',
  weld_number: 'Weld Number',
  pipe_id: 'Pipe ID',
}

// ============================================================================
// Component
// ============================================================================

export function ComponentEditTab({
  component,
  siblingCount,
  hasProgress,
  onSave,
  onDelete,
  onCancel,
  isSaving,
}: ComponentEditTabProps) {
  const attrs = component.attributes ?? {}
  const ik = component.identity_key

  const defaultValues: FormValues = useMemo(
    () => ({
      component_type: component.component_type,
      commodity_code: String(ik.commodity_code ?? ''),
      size: String(ik.size ?? ''),
      spool_id: String(ik.spool_id ?? ''),
      weld_number: String(ik.weld_number ?? ''),
      pipe_id: String(ik.pipe_id ?? ''),
      description: String(attrs.description ?? ''),
      item_number: String(attrs.item_number ?? ''),
      quantity: attrs.quantity != null ? String(attrs.quantity) : attrs.original_qty != null ? String(attrs.original_qty) : '',
      total_linear_feet: attrs.total_linear_feet != null ? String(attrs.total_linear_feet) : '',
    }),
    // Only compute once on mount — we don't want form to reset on re-render
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  )

  const { register, control, handleSubmit, watch } = useForm<FormValues>({
    defaultValues,
  })

  const watchedType = watch('component_type')
  const identityFields = getIdentityFields(watchedType)

  // Determine if form has changes
  const watchAll = watch()
  const hasChanges = useMemo(() => {
    if (watchAll.component_type !== defaultValues.component_type) return true

    // Check identity fields
    for (const field of getIdentityFields(defaultValues.component_type)) {
      if (String(watchAll[field] ?? '') !== String(defaultValues[field] ?? '')) return true
    }

    // Check attribute fields
    if (watchAll.description !== defaultValues.description) return true
    if (watchAll.item_number !== defaultValues.item_number) return true
    if (isExplodedType(defaultValues.component_type)) {
      if (watchAll.quantity !== defaultValues.quantity) return true
    }
    if (AGGREGATE_TYPES.includes(defaultValues.component_type)) {
      if (watchAll.total_linear_feet !== defaultValues.total_linear_feet) return true
    }

    return false
  }, [watchAll, defaultValues])

  const onSubmit = (data: FormValues) => {
    const changes: ComponentEditChanges = {
      identityChanges: {},
      attributeChanges: {},
    }

    // Check type change
    if (data.component_type !== defaultValues.component_type) {
      changes.newType = data.component_type
    }

    // Compute identity changes (only changed keys)
    for (const field of getIdentityFields(defaultValues.component_type)) {
      const newVal = String(data[field] ?? '')
      const oldVal = String(defaultValues[field] ?? '')
      if (newVal !== oldVal) {
        changes.identityChanges[field] = newVal
      }
    }

    // Compute attribute changes (only changed keys)
    if (data.description !== defaultValues.description) {
      changes.attributeChanges.description = data.description
    }
    if (data.item_number !== defaultValues.item_number) {
      changes.attributeChanges.item_number = data.item_number
    }
    if (isExplodedType(defaultValues.component_type)) {
      if (data.quantity !== defaultValues.quantity) {
        changes.attributeChanges.quantity = data.quantity === '' ? null : Number(data.quantity)
      }
    }
    if (AGGREGATE_TYPES.includes(defaultValues.component_type)) {
      if (data.total_linear_feet !== defaultValues.total_linear_feet) {
        changes.attributeChanges.total_linear_feet =
          data.total_linear_feet === '' ? null : Number(data.total_linear_feet)
      }
    }

    onSave(changes)
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Section 1: Classification */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium">Classification</h3>
          {hasProgress ? (
            <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">
              Locked — has progress
            </Badge>
          ) : (
            <Badge className="bg-green-100 text-green-800 border-green-300">
              Editable
            </Badge>
          )}
        </div>

        <Controller
          name="component_type"
          control={control}
          render={({ field }) => (
            <Select
              value={field.value}
              onValueChange={field.onChange}
              disabled={hasProgress}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.entries(COMPONENT_TYPE_LABELS) as Array<[ComponentType, string]>).map(
                  ([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  )
                )}
              </SelectContent>
            </Select>
          )}
        />
      </div>

      {/* Section 2: Identity */}
      <div className="space-y-2">
        <h3 className="text-sm font-medium">Identity</h3>
        {identityFields.map((field) => (
          <div key={field}>
            <label htmlFor={`identity-${field}`} className="text-sm text-muted-foreground">
              {IDENTITY_FIELD_LABELS[field]}
            </label>
            <Input
              id={`identity-${field}`}
              {...register(field)}
            />
          </div>
        ))}
      </div>

      {/* Section 3: Attributes */}
      <div className="space-y-2">
        <h3 className="text-sm font-medium">Attributes</h3>

        <div>
          <label htmlFor="attr-description" className="text-sm text-muted-foreground">
            Description
          </label>
          <Input id="attr-description" {...register('description')} />
        </div>

        <div>
          <label htmlFor="attr-item-number" className="text-sm text-muted-foreground">
            Item Number
          </label>
          <Input id="attr-item-number" {...register('item_number')} />
        </div>

        {isExplodedType(watchedType) && (
          <div>
            <label htmlFor="attr-quantity" className="text-sm text-muted-foreground">
              Quantity
            </label>
            <Input
              id="attr-quantity"
              type="number"
              {...register('quantity')}
            />
          </div>
        )}

        {AGGREGATE_TYPES.includes(watchedType) && (
          <div>
            <label htmlFor="attr-total-lf" className="text-sm text-muted-foreground">
              Total Linear Feet
            </label>
            <Input
              id="attr-total-lf"
              type="number"
              {...register('total_linear_feet')}
            />
          </div>
        )}
      </div>

      {/* Section 4: Sibling count */}
      {siblingCount > 1 && (
        <p className="text-sm text-muted-foreground">
          Editing {siblingCount} components
        </p>
      )}

      {/* Actions footer */}
      <div className="flex items-center justify-between pt-4 border-t">
        <Button
          type="button"
          variant="destructive"
          onClick={onDelete}
        >
          Delete Component
        </Button>

        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isSaving || !hasChanges}
          >
            Save Changes
          </Button>
        </div>
      </div>
    </form>
  )
}
