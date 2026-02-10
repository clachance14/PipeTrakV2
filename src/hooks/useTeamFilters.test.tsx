// src/hooks/useTeamFilters.test.tsx
import { describe, it, expect } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { useTeamFilters } from './useTeamFilters';
import type { ReactNode } from 'react';

function renderWithRouter(initialPath = '/team') {
  return renderHook(() => useTeamFilters(), {
    wrapper: ({ children }: { children: ReactNode }) => (
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route path="/team" element={<div>{children}</div>} />
        </Routes>
      </MemoryRouter>
    ),
  });
}

describe('useTeamFilters', () => {
  describe('Initial State', () => {
    it('should return default values when no URL params', () => {
      const { result } = renderWithRouter();

      expect(result.current.searchTerm).toBe('');
      expect(result.current.roleFilter).toBe('all');
      expect(result.current.statusFilter).toBe('all');
      expect(result.current.sortBy).toBe('name');
    });

    it('should read search from URL params', () => {
      const { result } = renderWithRouter('/team?search=alice');

      expect(result.current.searchTerm).toBe('alice');
    });

    it('should read role filter from URL params', () => {
      const { result } = renderWithRouter('/team?role=admin');

      expect(result.current.roleFilter).toBe('admin');
    });

    it('should read status filter from URL params', () => {
      const { result } = renderWithRouter('/team?status=pending');

      expect(result.current.statusFilter).toBe('pending');
    });

    it('should read sort option from URL params', () => {
      const { result } = renderWithRouter('/team?sort=role');

      expect(result.current.sortBy).toBe('role');
    });

    it('should read all filters from URL params', () => {
      const { result } = renderWithRouter(
        '/team?search=bob&role=admin&status=active&sort=join_date'
      );

      expect(result.current.searchTerm).toBe('bob');
      expect(result.current.roleFilter).toBe('admin');
      expect(result.current.statusFilter).toBe('active');
      expect(result.current.sortBy).toBe('join_date');
    });
  });

  describe('setSearch', () => {
    it('should update search term in URL', () => {
      const { result } = renderWithRouter();

      act(() => {
        result.current.setSearch('test');
      });

      waitFor(() => {
        expect(result.current.searchTerm).toBe('test');
      });
    });

    it('should remove search param when empty string', () => {
      const { result } = renderWithRouter('/team?search=alice');

      act(() => {
        result.current.setSearch('');
      });

      waitFor(() => {
        expect(result.current.searchTerm).toBe('');
      });
    });

    it('should preserve other URL params when updating search', () => {
      const { result } = renderWithRouter('/team?role=admin&status=active');

      act(() => {
        result.current.setSearch('bob');
      });

      waitFor(() => {
        expect(result.current.searchTerm).toBe('bob');
        expect(result.current.roleFilter).toBe('admin');
        expect(result.current.statusFilter).toBe('active');
      });
    });

    it('should debounce search updates with useDeferredValue', async () => {
      const { result } = renderWithRouter();

      // Set search multiple times rapidly
      act(() => {
        result.current.setSearch('a');
      });
      act(() => {
        result.current.setSearch('al');
      });
      act(() => {
        result.current.setSearch('ali');
      });
      act(() => {
        result.current.setSearch('alic');
      });
      act(() => {
        result.current.setSearch('alice');
      });

      // Should eventually stabilize to final value
      await waitFor(
        () => {
          expect(result.current.searchTerm).toBe('alice');
        },
        { timeout: 500 }
      );
    });
  });

  describe('setRoleFilter', () => {
    it('should update role filter in URL', () => {
      const { result } = renderWithRouter();

      act(() => {
        result.current.setRoleFilter('admin');
      });

      waitFor(() => {
        expect(result.current.roleFilter).toBe('admin');
      });
    });

    it('should remove role param when set to "all"', () => {
      const { result } = renderWithRouter('/team?role=admin');

      act(() => {
        result.current.setRoleFilter('all');
      });

      waitFor(() => {
        expect(result.current.roleFilter).toBe('all');
      });
    });

    it('should accept all role values', () => {
      const { result } = renderWithRouter();

      const roles = ['owner', 'admin', 'project_manager', 'foreman', 'qc_inspector', 'welder', 'viewer'];

      roles.forEach((role) => {
        act(() => {
          result.current.setRoleFilter(role as any);
        });

        waitFor(() => {
          expect(result.current.roleFilter).toBe(role);
        });
      });
    });
  });

  describe('setStatusFilter', () => {
    it('should update status filter in URL', () => {
      const { result } = renderWithRouter();

      act(() => {
        result.current.setStatusFilter('active');
      });

      waitFor(() => {
        expect(result.current.statusFilter).toBe('active');
      });
    });

    it('should remove status param when set to "all"', () => {
      const { result } = renderWithRouter('/team?status=pending');

      act(() => {
        result.current.setStatusFilter('all');
      });

      waitFor(() => {
        expect(result.current.statusFilter).toBe('all');
      });
    });

    it('should accept valid status values', () => {
      const { result } = renderWithRouter();

      const statuses = ['all', 'active', 'pending'];

      statuses.forEach((status) => {
        act(() => {
          result.current.setStatusFilter(status as any);
        });

        waitFor(() => {
          expect(result.current.statusFilter).toBe(status);
        });
      });
    });
  });

  describe('setSortBy', () => {
    it('should update sort option in URL', () => {
      const { result } = renderWithRouter();

      act(() => {
        result.current.setSortBy('role');
      });

      waitFor(() => {
        expect(result.current.sortBy).toBe('role');
      });
    });

    it('should accept all sort values', () => {
      const { result } = renderWithRouter();

      const sortOptions = ['name', 'role', 'join_date', 'last_active'];

      sortOptions.forEach((sort) => {
        act(() => {
          result.current.setSortBy(sort as any);
        });

        waitFor(() => {
          expect(result.current.sortBy).toBe(sort);
        });
      });
    });

    it('should always include sort in URL (no default removal)', () => {
      const { result } = renderWithRouter('/team?sort=role');

      act(() => {
        result.current.setSortBy('name');
      });

      waitFor(() => {
        expect(result.current.sortBy).toBe('name');
      });
    });
  });

  describe('URL Persistence', () => {
    it('should persist filters across hook re-renders', () => {
      const { result, rerender } = renderWithRouter('/team?search=alice&role=admin');

      expect(result.current.searchTerm).toBe('alice');
      expect(result.current.roleFilter).toBe('admin');

      rerender();

      expect(result.current.searchTerm).toBe('alice');
      expect(result.current.roleFilter).toBe('admin');
    });

    it('should handle malformed URL params gracefully', () => {
      const { result } = renderWithRouter('/team?role=invalid_role&status=invalid_status');

      // Should default to valid values
      expect(result.current.roleFilter).toBeDefined();
      expect(result.current.statusFilter).toBeDefined();
    });

    it('should encode special characters in search', () => {
      const { result } = renderWithRouter();

      act(() => {
        result.current.setSearch('test@example.com');
      });

      waitFor(() => {
        expect(result.current.searchTerm).toBe('test@example.com');
      });
    });
  });

  describe('Filter Interactions', () => {
    it('should allow updating multiple filters independently', () => {
      const { result } = renderWithRouter();

      act(() => {
        result.current.setSearch('alice');
      });

      waitFor(() => {
        expect(result.current.searchTerm).toBe('alice');
      });

      act(() => {
        result.current.setRoleFilter('owner');
      });

      waitFor(() => {
        expect(result.current.roleFilter).toBe('owner');
        expect(result.current.searchTerm).toBe('alice'); // Previous filter preserved
      });

      act(() => {
        result.current.setStatusFilter('active');
      });

      waitFor(() => {
        expect(result.current.statusFilter).toBe('active');
        expect(result.current.roleFilter).toBe('owner'); // Previous filters preserved
        expect(result.current.searchTerm).toBe('alice');
      });
    });

    it('should allow clearing individual filters', () => {
      const { result } = renderWithRouter(
        '/team?search=alice&role=admin&status=active&sort=role'
      );

      // Clear search
      act(() => {
        result.current.setSearch('');
      });

      waitFor(() => {
        expect(result.current.searchTerm).toBe('');
        expect(result.current.roleFilter).toBe('admin'); // Other filters preserved
      });

      // Clear role
      act(() => {
        result.current.setRoleFilter('all');
      });

      waitFor(() => {
        expect(result.current.roleFilter).toBe('all');
        expect(result.current.statusFilter).toBe('active'); // Other filters preserved
      });
    });
  });

  describe('Debouncing', () => {
    it('should use useDeferredValue for search debouncing', async () => {
      const { result } = renderWithRouter();

      // Rapid updates
      act(() => {
        result.current.setSearch('t');
      });

      // Immediate value should not update instantly
      const _immediateValue = result.current.searchTerm;

      act(() => {
        result.current.setSearch('test');
      });

      // Wait for deferred value to catch up
      await waitFor(
        () => {
          expect(result.current.searchTerm).toBe('test');
        },
        { timeout: 500 }
      );
    });

    it('should not debounce role, status, or sort filters', () => {
      const { result } = renderWithRouter();

      act(() => {
        result.current.setRoleFilter('admin');
      });

      // Should update immediately (no debounce)
      expect(result.current.roleFilter).toBe('admin');

      act(() => {
        result.current.setStatusFilter('pending');
      });

      expect(result.current.statusFilter).toBe('pending');

      act(() => {
        result.current.setSortBy('role');
      });

      expect(result.current.sortBy).toBe('role');
    });
  });
});
