import { describe, it, expect } from 'vitest'
import { areaFormSchema } from './area.schema'
import { systemFormSchema } from './system.schema'
import { testPackageFormSchema } from './testPackage.schema'

describe('Area Schema Validation', () => {
  describe('areaFormSchema', () => {
    it('validates valid area data', () => {
      const validData = {
        name: 'Area 100',
        description: 'Process equipment zone'
      }

      const result = areaFormSchema.safeParse(validData)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.name).toBe('Area 100')
        expect(result.data.description).toBe('Process equipment zone')
      }
    })

    it('validates area with null description', () => {
      const validData = {
        name: 'Area 100',
        description: null
      }

      const result = areaFormSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('validates area with missing description', () => {
      const validData = {
        name: 'Area 100'
      }

      const result = areaFormSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('trims whitespace from name', () => {
      const dataWithWhitespace = {
        name: '  Area 100  ',
        description: 'Test'
      }

      const result = areaFormSchema.safeParse(dataWithWhitespace)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.name).toBe('Area 100')
      }
    })

    it('rejects empty name', () => {
      const invalidData = {
        name: '',
        description: 'Test'
      }

      const result = areaFormSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('Area name is required')
      }
    })

    it('rejects name longer than 50 characters', () => {
      const invalidData = {
        name: 'A'.repeat(51),
        description: 'Test'
      }

      const result = areaFormSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('50 characters or less')
      }
    })

    it('rejects description longer than 500 characters', () => {
      const invalidData = {
        name: 'Area 100',
        description: 'A'.repeat(501)
      }

      const result = areaFormSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('500 characters or less')
      }
    })

    it('rejects missing name field', () => {
      const invalidData = {
        description: 'Test'
      }

      const result = areaFormSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })
  })
})

describe('System Schema Validation', () => {
  describe('systemFormSchema', () => {
    it('validates valid system data', () => {
      const validData = {
        name: 'HVAC-01',
        description: 'Heating, ventilation, and air conditioning'
      }

      const result = systemFormSchema.safeParse(validData)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.name).toBe('HVAC-01')
        expect(result.data.description).toBe('Heating, ventilation, and air conditioning')
      }
    })

    it('validates system with null description', () => {
      const validData = {
        name: 'HVAC-01',
        description: null
      }

      const result = systemFormSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('trims whitespace from name', () => {
      const dataWithWhitespace = {
        name: '  HVAC-01  ',
        description: 'Test'
      }

      const result = systemFormSchema.safeParse(dataWithWhitespace)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.name).toBe('HVAC-01')
      }
    })

    it('rejects empty name', () => {
      const invalidData = {
        name: '',
        description: 'Test'
      }

      const result = systemFormSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('System name is required')
      }
    })

    it('rejects name longer than 50 characters', () => {
      const invalidData = {
        name: 'S'.repeat(51),
        description: 'Test'
      }

      const result = systemFormSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('50 characters or less')
      }
    })

    it('rejects description longer than 500 characters', () => {
      const invalidData = {
        name: 'HVAC-01',
        description: 'D'.repeat(501)
      }

      const result = systemFormSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('500 characters or less')
      }
    })
  })
})

describe('Test Package Schema Validation', () => {
  describe('testPackageFormSchema', () => {
    it('validates valid test package data', () => {
      const validData = {
        name: 'TP-2025-001',
        description: 'Q4 2025 HVAC system test',
        target_date: new Date('2025-12-15')
      }

      const result = testPackageFormSchema.safeParse(validData)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.name).toBe('TP-2025-001')
        expect(result.data.description).toBe('Q4 2025 HVAC system test')
        expect(result.data.target_date).toBeInstanceOf(Date)
      }
    })

    it('validates test package with null target_date', () => {
      const validData = {
        name: 'TP-2025-001',
        description: 'Test',
        target_date: null
      }

      const result = testPackageFormSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('validates test package with missing target_date', () => {
      const validData = {
        name: 'TP-2025-001',
        description: 'Test'
      }

      const result = testPackageFormSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('trims whitespace from name', () => {
      const dataWithWhitespace = {
        name: '  TP-2025-001  ',
        description: 'Test'
      }

      const result = testPackageFormSchema.safeParse(dataWithWhitespace)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.name).toBe('TP-2025-001')
      }
    })

    it('rejects empty name', () => {
      const invalidData = {
        name: '',
        description: 'Test'
      }

      const result = testPackageFormSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('Test package name is required')
      }
    })

    it('rejects name longer than 100 characters', () => {
      const invalidData = {
        name: 'T'.repeat(101),
        description: 'Test'
      }

      const result = testPackageFormSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('100 characters or less')
      }
    })

    it('rejects description longer than 500 characters', () => {
      const invalidData = {
        name: 'TP-2025-001',
        description: 'D'.repeat(501)
      }

      const result = testPackageFormSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('500 characters or less')
      }
    })

    it('rejects invalid date type', () => {
      const invalidData = {
        name: 'TP-2025-001',
        description: 'Test',
        target_date: 'not-a-date'
      }

      const result = testPackageFormSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('accepts valid Date object', () => {
      const validData = {
        name: 'TP-2025-001',
        target_date: new Date('2025-12-15T00:00:00Z')
      }

      const result = testPackageFormSchema.safeParse(validData)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.target_date).toBeInstanceOf(Date)
      }
    })
  })
})
