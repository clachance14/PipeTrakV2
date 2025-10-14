import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useOrganization } from '@/hooks/useOrganization';

// Mock Supabase auth
vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'test-user-id' } }, error: null }),
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
      update: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      range: vi.fn().mockResolvedValue({ data: [], error: null, count: 0 }),
    })),
  },
}));

describe('useOrganization Hook Contract', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  describe('API Surface', () => {
    it('should export useCurrentOrganization function', () => {
      const { result } = renderHook(() => useOrganization(), { wrapper });
      expect(result.current).toHaveProperty('useCurrentOrganization');
      expect(typeof result.current.useCurrentOrganization).toBe('function');
    });

    it('should NOT export useUserOrganizations (multi-org removed)', () => {
      const { result } = renderHook(() => useOrganization(), { wrapper });
      expect(result.current).not.toHaveProperty('useUserOrganizations');
    });

    it('should NOT export switchOrganizationMutation (multi-org removed)', () => {
      const { result } = renderHook(() => useOrganization(), { wrapper });
      expect(result.current).not.toHaveProperty('switchOrganizationMutation');
    });

    it('should NOT export leaveOrganizationMutation (cannot leave only org)', () => {
      const { result } = renderHook(() => useOrganization(), { wrapper });
      expect(result.current).not.toHaveProperty('leaveOrganizationMutation');
    });

    it('should export useOrgMembers function (unchanged)', () => {
      const { result } = renderHook(() => useOrganization(), { wrapper });
      expect(result.current).toHaveProperty('useOrgMembers');
      expect(typeof result.current.useOrgMembers).toBe('function');
    });

    it('should export updateMemberRoleMutation (unchanged)', () => {
      const { result } = renderHook(() => useOrganization(), { wrapper });
      expect(result.current).toHaveProperty('updateMemberRoleMutation');
    });

    it('should export removeMemberMutation (unchanged)', () => {
      const { result } = renderHook(() => useOrganization(), { wrapper });
      expect(result.current).toHaveProperty('removeMemberMutation');
    });
  });
});
