/**
 * AddComponentModal — Modal dialog for manually adding components
 *
 * Feature: 035 - AI Drawing Import
 * Task: T011
 *
 * Provides a type-adaptive form that shows different fields based on the
 * selected component type. Uses shadcn Dialog, Select, Input, Button, and Label.
 */

import { useState, useCallback, useMemo } from 'react'
import {
  COMPONENT_TYPE_LABELS,
  AGGREGATE_TYPES,
  UNIQUE_ID_TYPES,
  type ComponentType,
} from '@/types/drawing-table.types'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'

// ============================================================================
// Types
// ============================================================================

export interface CreateManualComponentData {
  component_type: ComponentType
  commodity_code?: string
  size?: string
  quantity?: number
  total_linear_feet?: number
  spool_id?: string
  weld_number?: string
  description?: string
}

export interface AddComponentModalProps {
  open: boolean
  onClose: () => void
  onSubmit: (data: CreateManualComponentData) => void
  isSubmitting: boolean
}

// ============================================================================
// Helpers
// ============================================================================

/** Types that show commodity_code + size + quantity */
function isStandardType(type: ComponentType): boolean {
  return !AGGREGATE_TYPES.includes(type) && !UNIQUE_ID_TYPES.includes(type)
}

/** Types that show commodity_code + size + total_linear_feet */
function isAggregateType(type: ComponentType): boolean {
  return AGGREGATE_TYPES.includes(type)
}

// ============================================================================
// Component
// ============================================================================

export function AddComponentModal({
  open,
  onClose,
  onSubmit,
  isSubmitting,
}: AddComponentModalProps) {
  const [selectedType, setSelectedType] = useState<ComponentType | ''>('')
  const [commodityCode, setCommodityCode] = useState('')
  const [size, setSize] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [totalLinearFeet, setTotalLinearFeet] = useState('')
  const [spoolId, setSpoolId] = useState('')
  const [weldNumber, setWeldNumber] = useState('')
  const [description, setDescription] = useState('')

  const resetForm = useCallback(() => {
    setSelectedType('')
    setCommodityCode('')
    setSize('')
    setQuantity('1')
    setTotalLinearFeet('')
    setSpoolId('')
    setWeldNumber('')
    setDescription('')
  }, [])

  const handleTypeChange = useCallback(
    (value: string) => {
      // Reset type-specific fields when type changes
      setCommodityCode('')
      setSize('')
      setQuantity('1')
      setTotalLinearFeet('')
      setSpoolId('')
      setWeldNumber('')
      setDescription('')
      setSelectedType(value as ComponentType)
    },
    []
  )

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen) {
        resetForm()
        onClose()
      }
    },
    [resetForm, onClose]
  )

  const handleCancel = useCallback(() => {
    resetForm()
    onClose()
  }, [resetForm, onClose])

  // Determine if required fields are filled
  const isValid = useMemo(() => {
    if (!selectedType) return false

    if (selectedType === 'spool') {
      return spoolId.trim().length > 0
    }
    if (selectedType === 'field_weld') {
      return weldNumber.trim().length > 0
    }
    if (isAggregateType(selectedType)) {
      return (
        commodityCode.trim().length > 0 &&
        size.trim().length > 0 &&
        totalLinearFeet.trim().length > 0 &&
        Number(totalLinearFeet) > 0
      )
    }
    // Standard types: commodity_code, size, quantity required
    return (
      commodityCode.trim().length > 0 &&
      size.trim().length > 0 &&
      quantity.trim().length > 0 &&
      Number(quantity) >= 1
    )
  }, [selectedType, commodityCode, size, quantity, totalLinearFeet, spoolId, weldNumber])

  const handleSubmit = useCallback(() => {
    if (!selectedType || !isValid) return

    const data: CreateManualComponentData = {
      component_type: selectedType,
    }

    if (selectedType === 'spool') {
      data.spool_id = spoolId.trim()
    } else if (selectedType === 'field_weld') {
      data.weld_number = weldNumber.trim()
    } else if (isAggregateType(selectedType)) {
      data.commodity_code = commodityCode.trim()
      data.size = size.trim()
      data.total_linear_feet = Number(totalLinearFeet)
    } else {
      // Standard types
      data.commodity_code = commodityCode.trim()
      data.size = size.trim()
      data.quantity = Number(quantity)
    }

    if (description.trim()) {
      data.description = description.trim()
    }

    onSubmit(data)
  }, [
    selectedType,
    isValid,
    commodityCode,
    size,
    quantity,
    totalLinearFeet,
    spoolId,
    weldNumber,
    description,
    onSubmit,
  ])

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Component</DialogTitle>
          <DialogDescription className="sr-only">
            Add a new component by selecting a type and filling in the required fields.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Component Type Selector */}
          <div className="space-y-2">
            <Label htmlFor="component-type">Component Type</Label>
            <Select value={selectedType} onValueChange={handleTypeChange}>
              <SelectTrigger id="component-type">
                <SelectValue placeholder="Select type..." />
              </SelectTrigger>
              <SelectContent>
                {(
                  Object.entries(COMPONENT_TYPE_LABELS) as Array<
                    [ComponentType, string]
                  >
                ).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Type-specific fields */}
          {selectedType && isStandardType(selectedType) && (
            <>
              <div className="space-y-2">
                <Label htmlFor="commodity-code">Commodity Code</Label>
                <Input
                  id="commodity-code"
                  value={commodityCode}
                  onChange={(e) => setCommodityCode(e.target.value)}
                  placeholder="e.g. VBALU"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="size">Size</Label>
                <Input
                  id="size"
                  value={size}
                  onChange={(e) => setSize(e.target.value)}
                  placeholder='e.g. 2"'
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="quantity">Quantity</Label>
                <Input
                  id="quantity"
                  type="number"
                  min={1}
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                />
              </div>
            </>
          )}

          {selectedType && isAggregateType(selectedType) && (
            <>
              <div className="space-y-2">
                <Label htmlFor="commodity-code">Commodity Code</Label>
                <Input
                  id="commodity-code"
                  value={commodityCode}
                  onChange={(e) => setCommodityCode(e.target.value)}
                  placeholder="e.g. CS"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="size">Size</Label>
                <Input
                  id="size"
                  value={size}
                  onChange={(e) => setSize(e.target.value)}
                  placeholder='e.g. 4"'
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="total-linear-feet">Total Linear Feet</Label>
                <Input
                  id="total-linear-feet"
                  type="number"
                  min={0}
                  value={totalLinearFeet}
                  onChange={(e) => setTotalLinearFeet(e.target.value)}
                  placeholder="e.g. 150"
                />
              </div>
            </>
          )}

          {selectedType === 'spool' && (
            <div className="space-y-2">
              <Label htmlFor="spool-id">Spool ID</Label>
              <Input
                id="spool-id"
                value={spoolId}
                onChange={(e) => setSpoolId(e.target.value)}
                placeholder="e.g. SP-001"
              />
            </div>
          )}

          {selectedType === 'field_weld' && (
            <div className="space-y-2">
              <Label htmlFor="weld-number">Weld Number</Label>
              <Input
                id="weld-number"
                value={weldNumber}
                onChange={(e) => setWeldNumber(e.target.value)}
                placeholder="e.g. FW-42"
              />
            </div>
          )}

          {/* Description — shown for all types after type is selected */}
          {selectedType && (
            <div className="space-y-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Input
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional description"
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={!isValid || isSubmitting}
            onClick={handleSubmit}
          >
            Create Component
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
