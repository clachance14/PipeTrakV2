/**
 * Unit Tests: PageLayout Component (Feature 029)
 *
 * Tests that PageLayout correctly composes:
 * - Header (optional)
 * - Content (children)
 * - Footer (optional)
 * - Page size and orientation
 */

import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { PageLayout } from './PageLayout';
import type { PageLayoutProps, BrandedHeaderProps, ReportFooterProps } from '@/types/pdf-components';

// Mock @react-pdf/renderer to avoid actual PDF generation
vi.mock('@react-pdf/renderer', () => ({
  Document: ({ children }: any) => <div data-testid="pdf-document">{children}</div>,
  Page: ({ children, size, orientation }: any) => (
    <div data-testid="pdf-page" data-size={size} data-orientation={orientation}>
      {children}
    </div>
  ),
  View: ({ children }: any) => <div data-testid="pdf-view">{children}</div>,
  Text: ({ children, render: renderProp }: any) => {
    if (renderProp) {
      const renderedText = renderProp({ pageNumber: 1, totalPages: 5 });
      return <span data-testid="pdf-text" data-render-prop="true">{renderedText}</span>;
    }
    return <span data-testid="pdf-text">{children}</span>;
  },
  Image: ({ src }: any) => <img data-testid="pdf-image" src={src} alt="" />,
  StyleSheet: { create: (styles: any) => styles },
}));

