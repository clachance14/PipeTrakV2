import type React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReviewItemCard, ReviewItem } from './ReviewItemCard';
import { WeldCompletedPayload } from '@/types/needs-review';

// Mock PermissionGate to always render children
vi.mock('@/components/PermissionGate', () => ({
  PermissionGate: ({ children }: { children: React.ReactNode }) => <>{children}</>
}));

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } }
});

const Wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>
    {children}
  </QueryClientProvider>
);

describe('ReviewItemCard - weld_completed rendering', () => {
  describe('Full payload rendering', () => {
    it('renders weld_completed review with all details including welder name', () => {
      const payload: WeldCompletedPayload = {
        weld_id: 'weld-123',
        weld_number: 'W-051',
        component_id: 'comp-123',
        drawing_number: 'DWG-001',
        welder_id: 'welder-123',
        welder_name: 'John Smith',
        date_welded: '2025-11-20',
        weld_type: 'BW',
        nde_required: true
      };

      const item: ReviewItem = {
        id: 'review-1',
        type: 'weld_completed',
        description: 'Weld completed',
        ageInDays: 0,
        ageColorClass: 'text-gray-600',
        payload,
        createdAt: '2025-11-20T10:00:00Z'
      };

      render(
        <Wrapper>
          <ReviewItemCard item={item} onResolve={vi.fn()} />
        </Wrapper>
      );

      // Check weld number is displayed prominently
      expect(screen.getByText('W-051')).toBeInTheDocument();

      // Check drawing number is displayed
      expect(screen.getByText(/DWG-001/)).toBeInTheDocument();

      // Check welder name is displayed
      expect(screen.getByText(/John Smith/)).toBeInTheDocument();

      // Check date is displayed (format: M/D/YYYY)
      expect(screen.getByText(/11\/20\/2025/)).toBeInTheDocument();

      // Check NDE Required badge is displayed
      expect(screen.getByText('NDE Required')).toBeInTheDocument();

      // Check type badge
      expect(screen.getByText('Weld Completed')).toBeInTheDocument();
    });

    it('displays weld_completed with NDE required badge in correct style', () => {
      const payload: WeldCompletedPayload = {
        weld_id: 'weld-124',
        weld_number: 'W-052',
        component_id: 'comp-124',
        drawing_number: 'DWG-002',
        welder_id: 'welder-124',
        welder_name: 'Jane Doe',
        date_welded: '2025-11-19',
        weld_type: 'SW',
        nde_required: true
      };

      const item: ReviewItem = {
        id: 'review-2',
        type: 'weld_completed',
        description: 'Weld completed',
        ageInDays: 1,
        ageColorClass: 'text-amber-600',
        payload,
        createdAt: '2025-11-19T10:00:00Z'
      };

      render(
        <Wrapper>
          <ReviewItemCard item={item} onResolve={vi.fn()} />
        </Wrapper>
      );

      const ndeBadge = screen.getByText('NDE Required');
      expect(ndeBadge).toBeInTheDocument();

      // Check badge has correct styling classes
      expect(ndeBadge.className).toContain('bg-yellow-50');
      expect(ndeBadge.className).toContain('text-yellow-800');
    });
  });

  describe('Null welder handling', () => {
    it('renders weld_completed without welder name when welder_id is null', () => {
      const payload: WeldCompletedPayload = {
        weld_id: 'weld-125',
        weld_number: 'W-053',
        component_id: 'comp-125',
        drawing_number: 'DWG-003',
        welder_id: null,
        welder_name: null,
        date_welded: '2025-11-20',
        weld_type: 'FW',
        nde_required: false
      };

      const item: ReviewItem = {
        id: 'review-3',
        type: 'weld_completed',
        description: 'Weld completed',
        ageInDays: 0,
        ageColorClass: 'text-gray-600',
        payload,
        createdAt: '2025-11-20T10:00:00Z'
      };

      render(
        <Wrapper>
          <ReviewItemCard item={item} onResolve={vi.fn()} />
        </Wrapper>
      );

      // Check weld number is displayed
      expect(screen.getByText('W-053')).toBeInTheDocument();

      // Check drawing number is displayed
      expect(screen.getByText(/DWG-003/)).toBeInTheDocument();

      // Check date is displayed
      expect(screen.getByText(/11\/20\/2025/)).toBeInTheDocument();

      // Check that "by" text is NOT displayed (no welder name)
      const text = screen.getByText(/Completed on/);
      expect(text.textContent).not.toContain('by');
    });

    it('does not render NDE badge when nde_required is false', () => {
      const payload: WeldCompletedPayload = {
        weld_id: 'weld-126',
        weld_number: 'W-054',
        component_id: 'comp-126',
        drawing_number: 'DWG-004',
        welder_id: null,
        welder_name: null,
        date_welded: '2025-11-20',
        weld_type: 'TW',
        nde_required: false
      };

      const item: ReviewItem = {
        id: 'review-4',
        type: 'weld_completed',
        description: 'Weld completed',
        ageInDays: 0,
        ageColorClass: 'text-gray-600',
        payload,
        createdAt: '2025-11-20T10:00:00Z'
      };

      render(
        <Wrapper>
          <ReviewItemCard item={item} onResolve={vi.fn()} />
        </Wrapper>
      );

      // Check NDE Required badge is NOT displayed
      expect(screen.queryByText('NDE Required')).not.toBeInTheDocument();
    });
  });

  describe('NDE badge conditional display', () => {
    it('shows NDE badge when nde_required is true', () => {
      const payload: WeldCompletedPayload = {
        weld_id: 'weld-127',
        weld_number: 'W-055',
        component_id: 'comp-127',
        drawing_number: 'DWG-005',
        welder_id: 'welder-127',
        welder_name: 'Bob Johnson',
        date_welded: '2025-11-20',
        weld_type: 'BW',
        nde_required: true
      };

      const item: ReviewItem = {
        id: 'review-5',
        type: 'weld_completed',
        description: 'Weld completed',
        ageInDays: 0,
        ageColorClass: 'text-gray-600',
        payload,
        createdAt: '2025-11-20T10:00:00Z'
      };

      render(
        <Wrapper>
          <ReviewItemCard item={item} onResolve={vi.fn()} />
        </Wrapper>
      );

      expect(screen.getByText('NDE Required')).toBeInTheDocument();
    });

    it('does not show NDE badge when nde_required is false', () => {
      const payload: WeldCompletedPayload = {
        weld_id: 'weld-128',
        weld_number: 'W-056',
        component_id: 'comp-128',
        drawing_number: 'DWG-006',
        welder_id: 'welder-128',
        welder_name: 'Alice Cooper',
        date_welded: '2025-11-20',
        weld_type: 'SW',
        nde_required: false
      };

      const item: ReviewItem = {
        id: 'review-6',
        type: 'weld_completed',
        description: 'Weld completed',
        ageInDays: 0,
        ageColorClass: 'text-gray-600',
        payload,
        createdAt: '2025-11-20T10:00:00Z'
      };

      render(
        <Wrapper>
          <ReviewItemCard item={item} onResolve={vi.fn()} />
        </Wrapper>
      );

      expect(screen.queryByText('NDE Required')).not.toBeInTheDocument();
    });
  });

  describe('Age display', () => {
    it('displays "Today" for items created today', () => {
      const payload: WeldCompletedPayload = {
        weld_id: 'weld-129',
        weld_number: 'W-057',
        component_id: 'comp-129',
        drawing_number: 'DWG-007',
        welder_id: 'welder-129',
        welder_name: 'Charlie Brown',
        date_welded: '2025-11-20',
        weld_type: 'BW',
        nde_required: false
      };

      const item: ReviewItem = {
        id: 'review-7',
        type: 'weld_completed',
        description: 'Weld completed',
        ageInDays: 0,
        ageColorClass: 'text-gray-600',
        payload,
        createdAt: '2025-11-20T10:00:00Z'
      };

      render(
        <Wrapper>
          <ReviewItemCard item={item} onResolve={vi.fn()} />
        </Wrapper>
      );

      expect(screen.getByText('Today')).toBeInTheDocument();
    });

    it('displays days ago for older items', () => {
      const payload: WeldCompletedPayload = {
        weld_id: 'weld-130',
        weld_number: 'W-058',
        component_id: 'comp-130',
        drawing_number: 'DWG-008',
        welder_id: 'welder-130',
        welder_name: 'Diana Prince',
        date_welded: '2025-11-17',
        weld_type: 'SW',
        nde_required: true
      };

      const item: ReviewItem = {
        id: 'review-8',
        type: 'weld_completed',
        description: 'Weld completed',
        ageInDays: 3,
        ageColorClass: 'text-red-600',
        payload,
        createdAt: '2025-11-17T10:00:00Z'
      };

      render(
        <Wrapper>
          <ReviewItemCard item={item} onResolve={vi.fn()} />
        </Wrapper>
      );

      expect(screen.getByText('3 days ago')).toBeInTheDocument();
    });
  });

  describe('Review created timestamp', () => {
    it('displays the review creation timestamp', () => {
      const payload: WeldCompletedPayload = {
        weld_id: 'weld-131',
        weld_number: 'W-059',
        component_id: 'comp-131',
        drawing_number: 'DWG-009',
        welder_id: 'welder-131',
        welder_name: 'Eve Adams',
        date_welded: '2025-11-20',
        weld_type: 'FW',
        nde_required: false
      };

      const item: ReviewItem = {
        id: 'review-9',
        type: 'weld_completed',
        description: 'Weld completed',
        ageInDays: 0,
        ageColorClass: 'text-gray-600',
        payload,
        createdAt: '2025-11-20T14:30:00Z'
      };

      render(
        <Wrapper>
          <ReviewItemCard item={item} onResolve={vi.fn()} />
        </Wrapper>
      );

      // Check that "Review created:" text is present
      expect(screen.getByText(/Review created:/)).toBeInTheDocument();
    });
  });

  describe('Conditional button rendering', () => {
    it('shows "Record NDE" button for weld_completed with nde_required=true when onRecordNDE provided', () => {
      const payload: WeldCompletedPayload = {
        weld_id: 'weld-200',
        weld_number: 'W-100',
        component_id: 'comp-200',
        drawing_number: 'DWG-100',
        welder_id: 'welder-200',
        welder_name: 'Test Welder',
        date_welded: '2025-11-20',
        weld_type: 'BW',
        nde_required: true
      };

      const item: ReviewItem = {
        id: 'review-200',
        type: 'weld_completed',
        description: 'Weld completed',
        ageInDays: 0,
        ageColorClass: 'text-gray-600',
        payload,
        createdAt: '2025-11-20T10:00:00Z'
      };

      const mockOnRecordNDE = vi.fn();

      render(
        <Wrapper>
          <ReviewItemCard
            item={item}
            onResolve={vi.fn()}
            onRecordNDE={mockOnRecordNDE}
          />
        </Wrapper>
      );

      // Should show "Record NDE" instead of "Resolve"
      expect(screen.getByRole('button', { name: /Record NDE/i })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /^Resolve$/i })).not.toBeInTheDocument();
    });

    it('shows "Record NDE" button for weld_completed even with nde_required=false', () => {
      const payload: WeldCompletedPayload = {
        weld_id: 'weld-201',
        weld_number: 'W-101',
        component_id: 'comp-201',
        drawing_number: 'DWG-101',
        welder_id: 'welder-201',
        welder_name: 'Test Welder',
        date_welded: '2025-11-20',
        weld_type: 'BW',
        nde_required: false
      };

      const item: ReviewItem = {
        id: 'review-201',
        type: 'weld_completed',
        description: 'Weld completed',
        ageInDays: 0,
        ageColorClass: 'text-gray-600',
        payload,
        createdAt: '2025-11-20T10:00:00Z'
      };

      const mockOnRecordNDE = vi.fn();

      render(
        <Wrapper>
          <ReviewItemCard
            item={item}
            onResolve={vi.fn()}
            onRecordNDE={mockOnRecordNDE}
          />
        </Wrapper>
      );

      // Should show "Record NDE" for all weld_completed items regardless of nde_required
      expect(screen.getByRole('button', { name: /Record NDE/i })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /^Resolve$/i })).not.toBeInTheDocument();
    });

    it('shows "View NDE" button when current_nde_result exists and onViewNDE provided', () => {
      const payload: WeldCompletedPayload = {
        weld_id: 'weld-202',
        weld_number: 'W-102',
        component_id: 'comp-202',
        drawing_number: 'DWG-102',
        welder_id: 'welder-202',
        welder_name: 'Test Welder',
        date_welded: '2025-11-20',
        weld_type: 'BW',
        nde_required: true,
        current_nde_result: 'PASS',
        current_nde_type: 'RT'
      };

      const item: ReviewItem = {
        id: 'review-202',
        type: 'weld_completed',
        description: 'Weld completed',
        ageInDays: 0,
        ageColorClass: 'text-gray-600',
        payload,
        createdAt: '2025-11-20T10:00:00Z'
      };

      const mockOnViewNDE = vi.fn();

      render(
        <Wrapper>
          <ReviewItemCard
            item={item}
            onResolve={vi.fn()}
            onViewNDE={mockOnViewNDE}
          />
        </Wrapper>
      );

      // Should show "View NDE" instead of "Resolve"
      expect(screen.getByRole('button', { name: /View NDE/i })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /^Resolve$/i })).not.toBeInTheDocument();
    });

    it('shows "Resolve" button for non-weld_completed types', () => {
      const item: ReviewItem = {
        id: 'review-203',
        type: 'out_of_sequence',
        description: 'Component installed out of sequence',
        ageInDays: 1,
        ageColorClass: 'text-amber-600',
        payload: { description: 'Test' },
        createdAt: '2025-11-19T10:00:00Z'
      };

      render(
        <Wrapper>
          <ReviewItemCard
            item={item}
            onResolve={vi.fn()}
            onRecordNDE={vi.fn()}
          />
        </Wrapper>
      );

      // Should show "Resolve" for non-weld_completed types
      expect(screen.getByRole('button', { name: /Resolve/i })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Record NDE/i })).not.toBeInTheDocument();
    });

    it('falls back to "Resolve" button when callbacks not provided', () => {
      const payload: WeldCompletedPayload = {
        weld_id: 'weld-204',
        weld_number: 'W-104',
        component_id: 'comp-204',
        drawing_number: 'DWG-104',
        welder_id: 'welder-204',
        welder_name: 'Test Welder',
        date_welded: '2025-11-20',
        weld_type: 'BW',
        nde_required: true
      };

      const item: ReviewItem = {
        id: 'review-204',
        type: 'weld_completed',
        description: 'Weld completed',
        ageInDays: 0,
        ageColorClass: 'text-gray-600',
        payload,
        createdAt: '2025-11-20T10:00:00Z'
      };

      render(
        <Wrapper>
          <ReviewItemCard item={item} onResolve={vi.fn()} />
        </Wrapper>
      );

      // Should fall back to "Resolve" when no special callbacks provided
      expect(screen.getByRole('button', { name: /Resolve/i })).toBeInTheDocument();
    });

    it('calls onRecordNDE with correct arguments when Record NDE clicked', async () => {
      const payload: WeldCompletedPayload = {
        weld_id: 'weld-205',
        weld_number: 'W-105',
        component_id: 'comp-205',
        drawing_number: 'DWG-105',
        welder_id: 'welder-205',
        welder_name: 'Test Welder',
        date_welded: '2025-11-20',
        weld_type: 'BW',
        nde_required: true
      };

      const item: ReviewItem = {
        id: 'review-205',
        type: 'weld_completed',
        description: 'Weld completed',
        ageInDays: 0,
        ageColorClass: 'text-gray-600',
        payload,
        createdAt: '2025-11-20T10:00:00Z'
      };

      const mockOnRecordNDE = vi.fn();

      const { default: userEvent } = await import('@testing-library/user-event');
      const user = userEvent.setup();

      render(
        <Wrapper>
          <ReviewItemCard
            item={item}
            onResolve={vi.fn()}
            onRecordNDE={mockOnRecordNDE}
          />
        </Wrapper>
      );

      await user.click(screen.getByRole('button', { name: /Record NDE/i }));

      expect(mockOnRecordNDE).toHaveBeenCalledTimes(1);
      expect(mockOnRecordNDE).toHaveBeenCalledWith('review-205', payload);
    });
  });
});
