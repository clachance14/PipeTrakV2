import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import { ProfileHeader } from '@/components/profile/ProfileHeader'

// Mock useUpdateProfile hook
vi.mock('@/hooks/useUpdateProfile', () => ({
  useUpdateProfile: vi.fn()
}))

import { useUpdateProfile } from '@/hooks/useUpdateProfile'

describe('ProfileHeader', () => {
  let queryClient: QueryClient
  const mockMutate = vi.fn()

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      }
    })

    // Default mock implementation
    vi.mocked(useUpdateProfile).mockReturnValue({
      mutate: mockMutate,
      isPending: false,
      isSuccess: false,
      isError: false,
      error: null
    } as any)
  })

  const mockUser = {
    id: '123',
    email: 'john@example.com',
    full_name: 'John Doe',
    avatar_url: null,
    organization_id: 'org-123',
    role: 'project_manager',
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
    deleted_at: null
  }

  it('displays user full name', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <ProfileHeader user={mockUser} />
      </QueryClientProvider>
    )

    expect(screen.getByText('John Doe')).toBeInTheDocument()
  })

  it('displays avatar with initial letter when no avatar_url', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <ProfileHeader user={mockUser} />
      </QueryClientProvider>
    )

    // Should show initial letter 'J'
    expect(screen.getByText('J')).toBeInTheDocument()
  })

  it('enters edit mode when edit button is clicked', async () => {
    const user = userEvent.setup()

    render(
      <QueryClientProvider client={queryClient}>
        <ProfileHeader user={mockUser} />
      </QueryClientProvider>
    )

    const editButton = screen.getByRole('button', { name: /edit name/i })
    await user.click(editButton)

    // Should show input field with current name
    const input = screen.getByRole('textbox', { name: /full name/i })
    expect(input).toHaveValue('John Doe')
  })

  it('shows Save and Cancel buttons in edit mode', async () => {
    const user = userEvent.setup()

    render(
      <QueryClientProvider client={queryClient}>
        <ProfileHeader user={mockUser} />
      </QueryClientProvider>
    )

    const editButton = screen.getByRole('button', { name: /edit name/i })
    await user.click(editButton)

    expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
  })

  it('calls useUpdateProfile when Save is clicked', async () => {
    const user = userEvent.setup()

    render(
      <QueryClientProvider client={queryClient}>
        <ProfileHeader user={mockUser} />
      </QueryClientProvider>
    )

    // Enter edit mode
    const editButton = screen.getByRole('button', { name: /edit name/i })
    await user.click(editButton)

    // Change name
    const input = screen.getByRole('textbox', { name: /full name/i })
    await user.clear(input)
    await user.type(input, 'Jane Smith')

    // Click Save
    const saveButton = screen.getByRole('button', { name: /save/i })
    await user.click(saveButton)

    // Should call mutate with new name (first argument)
    expect(mockMutate).toHaveBeenCalled()
    const callArgs = mockMutate.mock.calls[0][0]
    expect(callArgs).toEqual({
      userId: '123',
      fullName: 'Jane Smith'
    })
  })

  it('exits edit mode when Cancel is clicked', async () => {
    const user = userEvent.setup()

    render(
      <QueryClientProvider client={queryClient}>
        <ProfileHeader user={mockUser} />
      </QueryClientProvider>
    )

    // Enter edit mode
    const editButton = screen.getByRole('button', { name: /edit name/i })
    await user.click(editButton)

    // Click Cancel
    const cancelButton = screen.getByRole('button', { name: /cancel/i })
    await user.click(cancelButton)

    // Should exit edit mode and show original name
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    expect(screen.getByText('John Doe')).toBeInTheDocument()
  })

  it('validates name is not empty', async () => {
    const user = userEvent.setup()

    render(
      <QueryClientProvider client={queryClient}>
        <ProfileHeader user={mockUser} />
      </QueryClientProvider>
    )

    // Enter edit mode
    const editButton = screen.getByRole('button', { name: /edit name/i })
    await user.click(editButton)

    // Clear name
    const input = screen.getByRole('textbox', { name: /full name/i })
    await user.clear(input)

    // Click Save
    const saveButton = screen.getByRole('button', { name: /save/i })
    await user.click(saveButton)

    // Should NOT call mutate
    expect(mockMutate).not.toHaveBeenCalled()

    // Should show error message
    expect(screen.getByText(/name cannot be empty/i)).toBeInTheDocument()
  })

  it('trims whitespace from name', async () => {
    const user = userEvent.setup()

    render(
      <QueryClientProvider client={queryClient}>
        <ProfileHeader user={mockUser} />
      </QueryClientProvider>
    )

    // Enter edit mode
    const editButton = screen.getByRole('button', { name: /edit name/i })
    await user.click(editButton)

    // Enter name with whitespace
    const input = screen.getByRole('textbox', { name: /full name/i })
    await user.clear(input)
    await user.type(input, '  Jane Smith  ')

    // Click Save
    const saveButton = screen.getByRole('button', { name: /save/i })
    await user.click(saveButton)

    // Should call mutate with trimmed name (first argument)
    expect(mockMutate).toHaveBeenCalled()
    const callArgs = mockMutate.mock.calls[0][0]
    expect(callArgs).toEqual({
      userId: '123',
      fullName: 'Jane Smith'
    })
  })

  it('handles null full_name', () => {
    const userWithoutName = {
      ...mockUser,
      full_name: null
    }

    render(
      <QueryClientProvider client={queryClient}>
        <ProfileHeader user={userWithoutName} />
      </QueryClientProvider>
    )

    // Should show placeholder
    expect(screen.getByText(/add your name/i)).toBeInTheDocument()
  })
})
