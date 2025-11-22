/**
 * Unit Tests: BrandedHeader Component (Feature 029)
 *
 * Tests that BrandedHeader renders all props correctly:
 * - Logo (optional)
 * - Title and subtitle
 * - Project name
 * - Dimension label
 * - Generated date
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrandedHeader } from './BrandedHeader';
import type { BrandedHeaderProps } from '@/types/pdf-components';

// Mock @react-pdf/renderer to avoid actual PDF generation
vi.mock('@react-pdf/renderer', () => ({
  Document: ({ children }: any) => <div data-testid="pdf-document">{children}</div>,
  Page: ({ children }: any) => <div data-testid="pdf-page">{children}</div>,
  View: ({ children }: any) => <div data-testid="pdf-view">{children}</div>,
  Text: ({ children }: any) => <span data-testid="pdf-text">{children}</span>,
  Image: ({ src }: any) => <img data-testid="pdf-image" src={src} alt="" />,
  StyleSheet: { create: (styles: any) => styles },
}));

describe('BrandedHeader', () => {
  const defaultProps: BrandedHeaderProps = {
    title: 'PipeTrak Field Weld Progress Report',
    projectName: 'Test Project Alpha',
    dimensionLabel: 'Area',
    generatedDate: '2025-01-21',
  };

  it('renders title correctly', () => {
    const { container } = render(<BrandedHeader {...defaultProps} />);
    expect(container.textContent).toContain('PipeTrak Field Weld Progress Report');
  });

  it('renders project name correctly', () => {
    const { container } = render(<BrandedHeader {...defaultProps} />);
    expect(container.textContent).toContain('Test Project Alpha');
  });

  it('renders dimension label correctly', () => {
    const { container } = render(<BrandedHeader {...defaultProps} />);
    expect(container.textContent).toContain('Dimension: Area');
  });

  it('renders generated date correctly', () => {
    const { container } = render(<BrandedHeader {...defaultProps} />);
    expect(container.textContent).toContain('Generated: 2025-01-21');
  });

  it('renders logo when provided', () => {
    const propsWithLogo: BrandedHeaderProps = {
      ...defaultProps,
      logo: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    };
    const { container } = render(<BrandedHeader {...propsWithLogo} />);
    const image = container.querySelector('[data-testid="pdf-image"]');
    expect(image).toBeTruthy();
    expect(image?.getAttribute('src')).toBe(propsWithLogo.logo);
  });

  it('does not render logo when not provided', () => {
    const { container } = render(<BrandedHeader {...defaultProps} />);
    const image = container.querySelector('[data-testid="pdf-image"]');
    expect(image).toBeFalsy();
  });

  it('renders subtitle when provided', () => {
    const propsWithSubtitle: BrandedHeaderProps = {
      ...defaultProps,
      subtitle: 'Weekly Progress Summary',
    };
    const { container } = render(<BrandedHeader {...propsWithSubtitle} />);
    expect(container.textContent).toContain('Weekly Progress Summary');
  });

  it('does not render subtitle when not provided', () => {
    const { container } = render(<BrandedHeader {...defaultProps} />);
    expect(container.textContent).not.toContain('Weekly Progress Summary');
  });

  it('renders all metadata fields in correct order', () => {
    const { container } = render(<BrandedHeader {...defaultProps} />);
    const text = container.textContent || '';

    // Verify project name appears before dimension label
    const projectIndex = text.indexOf('Test Project Alpha');
    const dimensionIndex = text.indexOf('Dimension: Area');
    const dateIndex = text.indexOf('Generated: 2025-01-21');

    expect(projectIndex).toBeGreaterThan(-1);
    expect(dimensionIndex).toBeGreaterThan(projectIndex);
    expect(dateIndex).toBeGreaterThan(dimensionIndex);
  });

  it('handles special characters in project name', () => {
    const propsWithSpecialChars: BrandedHeaderProps = {
      ...defaultProps,
      projectName: 'Project "Special" & <Characters>',
    };
    const { container } = render(<BrandedHeader {...propsWithSpecialChars} />);
    expect(container.textContent).toContain('Project "Special" & <Characters>');
  });

  it('handles different dimension labels', () => {
    const dimensions = ['Area', 'System', 'Test Package', 'Welder'];

    dimensions.forEach((dimension) => {
      const { container } = render(
        <BrandedHeader {...defaultProps} dimensionLabel={dimension} />
      );
      expect(container.textContent).toContain(`Dimension: ${dimension}`);
    });
  });

  it('renders View components for layout structure', () => {
    const { container } = render(<BrandedHeader {...defaultProps} />);
    const views = container.querySelectorAll('[data-testid="pdf-view"]');
    expect(views.length).toBeGreaterThan(0);
  });

  it('renders Text components for text content', () => {
    const { container } = render(<BrandedHeader {...defaultProps} />);
    const texts = container.querySelectorAll('[data-testid="pdf-text"]');
    expect(texts.length).toBeGreaterThan(0);
  });
});
