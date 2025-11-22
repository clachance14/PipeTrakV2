/**
 * Unit Tests: ReportFooter Component (Feature 029)
 *
 * Tests that ReportFooter renders correctly:
 * - Page numbers (optional)
 * - Company info (optional)
 * - Default showPageNumbers behavior
 */

import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { ReportFooter } from './ReportFooter';
import type { ReportFooterProps } from '@/types/pdf-components';

// Mock @react-pdf/renderer to avoid actual PDF generation
vi.mock('@react-pdf/renderer', () => ({
  Document: ({ children }: any) => <div data-testid="pdf-document">{children}</div>,
  Page: ({ children }: any) => <div data-testid="pdf-page">{children}</div>,
  View: ({ children }: any) => <div data-testid="pdf-view">{children}</div>,
  Text: ({ children, render: renderProp }: any) => {
    // Handle render prop for page numbers
    if (renderProp) {
      const renderedText = renderProp({ pageNumber: 1, totalPages: 5 });
      return <span data-testid="pdf-text" data-render-prop="true">{renderedText}</span>;
    }
    return <span data-testid="pdf-text">{children}</span>;
  },
  Image: ({ src }: any) => <img data-testid="pdf-image" src={src} alt="" />,
  StyleSheet: { create: (styles: any) => styles },
}));

describe('ReportFooter', () => {
  it('renders page numbers by default', () => {
    const { container } = render(<ReportFooter />);
    const renderPropText = container.querySelector('[data-render-prop="true"]');
    expect(renderPropText).toBeTruthy();
    expect(renderPropText?.textContent).toBe('Page 1 of 5');
  });

  it('renders page numbers when showPageNumbers is true', () => {
    const props: ReportFooterProps = {
      showPageNumbers: true,
    };
    const { container } = render(<ReportFooter {...props} />);
    const renderPropText = container.querySelector('[data-render-prop="true"]');
    expect(renderPropText).toBeTruthy();
    expect(renderPropText?.textContent).toBe('Page 1 of 5');
  });

  it('does not render page numbers when showPageNumbers is false', () => {
    const props: ReportFooterProps = {
      showPageNumbers: false,
    };
    const { container } = render(<ReportFooter {...props} />);
    const renderPropText = container.querySelector('[data-render-prop="true"]');
    expect(renderPropText).toBeFalsy();
  });

  it('renders company info when provided', () => {
    const props: ReportFooterProps = {
      companyInfo: 'Acme Construction Inc. | www.acmeconstruction.com',
    };
    const { container } = render(<ReportFooter {...props} />);
    expect(container.textContent).toContain('Acme Construction Inc. | www.acmeconstruction.com');
  });

  it('does not render company info when not provided', () => {
    const { container } = render(<ReportFooter />);
    // Should only have page numbers, no company info
    const texts = container.querySelectorAll('[data-testid="pdf-text"]');
    expect(texts.length).toBe(1); // Only page number text
  });

  it('renders both company info and page numbers when both provided', () => {
    const props: ReportFooterProps = {
      companyInfo: 'Test Company',
      showPageNumbers: true,
    };
    const { container } = render(<ReportFooter {...props} />);
    expect(container.textContent).toContain('Test Company');
    expect(container.textContent).toContain('Page 1 of 5');
  });

  it('renders only company info when page numbers disabled', () => {
    const props: ReportFooterProps = {
      companyInfo: 'Test Company',
      showPageNumbers: false,
    };
    const { container } = render(<ReportFooter {...props} />);
    expect(container.textContent).toContain('Test Company');
    expect(container.textContent).not.toContain('Page');
  });

  it('handles special characters in company info', () => {
    const props: ReportFooterProps = {
      companyInfo: 'Company & "Special" <Characters>',
    };
    const { container } = render(<ReportFooter {...props} />);
    expect(container.textContent).toContain('Company & "Special" <Characters>');
  });

  it('renders View components for layout structure', () => {
    const { container } = render(<ReportFooter />);
    const views = container.querySelectorAll('[data-testid="pdf-view"]');
    expect(views.length).toBeGreaterThan(0);
  });

  it('renders empty footer with no props', () => {
    const { container } = render(<ReportFooter showPageNumbers={false} />);
    // Should still render View structure, just with empty content
    const views = container.querySelectorAll('[data-testid="pdf-view"]');
    expect(views.length).toBeGreaterThan(0);
  });

  it('handles long company info text', () => {
    const props: ReportFooterProps = {
      companyInfo: 'Very Long Company Name Inc. with Many Subsidiaries and Divisions | 123 Long Address Street, City, State 12345 | phone@example.com',
    };
    const { container } = render(<ReportFooter {...props} />);
    expect(container.textContent).toContain('Very Long Company Name Inc.');
  });
});
