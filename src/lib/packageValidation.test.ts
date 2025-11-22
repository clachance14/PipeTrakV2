/**
 * Unit Tests: Package Validation Functions
 * Feature 030 - Test Package Lifecycle Workflow
 *
 * Tests validateCertificate function for certificate submission validation (FR-016).
 */

import { describe, it, expect } from 'vitest';
import { validateCertificate, hasValidationErrors } from './packageValidation';
import type { CertificateCreateCompleteInput } from '@/types/certificate.types';

describe('validateCertificate', () => {
  it('should return no errors for valid certificate', () => {
    const validInput: CertificateCreateCompleteInput = {
      package_id: 'pkg-123',
      test_pressure: 150,
      pressure_unit: 'PSIG',
      test_media: 'Water',
      temperature: 70,
      temperature_unit: 'F',
    };

    const errors = validateCertificate(validInput);
    expect(errors).toEqual({});
    expect(hasValidationErrors(errors)).toBe(false);
  });

  it('should require test_pressure', () => {
    const input = {
      package_id: 'pkg-123',
      pressure_unit: 'PSIG' as const,
      test_media: 'Water',
      temperature: 70,
      temperature_unit: 'F' as const,
    };

    const errors = validateCertificate(input);
    expect(errors.test_pressure).toEqual(['Test pressure must be greater than 0']);
    expect(hasValidationErrors(errors)).toBe(true);
  });

  it('should reject zero test_pressure', () => {
    const input: CertificateCreateCompleteInput = {
      package_id: 'pkg-123',
      test_pressure: 0,
      pressure_unit: 'PSIG',
      test_media: 'Water',
      temperature: 70,
      temperature_unit: 'F',
    };

    const errors = validateCertificate(input);
    expect(errors.test_pressure).toEqual(['Test pressure must be greater than 0']);
  });

  it('should reject negative test_pressure', () => {
    const input: CertificateCreateCompleteInput = {
      package_id: 'pkg-123',
      test_pressure: -10,
      pressure_unit: 'PSIG',
      test_media: 'Water',
      temperature: 70,
      temperature_unit: 'F',
    };

    const errors = validateCertificate(input);
    expect(errors.test_pressure).toEqual(['Test pressure must be greater than 0']);
  });

  it('should require test_media', () => {
    const input = {
      package_id: 'pkg-123',
      test_pressure: 150,
      pressure_unit: 'PSIG' as const,
      temperature: 70,
      temperature_unit: 'F' as const,
    };

    const errors = validateCertificate(input);
    expect(errors.test_media).toEqual(['Test media is required']);
  });

  it('should reject empty test_media string', () => {
    const input: CertificateCreateCompleteInput = {
      package_id: 'pkg-123',
      test_pressure: 150,
      pressure_unit: 'PSIG',
      test_media: '   ',
      temperature: 70,
      temperature_unit: 'F',
    };

    const errors = validateCertificate(input);
    expect(errors.test_media).toEqual(['Test media is required']);
  });

  it('should require temperature', () => {
    const input = {
      package_id: 'pkg-123',
      test_pressure: 150,
      pressure_unit: 'PSIG' as const,
      test_media: 'Water',
      temperature_unit: 'F' as const,
    };

    const errors = validateCertificate(input);
    expect(errors.temperature).toEqual(['Temperature is required']);
  });

  it('should allow negative temperature (refrigeration)', () => {
    const input: CertificateCreateCompleteInput = {
      package_id: 'pkg-123',
      test_pressure: 150,
      pressure_unit: 'PSIG',
      test_media: 'Nitrogen',
      temperature: -20,
      temperature_unit: 'C',
    };

    const errors = validateCertificate(input);
    expect(errors).toEqual({});
    expect(hasValidationErrors(errors)).toBe(false);
  });

  it('should allow zero temperature', () => {
    const input: CertificateCreateCompleteInput = {
      package_id: 'pkg-123',
      test_pressure: 150,
      pressure_unit: 'PSIG',
      test_media: 'Water',
      temperature: 0,
      temperature_unit: 'C',
    };

    const errors = validateCertificate(input);
    expect(errors).toEqual({});
    expect(hasValidationErrors(errors)).toBe(false);
  });

  it('should return multiple errors for completely invalid input', () => {
    const input = {
      package_id: 'pkg-123',
      pressure_unit: 'PSIG' as const,
      temperature_unit: 'F' as const,
    };

    const errors = validateCertificate(input);
    expect(errors.test_pressure).toBeDefined();
    expect(errors.test_media).toBeDefined();
    expect(errors.temperature).toBeDefined();
    expect(hasValidationErrors(errors)).toBe(true);
  });

  it('should allow optional fields to be undefined', () => {
    const input: CertificateCreateCompleteInput = {
      package_id: 'pkg-123',
      test_pressure: 150,
      pressure_unit: 'PSIG',
      test_media: 'Water',
      temperature: 70,
      temperature_unit: 'F',
      client: undefined,
      client_spec: undefined,
      line_number: undefined,
    };

    const errors = validateCertificate(input);
    expect(errors).toEqual({});
  });
});
