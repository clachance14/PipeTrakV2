/**
 * Unit Tests: CertificateSection Component
 * Feature 030: Enhanced Package Completion Report PDF
 *
 * Tests that CertificateSection correctly:
 * - Displays certificate details when available
 * - Shows pending state when no certificate
 * - Supports compact mode
 * - Shows optional fields conditionally
 */

import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { CertificateSection } from './CertificateSection';
import type { PackageCertificate } from '@/hooks/usePackageCertificate';

// Mock @react-pdf/renderer
vi.mock('@react-pdf/renderer', () => ({
  View: ({ children, style }: any) => (
    <div data-testid="pdf-view" data-style={JSON.stringify(style)}>
      {children}
    </div>
  ),
  Text: ({ children, style }: any) => (
    <span data-testid="pdf-text" data-style={JSON.stringify(style)}>
      {children}
    </span>
  ),
  StyleSheet: { create: (styles: any) => styles },
}));

describe('CertificateSection', () => {
  const baseCertificate: PackageCertificate = {
    id: 'cert-123',
    package_id: 'pkg-456',
    certificate_number: 'HT-2025-001',
    test_pressure: 1500,
    pressure_unit: 'PSI',
    test_media: 'Water',
    temperature: 70,
    temperature_unit: 'F',
    client: null,
    client_spec: null,
    line_number: null,
    created_at: '2025-01-15T10:00:00Z',
    updated_at: '2025-01-15T10:00:00Z',
  };

  describe('pending state', () => {
    it('renders pending message when certificate is null', () => {
      const { container } = render(<CertificateSection certificate={null} />);
      expect(container.textContent).toContain('Test certificate pending');
      expect(container.textContent).toContain('Certificate will be generated after test completion');
    });

    it('renders section title for pending state', () => {
      const { container } = render(<CertificateSection certificate={null} />);
      expect(container.textContent).toContain('Test Certificate');
    });
  });

  describe('full mode', () => {
    it('renders certificate number', () => {
      const { container } = render(<CertificateSection certificate={baseCertificate} />);
      expect(container.textContent).toContain('Certificate Number:');
      expect(container.textContent).toContain('HT-2025-001');
    });

    it('renders test pressure with unit', () => {
      const { container } = render(<CertificateSection certificate={baseCertificate} />);
      expect(container.textContent).toContain('Test Pressure:');
      expect(container.textContent).toContain('1500 PSI');
    });

    it('renders test media', () => {
      const { container } = render(<CertificateSection certificate={baseCertificate} />);
      expect(container.textContent).toContain('Test Media:');
      expect(container.textContent).toContain('Water');
    });

    it('renders temperature with unit', () => {
      const { container } = render(<CertificateSection certificate={baseCertificate} />);
      expect(container.textContent).toContain('Temperature:');
      expect(container.textContent).toContain('70°F');
    });

    it('renders client when provided', () => {
      const certWithClient = { ...baseCertificate, client: 'Acme Corp' };
      const { container } = render(<CertificateSection certificate={certWithClient} />);
      expect(container.textContent).toContain('Client:');
      expect(container.textContent).toContain('Acme Corp');
    });

    it('does not render client row when null', () => {
      const { container } = render(<CertificateSection certificate={baseCertificate} />);
      expect(container.textContent).not.toContain('Client:');
    });

    it('renders client spec when provided', () => {
      const certWithSpec = { ...baseCertificate, client_spec: 'SPEC-001' };
      const { container } = render(<CertificateSection certificate={certWithSpec} />);
      expect(container.textContent).toContain('Client Spec:');
      expect(container.textContent).toContain('SPEC-001');
    });

    it('renders line number when provided', () => {
      const certWithLine = { ...baseCertificate, line_number: 'LN-2025-A' };
      const { container } = render(<CertificateSection certificate={certWithLine} />);
      expect(container.textContent).toContain('Line Number:');
      expect(container.textContent).toContain('LN-2025-A');
    });
  });

  describe('compact mode', () => {
    it('renders compact layout when compact=true', () => {
      const { container } = render(
        <CertificateSection certificate={baseCertificate} compact={true} />
      );
      expect(container.textContent).toContain('Cert #:');
      expect(container.textContent).toContain('HT-2025-001');
    });

    it('shows pressure in compact mode', () => {
      const { container } = render(
        <CertificateSection certificate={baseCertificate} compact={true} />
      );
      expect(container.textContent).toContain('Pressure:');
      expect(container.textContent).toContain('1500 PSI');
    });

    it('shows media in compact mode', () => {
      const { container } = render(
        <CertificateSection certificate={baseCertificate} compact={true} />
      );
      expect(container.textContent).toContain('Media:');
      expect(container.textContent).toContain('Water');
    });

    it('does not show temperature in compact mode', () => {
      const { container } = render(
        <CertificateSection certificate={baseCertificate} compact={true} />
      );
      expect(container.textContent).not.toContain('Temperature:');
    });
  });
});
