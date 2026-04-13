import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PdfCanvas } from './PdfCanvas';

// Mock pdf.js
vi.mock('@/lib/pdf-worker', () => ({
  pdfjsLib: {
    getDocument: vi.fn(() => ({
      promise: new Promise(() => {
        // Never resolves — simulates loading state
      }),
      destroy: vi.fn(),
    })),
  },
}));

describe('PdfCanvas', () => {
  it('renders loading state when URL is provided', () => {
    render(
      <PdfCanvas
        fileUrl="https://example.com/test.pdf"
        currentPage={1}
        onPageChange={vi.fn()}
        onPageCountChange={vi.fn()}
      />,
    );

    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('renders container when fileUrl is empty', () => {
    render(
      <PdfCanvas
        fileUrl=""
        currentPage={1}
        onPageChange={vi.fn()}
        onPageCountChange={vi.fn()}
      />,
    );

    expect(document.querySelector('[data-testid="pdf-canvas-container"]')).toBeInTheDocument();
    // No loading state when no URL
    expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
  });
});
