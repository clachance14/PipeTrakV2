// src/hooks/useTeamFilters.ts
import { useSearchParams } from 'react-router-dom';
import { useDeferredValue } from 'react';
import type { Role } from '@/types/team.types';

export function useTeamFilters() {
  const [searchParams, setSearchParams] = useSearchParams();

  const searchTerm = searchParams.get('search') || '';
  const roleFilter = (searchParams.get('role') as Role | 'all') || 'all';
  const statusFilter = (searchParams.get('status') as 'all' | 'active' | 'pending') || 'all';
  const sortBy = (searchParams.get('sort') as 'name' | 'role' | 'join_date' | 'last_active') || 'name';

  // Debounce search with useDeferredValue (React 18)
  const deferredSearchTerm = useDeferredValue(searchTerm);

  const setSearch = (term: string) => {
    setSearchParams(prev => {
      if (term) prev.set('search', term);
      else prev.delete('search');
      return prev;
    });
  };

  const setRoleFilter = (role: Role | 'all') => {
    setSearchParams(prev => {
      if (role !== 'all') prev.set('role', role);
      else prev.delete('role');
      return prev;
    });
  };

  const setStatusFilter = (status: 'all' | 'active' | 'pending') => {
    setSearchParams(prev => {
      if (status !== 'all') prev.set('status', status);
      else prev.delete('status');
      return prev;
    });
  };

  const setSortBy = (sort: 'name' | 'role' | 'join_date' | 'last_active') => {
    setSearchParams(prev => {
      prev.set('sort', sort);
      return prev;
    });
  };

  return {
    searchTerm: deferredSearchTerm,
    roleFilter,
    statusFilter,
    sortBy,
    setSearch,
    setRoleFilter,
    setStatusFilter,
    setSortBy,
  };
}
