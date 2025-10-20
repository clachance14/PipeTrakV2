import { describe, it, expect } from 'vitest'
import { validateMilestoneUpdate } from './validateMilestoneUpdate'
import type { MilestoneUpdatePayload, ProgressTemplate } from '@/types/drawing-table.types'

describe('validateMilestoneUpdate', () => {
  // Helper: Create a mock progress template
  const createMockTemplate = (overrides?: Partial<ProgressTemplate>): ProgressTemplate => ({
    id: 'template-uuid',
    component_type: 'valve',
    version: 1,
    workflow_type: 'discrete',
    milestones_config: [
      { name: 'Receive', weight: 10, order: 1, is_partial: false, requires_welder: false },
      { name: 'Install', weight: 60, order: 2, is_partial: false, requires_welder: true },
      { name: 'Punch', weight: 10, order: 3, is_partial: false, requires_welder: false },
      { name: 'Test', weight: 15, order: 4, is_partial: false, requires_welder: false },
      { name: 'Restore', weight: 5, order: 5, is_partial: false, requires_welder: false },
    ],
    ...overrides,
  })

  const createHybridTemplate = (): ProgressTemplate => ({
    id: 'template-uuid',
    component_type: 'threaded_pipe',
    version: 1,
    workflow_type: 'hybrid',
    milestones_config: [
      { name: 'Receive', weight: 10, order: 1, is_partial: false, requires_welder: false },
      { name: 'Fabricate', weight: 10, order: 2, is_partial: true, requires_welder: false },
      { name: 'Install', weight: 15, order: 3, is_partial: true, requires_welder: false },
      { name: 'Erect', weight: 10, order: 4, is_partial: true, requires_welder: false },
      { name: 'Connect', weight: 10, order: 5, is_partial: true, requires_welder: false },
      { name: 'Support', weight: 15, order: 6, is_partial: true, requires_welder: false },
      { name: 'Punch', weight: 10, order: 7, is_partial: false, requires_welder: false },
      { name: 'Test', weight: 15, order: 8, is_partial: false, requires_welder: false },
      { name: 'Restore', weight: 5, order: 9, is_partial: false, requires_welder: false },
    ],
  })

  describe('Valid updates', () => {
    it('validates discrete milestone with boolean true', () => {
      const template = createMockTemplate()
      const payload: MilestoneUpdatePayload = {
        component_id: 'comp-uuid',
        milestone_name: 'Receive',
        value: true,
        user_id: 'user-uuid',
      }

      const result = validateMilestoneUpdate(payload, template)

      expect(result).toEqual({ valid: true })
    })

    it('validates discrete milestone with boolean false', () => {
      const template = createMockTemplate()
      const payload: MilestoneUpdatePayload = {
        component_id: 'comp-uuid',
        milestone_name: 'Install',
        value: false,
        user_id: 'user-uuid',
      }

      const result = validateMilestoneUpdate(payload, template)

      expect(result).toEqual({ valid: true })
    })

    it('validates partial milestone with value 0', () => {
      const template = createHybridTemplate()
      const payload: MilestoneUpdatePayload = {
        component_id: 'comp-uuid',
        milestone_name: 'Fabricate',
        value: 0,
        user_id: 'user-uuid',
      }

      const result = validateMilestoneUpdate(payload, template)

      expect(result).toEqual({ valid: true })
    })

    it('validates partial milestone with value 100', () => {
      const template = createHybridTemplate()
      const payload: MilestoneUpdatePayload = {
        component_id: 'comp-uuid',
        milestone_name: 'Fabricate',
        value: 100,
        user_id: 'user-uuid',
      }

      const result = validateMilestoneUpdate(payload, template)

      expect(result).toEqual({ valid: true })
    })

    it('validates partial milestone with value 50', () => {
      const template = createHybridTemplate()
      const payload: MilestoneUpdatePayload = {
        component_id: 'comp-uuid',
        milestone_name: 'Install',
        value: 50,
        user_id: 'user-uuid',
      }

      const result = validateMilestoneUpdate(payload, template)

      expect(result).toEqual({ valid: true })
    })

    it('validates partial milestone with decimal value 75.5', () => {
      const template = createHybridTemplate()
      const payload: MilestoneUpdatePayload = {
        component_id: 'comp-uuid',
        milestone_name: 'Connect',
        value: 75.5,
        user_id: 'user-uuid',
      }

      const result = validateMilestoneUpdate(payload, template)

      expect(result).toEqual({ valid: true })
    })
  })

  describe('Invalid partial milestone values', () => {
    it('rejects partial milestone with value > 100', () => {
      const template = createHybridTemplate()
      const payload: MilestoneUpdatePayload = {
        component_id: 'comp-uuid',
        milestone_name: 'Fabricate',
        value: 150,
        user_id: 'user-uuid',
      }

      const result = validateMilestoneUpdate(payload, template)

      expect(result.valid).toBe(false)
      if (!result.valid) {
        expect(result.error).toContain('0-100')
        expect(result.error).toContain('Fabricate')
      }
    })

    it('rejects partial milestone with negative value', () => {
      const template = createHybridTemplate()
      const payload: MilestoneUpdatePayload = {
        component_id: 'comp-uuid',
        milestone_name: 'Install',
        value: -10,
        user_id: 'user-uuid',
      }

      const result = validateMilestoneUpdate(payload, template)

      expect(result.valid).toBe(false)
      if (!result.valid) {
        expect(result.error).toContain('0-100')
      }
    })

    it('rejects partial milestone with value 999', () => {
      const template = createHybridTemplate()
      const payload: MilestoneUpdatePayload = {
        component_id: 'comp-uuid',
        milestone_name: 'Support',
        value: 999,
        user_id: 'user-uuid',
      }

      const result = validateMilestoneUpdate(payload, template)

      expect(result.valid).toBe(false)
      if (!result.valid) {
        expect(result.error).toContain('0-100')
        expect(result.error).toContain('Support')
      }
    })
  })

  describe('Invalid type mismatches', () => {
    it('rejects number value for discrete milestone', () => {
      const template = createMockTemplate()
      const payload: MilestoneUpdatePayload = {
        component_id: 'comp-uuid',
        milestone_name: 'Receive',
        value: 50, // Should be boolean
        user_id: 'user-uuid',
      }

      const result = validateMilestoneUpdate(payload, template)

      expect(result.valid).toBe(false)
      if (!result.valid) {
        expect(result.error).toContain('boolean')
        expect(result.error).toContain('Receive')
      }
    })

    it('rejects boolean value for partial milestone', () => {
      const template = createHybridTemplate()
      const payload: MilestoneUpdatePayload = {
        component_id: 'comp-uuid',
        milestone_name: 'Fabricate',
        value: true, // Should be number
        user_id: 'user-uuid',
      }

      const result = validateMilestoneUpdate(payload, template)

      expect(result.valid).toBe(false)
      if (!result.valid) {
        expect(result.error).toContain('number')
        expect(result.error).toContain('Fabricate')
      }
    })

    it('rejects string value for discrete milestone', () => {
      const template = createMockTemplate()
      const payload = {
        component_id: 'comp-uuid',
        milestone_name: 'Install',
        value: 'true', // Should be boolean
        user_id: 'user-uuid',
      } as unknown as MilestoneUpdatePayload

      const result = validateMilestoneUpdate(payload, template)

      expect(result.valid).toBe(false)
      if (!result.valid) {
        expect(result.error).toContain('boolean')
      }
    })
  })

  describe('Milestone not in template', () => {
    it('rejects milestone name that does not exist in template', () => {
      const template = createMockTemplate()
      const payload: MilestoneUpdatePayload = {
        component_id: 'comp-uuid',
        milestone_name: 'NonexistentMilestone',
        value: true,
        user_id: 'user-uuid',
      }

      const result = validateMilestoneUpdate(payload, template)

      expect(result.valid).toBe(false)
      if (!result.valid) {
        expect(result.error).toContain('NonexistentMilestone')
        expect(result.error).toContain('not found')
      }
    })

    it('rejects empty milestone name', () => {
      const template = createMockTemplate()
      const payload: MilestoneUpdatePayload = {
        component_id: 'comp-uuid',
        milestone_name: '',
        value: true,
        user_id: 'user-uuid',
      }

      const result = validateMilestoneUpdate(payload, template)

      expect(result.valid).toBe(false)
      if (!result.valid) {
        expect(result.error).toBe('Milestone name cannot be empty')
      }
    })

    it('is case-sensitive for milestone names', () => {
      const template = createMockTemplate()
      const payload: MilestoneUpdatePayload = {
        component_id: 'comp-uuid',
        milestone_name: 'receive', // Lowercase, should be "Receive"
        value: true,
        user_id: 'user-uuid',
      }

      const result = validateMilestoneUpdate(payload, template)

      expect(result.valid).toBe(false)
      if (!result.valid) {
        expect(result.error).toContain('receive')
        expect(result.error).toContain('not found')
      }
    })
  })

  describe('Edge cases', () => {
    it('handles template with no milestones', () => {
      const template: ProgressTemplate = {
        id: 'template-uuid',
        component_type: 'misc_component',
        version: 1,
        workflow_type: 'discrete',
        milestones_config: [],
      }
      const payload: MilestoneUpdatePayload = {
        component_id: 'comp-uuid',
        milestone_name: 'Receive',
        value: true,
        user_id: 'user-uuid',
      }

      const result = validateMilestoneUpdate(payload, template)

      expect(result.valid).toBe(false)
      if (!result.valid) {
        expect(result.error).toContain('not found')
      }
    })

    it('validates multiple milestones in same template', () => {
      const template = createMockTemplate()

      const payload1: MilestoneUpdatePayload = {
        component_id: 'comp-uuid',
        milestone_name: 'Receive',
        value: true,
        user_id: 'user-uuid',
      }

      const payload2: MilestoneUpdatePayload = {
        component_id: 'comp-uuid',
        milestone_name: 'Install',
        value: false,
        user_id: 'user-uuid',
      }

      expect(validateMilestoneUpdate(payload1, template)).toEqual({ valid: true })
      expect(validateMilestoneUpdate(payload2, template)).toEqual({ valid: true })
    })

    it('handles NaN value for partial milestone', () => {
      const template = createHybridTemplate()
      const payload: MilestoneUpdatePayload = {
        component_id: 'comp-uuid',
        milestone_name: 'Fabricate',
        value: NaN,
        user_id: 'user-uuid',
      }

      const result = validateMilestoneUpdate(payload, template)

      expect(result.valid).toBe(false)
      if (!result.valid) {
        expect(result.error).toContain('0-100')
      }
    })

    it('handles Infinity value for partial milestone', () => {
      const template = createHybridTemplate()
      const payload: MilestoneUpdatePayload = {
        component_id: 'comp-uuid',
        milestone_name: 'Fabricate',
        value: Infinity,
        user_id: 'user-uuid',
      }

      const result = validateMilestoneUpdate(payload, template)

      expect(result.valid).toBe(false)
      if (!result.valid) {
        expect(result.error).toContain('0-100')
      }
    })
  })
})
