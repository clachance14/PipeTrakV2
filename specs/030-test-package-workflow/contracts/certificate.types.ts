/**
 * Certificate Domain Types
 *
 * TypeScript interfaces for package certificate entities.
 * See: specs/030-test-package-workflow/data-model.md
 */

/**
 * Pressure Unit Enum
 *
 * Valid values for pressure_unit column.
 * Matches CHECK constraint in migration 00122.
 */
export type PressureUnit = 'PSIG' | 'BAR' | 'KPA' | 'PSI';

/**
 * Temperature Unit Enum
 *
 * Valid values for temperature_unit column.
 * Matches CHECK constraint in migration 00122.
 */
export type TemperatureUnit = 'F' | 'C' | 'K';

/**
 * Package Certificate
 *
 * Formal Pipe Testing Acceptance Certificate.
 * Corresponds to database table: package_certificates
 */
export interface PackageCertificate {
  id: string;
  package_id: string;
  certificate_number: string; // Auto-generated: "PKG-001", "PKG-002", etc.
  client: string | null;
  client_spec: string | null;
  line_number: string | null;
  test_pressure: number; // NUMERIC(10, 2)
  pressure_unit: PressureUnit;
  test_media: string;
  temperature: number; // NUMERIC(6, 2)
  temperature_unit: TemperatureUnit;
  created_at: string; // ISO 8601 timestamp
  updated_at: string; // ISO 8601 timestamp
}

/**
 * Certificate Create Input (Draft)
 *
 * Input for saving certificate as draft (FR-015: "Save as Draft").
 * Only package_id required, all other fields optional.
 */
export interface CertificateCreateDraftInput {
  package_id: string;
  client?: string | null;
  client_spec?: string | null;
  line_number?: string | null;
  test_pressure?: number | null;
  pressure_unit?: PressureUnit;
  test_media?: string | null;
  temperature?: number | null;
  temperature_unit?: TemperatureUnit;
}

/**
 * Certificate Create Input (Complete)
 *
 * Input for submitting complete certificate (FR-016: "Submit & Begin Testing").
 * Requires all mandatory fields for validation.
 */
export interface CertificateCreateCompleteInput {
  package_id: string;
  client?: string | null;
  client_spec?: string | null;
  line_number?: string | null;
  test_pressure: number; // Required (FR-016)
  pressure_unit: PressureUnit;
  test_media: string; // Required (FR-016)
  temperature: number; // Required (FR-016)
  temperature_unit: TemperatureUnit;
}

/**
 * Certificate Update Input
 *
 * Input for updating existing certificate.
 * All fields optional (partial update).
 */
export interface CertificateUpdateInput {
  client?: string | null;
  client_spec?: string | null;
  line_number?: string | null;
  test_pressure?: number;
  pressure_unit?: PressureUnit;
  test_media?: string;
  temperature?: number;
  temperature_unit?: TemperatureUnit;
}

/**
 * Certificate Validation Errors
 *
 * Structured validation errors for certificate form.
 */
export interface CertificateValidationErrors {
  test_pressure?: string[];
  test_media?: string[];
  temperature?: string[];
  client?: string[];
  client_spec?: string[];
}
