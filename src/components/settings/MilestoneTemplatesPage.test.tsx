/**
 * Tests for MilestoneTemplatesPage component (Feature 026 - US1)
 * Main settings page for viewing and managing milestone templates
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MilestoneTemplatesPage } from './MilestoneTemplatesPage'
import { createElement, type ReactNode } from 'react'

// Mock AuthContext
const mockUser = {
  id: 'test-user-id',
  email: 'test@example.com',
  role: 'admin'
}

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(() => ({
    user: mockUser,
    session: { access_token: 'test-token' },
    loading: false
  }))
}))

// Mock useProjectTemplates hook
let mockUseProjectTemplatesReturn = {
  data: undefined,
  isLoading: false,
  error: null
}

vi.mock('@/hooks/useProjectTemplates', () => ({
  useProjectTemplates: vi.fn(() => mockUseProjectTemplatesReturn)
}))

// Mock useCloneTemplates hook
vi.mock('@/hooks/useCloneTemplates', () => ({
  useCloneTemplates: vi.fn(() => ({
    mutate: vi.fn(),
    isPending: false
  }))
}))

// Test wrapper with QueryClient
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  })

  return ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children)
}

describe('MilestoneTemplatesPage', () => {
  beforeEach(() => {
    // Reset mocks before each test
    mockUseProjectTemplatesReturn = {
      data: undefined,
      isLoading: false,
      error: null
    }
  })

  it('renders page title', () => {
    render(
      <MilestoneTemplatesPage projectId="test-project-id" />,
      { wrapper: createWrapper() }
    )

    expect(screen.getByText(/milestone templates/i)).toBeInTheDocument()
  })

  it('shows CloneTemplatesBanner when no templates exist', () => {
    render(
      <MilestoneTemplatesPage projectId="test-project-id" />,
      { wrapper: createWrapper() }
    )

    // Should show banner prompting to clone templates
    expect(screen.getByText(/clone templates to get started/i)).toBeInTheDocument()
  })

  it('displays grid of component type cards when templates exist', () => {
    mockUseProjectTemplatesReturn = {
      data: [
        { component_type: 'Field Weld', id: '1', milestone_name: 'Fit-Up', weight: 10 },
        { component_type: 'Field Weld', id: '2', milestone_name: 'Weld Made', weight: 60 },
        { component_type: 'Spool', id: '3', milestone_name: 'Receive', weight: 20 }
      ],
      isLoading: false,
      error: null
    }

    render(
      <MilestoneTemplatesPage projectId="test-project-id" />,
      { wrapper: createWrapper() }
    )

    // Should show cards for each component type
    expect(screen.getByText('Field Weld')).toBeInTheDocument()
    expect(screen.getByText('Spool')).toBeInTheDocument()
  })

  it('shows loading state while fetching templates', () => {
    mockUseProjectTemplatesReturn = {
      data: undefined,
      isLoading: true,
      error: null
    }

    render(
      <MilestoneTemplatesPage projectId="test-project-id" />,
      { wrapper: createWrapper() }
    )

    expect(screen.getByText(/loading/i)).toBeInTheDocument()
  })

  it('shows error message when fetch fails', () => {
    mockUseProjectTemplatesReturn = {
      data: undefined,
      isLoading: false,
      error: new Error('Failed to fetch templates')
    }

    render(
      <MilestoneTemplatesPage projectId="test-project-id" />,
      { wrapper: createWrapper() }
    )

    expect(screen.getByText(/error/i)).toBeInTheDocument()
  })
})
