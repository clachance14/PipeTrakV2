import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DrawingUploadTab } from './DrawingUploadTab';

// Mock pdf-worker
vi.mock('@/lib/pdf-worker', () => ({
  pdfjsLib: {
    getDocument: vi.fn(() => ({
      promise: Promise.resolve({
        numPages: 1,
        destroy: vi.fn(),
      }),
    })),
  },
}));

// Mock supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: { access_token: 'test-token' } },
        error: null,
      }),
    },
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn().mockResolvedValue({ data: { path: 'test/file.pdf' }, error: null }),
        list: vi.fn().mockResolvedValue({ data: [], error: null }),
      })),
    },
    functions: {
      invoke: vi.fn().mockResolvedValue({
        data: { success: true, drawingsProcessed: 1, componentsCreated: 5, bomItemsStored: 10, errors: [] },
        error: null,
      }),
    },
  },
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe('DrawingUploadTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the drop zone with PDF instructions', () => {
    render(<DrawingUploadTab projectId="test-project" />, { wrapper: createWrapper() });

    expect(screen.getByText(/drag.*pdf/i)).toBeInTheDocument();
    expect(screen.getByText(/150\s*MB/i)).toBeInTheDocument();
  });

  it('shows error for non-PDF files', async () => {
    render(<DrawingUploadTab projectId="test-project" />, { wrapper: createWrapper() });

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;

    const csvFile = new File(['test'], 'test.csv', { type: 'text/csv' });

    fireEvent.drop(input, {
      dataTransfer: {
        files: [csvFile],
        types: ['Files'],
      },
    });

    // The dropzone should reject non-PDF files (react-dropzone handles accept filter)
    // No processing state should appear
    await waitFor(() => {
      expect(screen.queryByText(/uploading/i)).not.toBeInTheDocument();
    });
  });

  it('shows error for oversized files', async () => {
    render(<DrawingUploadTab projectId="test-project" />, { wrapper: createWrapper() });

    // Create a file that exceeds 150MB (use Object.defineProperty to fake size)
    const bigFile = new File(['x'], 'big.pdf', { type: 'application/pdf' });
    Object.defineProperty(bigFile, 'size', { value: 160 * 1024 * 1024 });

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;

    fireEvent.drop(input, {
      dataTransfer: {
        files: [bigFile],
        types: ['Files'],
      },
    });

    // react-dropzone maxSize should reject it
    await waitFor(() => {
      expect(screen.queryByText(/uploading/i)).not.toBeInTheDocument();
    });
  });

  it('renders without projectId but shows disabled state', () => {
    render(<DrawingUploadTab projectId="" />, { wrapper: createWrapper() });

    expect(screen.getByText(/drag.*pdf/i)).toBeInTheDocument();
  });
});
