import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { DrawingProcessingProgress } from './DrawingProcessingProgress';

// Mock supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          not: vi.fn(() => ({
            order: vi.fn().mockResolvedValue({ data: [], error: null }),
          })),
        })),
      })),
    })),
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnThis(),
      unsubscribe: vi.fn(),
    })),
  },
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <MemoryRouter>
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      </MemoryRouter>
    );
  };
}

describe('DrawingProcessingProgress', () => {
  it('renders empty state when no drawings are processing', () => {
    render(<DrawingProcessingProgress projectId="test-project" />, { wrapper: createWrapper() });

    // Should show a heading or message when no data loaded yet
    expect(screen.getByText(/processing/i)).toBeInTheDocument();
  });

  it('renders without crashing when projectId is empty', () => {
    render(<DrawingProcessingProgress projectId="" />, { wrapper: createWrapper() });

    // Should render gracefully
    expect(screen.getByText(/processing/i)).toBeInTheDocument();
  });
});