describe('PageLayout', () => {
  const headerProps: BrandedHeaderProps = {
    title: 'Test Report',
    projectName: 'Test Project',
    dimensionLabel: 'Area',
    generatedDate: '2025-01-21',
  };

  const footerProps: ReportFooterProps = {
    showPageNumbers: true,
  };

  it('renders children content', () => {
    const props: PageLayoutProps = {
      orientation: 'landscape',
      children: <div data-testid="test-content">Test Content</div>,
    };
    const { container } = render(<PageLayout {...props} />);
    const content = container.querySelector('[data-testid="test-content"]');
    expect(content).toBeTruthy();
    expect(content?.textContent).toBe('Test Content');
  });

  it('renders header when showHeader is true and headerProps provided', () => {
    const props: PageLayoutProps = {
      orientation: 'landscape',
      showHeader: true,
      headerProps,
      children: <div>Content</div>,
    };
    const { container } = render(<PageLayout {...props} />);
    expect(container.textContent).toContain('Test Report');
    expect(container.textContent).toContain('Test Project');
  });

  it('does not render header when showHeader is false', () => {
    const props: PageLayoutProps = {
      orientation: 'landscape',
      showHeader: false,
      headerProps,
      children: <div>Content</div>,
    };
    const { container } = render(<PageLayout {...props} />);
    expect(container.textContent).not.toContain('Test Report');
  });

  it('does not render header when headerProps not provided', () => {
    const props: PageLayoutProps = {
      orientation: 'landscape',
      showHeader: true,
      children: <div>Content</div>,
    };
    const { container } = render(<PageLayout {...props} />);
    // Should not crash, just not render header
    const content = container.querySelector('[data-testid="pdf-page"]');
    expect(content).toBeTruthy();
  });

  it('renders footer when showFooter is true and footerProps provided', () => {
    const props: PageLayoutProps = {
      orientation: 'landscape',
      showFooter: true,
      footerProps,
      children: <div>Content</div>,
    };
    const { container } = render(<PageLayout {...props} />);
    expect(container.textContent).toContain('Page 1 of 5');
  });

  it('does not render footer when showFooter is false', () => {
    const props: PageLayoutProps = {
      orientation: 'landscape',
      showFooter: false,
      footerProps,
      children: <div>Content</div>,
    };
    const { container } = render(<PageLayout {...props} />);
    expect(container.textContent).not.toContain('Page');
  });

  it('does not render footer when footerProps not provided', () => {
    const props: PageLayoutProps = {
      orientation: 'landscape',
      showFooter: true,
      children: <div>Content</div>,
    };
    const { container } = render(<PageLayout {...props} />);
    // Should not crash, just not render footer
    const content = container.querySelector('[data-testid="pdf-page"]');
    expect(content).toBeTruthy();
  });

  it('renders both header and footer when both enabled', () => {
    const props: PageLayoutProps = {
      orientation: 'landscape',
      showHeader: true,
      showFooter: true,
      headerProps,
      footerProps,
      children: <div>Content</div>,
    };
    const { container } = render(<PageLayout {...props} />);
    expect(container.textContent).toContain('Test Report');
    expect(container.textContent).toContain('Page 1 of 5');
  });

  it('renders content without header or footer', () => {
    const props: PageLayoutProps = {
      orientation: 'landscape',
      showHeader: false,
      showFooter: false,
      children: <div data-testid="test-content">Just Content</div>,
    };
    const { container } = render(<PageLayout {...props} />);
    const content = container.querySelector('[data-testid="test-content"]');
    expect(content).toBeTruthy();
    expect(content?.textContent).toBe('Just Content');
  });

  it('uses A4 size by default', () => {
    const props: PageLayoutProps = {
      orientation: 'landscape',
      children: <div>Content</div>,
    };
    const { container } = render(<PageLayout {...props} />);
    const page = container.querySelector('[data-testid="pdf-page"]');
    expect(page?.getAttribute('data-size')).toBe('A4');
  });

  it('uses specified page size', () => {
    const props: PageLayoutProps = {
      size: 'LETTER',
      orientation: 'portrait',
      children: <div>Content</div>,
    };
    const { container } = render(<PageLayout {...props} />);
    const page = container.querySelector('[data-testid="pdf-page"]');
    expect(page?.getAttribute('data-size')).toBe('LETTER');
  });

  it('passes orientation to Page component', () => {
    const props: PageLayoutProps = {
      orientation: 'landscape',
      children: <div>Content</div>,
    };
    const { container } = render(<PageLayout {...props} />);
    const page = container.querySelector('[data-testid="pdf-page"]');
    expect(page?.getAttribute('data-orientation')).toBe('landscape');
  });

  it('handles portrait orientation', () => {
    const props: PageLayoutProps = {
      orientation: 'portrait',
      children: <div>Content</div>,
    };
    const { container } = render(<PageLayout {...props} />);
    const page = container.querySelector('[data-testid="pdf-page"]');
    expect(page?.getAttribute('data-orientation')).toBe('portrait');
  });

  it('renders correct order: header, content, footer', () => {
    const props: PageLayoutProps = {
      orientation: 'landscape',
      showHeader: true,
      showFooter: true,
      headerProps,
      footerProps,
      children: <div>CONTENT_MARKER</div>,
    };
    const { container } = render(<PageLayout {...props} />);
    const text = container.textContent || '';

    // Find positions of each section
    const headerIndex = text.indexOf('Test Report');
    const contentIndex = text.indexOf('CONTENT_MARKER');
    const footerIndex = text.indexOf('Page');

    // Verify order
    expect(headerIndex).toBeGreaterThan(-1);
    expect(contentIndex).toBeGreaterThan(headerIndex);
    expect(footerIndex).toBeGreaterThan(contentIndex);
  });

  it('handles multiple child elements', () => {
    const props: PageLayoutProps = {
      orientation: 'landscape',
      children: (
        <>
          <div data-testid="child-1">Child 1</div>
          <div data-testid="child-2">Child 2</div>
          <div data-testid="child-3">Child 3</div>
        </>
      ),
    };
    const { container } = render(<PageLayout {...props} />);
    expect(container.querySelector('[data-testid="child-1"]')).toBeTruthy();
    expect(container.querySelector('[data-testid="child-2"]')).toBeTruthy();
    expect(container.querySelector('[data-testid="child-3"]')).toBeTruthy();
  });
});
