import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DrawingComponentSidebar } from './DrawingComponentSidebar';

// Mock hooks
vi.mock('@/hooks/useComponentsByDrawing', () => ({
  useComponentsByDrawing: vi.fn(() => ({
    data: [
      {
        id: 'comp-1',
        project_id: 'proj-1',
        drawing_id: 'draw-1',
        component_type: 'valve',
        identity_key: { drawing: 'DWG-001', cmdty_code: 'GATE_VALVE', size: '4"', seq: 1 },
        current_milestones: { Receive: 100, Install: 0, Punch: 0, Test: 0, Restore: 0 },
        percent_complete: 20,
        created_at: '2025-01-01',
        last_updated_at: '2025-01-01',
        last_updated_by: null,
        is_retired: false,
        template: {
          id: 'tmpl-1',
          component_type: 'valve',
          version: 1,
          workflow_type: 'discrete',
          milestones_config: [
            { name: 'Receive', weight: 20, order: 1, is_partial: false, requires_welder: false },
            { name: 'Install', weight: 30, order: 2, is_partial: false, requires_welder: false },
            { name: 'Punch', weight: 15, order: 3, is_partial: false, requires_welder: false },
            { name: 'Test', weight: 25, order: 4, is_partial: false, requires_welder: false },
            { name: 'Restore', weight: 10, order: 5, is_partial: false, requires_welder: false },
          ],
        },
        identityDisplay: 'GATE_VALVE 4" #1',
        canUpdate: true,
      },
    ],
    isLoading: false,
    error: null,
  })),
}));

vi.mock('@/hooks/useDrawingBomItems', () => ({
  useDrawingBomItems: vi.fn(() => ({
    data: [
      {
        id: 'bom-1',
        drawing_id: 'draw-1',
        project_id: 'proj-1',
        item_type: 'material',
        classification: 'stud bolt',
        section: 'field',
        description: 'Stud bolt 3/4" x 4"',
        size: '3/4"',
        quantity: 12,
        is_tracked: false,
        needs_review: false,
        created_at: '2025-01-01',
      },
    ],
    isLoading: false,
  })),
}));

vi.mock('@/hooks/useUpdateMilestone', () => ({
  useUpdateMilestone: vi.fn(() => ({
    mutate: vi.fn(),
    isPending: false,
  })),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(() => ({
    user: { id: 'user-1' },
  })),
}));

vi.mock('@/lib/supabase', () => ({
  supabase: {},
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe('DrawingComponentSidebar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders field components section', () => {
    render(<DrawingComponentSidebar drawingId="draw-1" />, { wrapper: createWrapper() });

    expect(screen.getByText(/field components/i)).toBeInTheDocument();
    expect(screen.getByText(/GATE_VALVE/)).toBeInTheDocument();
  });

  it('renders BOM reference section', () => {
    render(<DrawingComponentSidebar drawingId="draw-1" />, { wrapper: createWrapper() });

    expect(screen.getByText(/reference/i)).toBeInTheDocument();
  });

  it('shows component count badge', () => {
    render(<DrawingComponentSidebar drawingId="draw-1" />, { wrapper: createWrapper() });

    // The count badge is in a rounded-full span
    const badge = screen.getByText('1', { selector: 'span.rounded-full' });
    expect(badge).toBeInTheDocument();
  });
});
