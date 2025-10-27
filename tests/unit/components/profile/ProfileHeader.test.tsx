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

// Mock useUpdateAvatar hook
vi.mock('@/hooks/useUpdateAvatar', () => ({
  useUpdateAvatar: vi.fn()
}))

import { useUpdateProfile } from '@/hooks/useUpdateProfile'
import { useUpdateAvatar } from '@/hooks/useUpdateAvatar'

describe('ProfileHeader', () => {
  let queryClient: QueryClient
  const mockMutate = vi.fn()
  const mockAvatarMutate = vi.fn()

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      }
    })

    // Mock useUpdateProfile
    vi.mocked(useUpdateProfile).mockReturnValue({
      mutate: mockMutate,
      isPending: false,
      isSuccess: false,
      isError: false,
      error: null
    } as any)

    // Mock useUpdateAvatar
    vi.mocked(useUpdateAvatar).mockReturnValue({
      mutate: mockAvatarMutate,
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

  // Avatar upload tests (T033)
  describe('Avatar Upload', () => {
    it('shows file input for avatar upload', () => {
      render(
        <QueryClientProvider client={queryClient}>
          <ProfileHeader user={mockUser} />
        </QueryClientProvider>
      )

      const fileInput = screen.getByLabelText(/upload.*photo/i)
      expect(fileInput).toBeInTheDocument()
      expect(fileInput).toHaveAttribute('type', 'file')
      expect(fileInput).toHaveAttribute('accept', 'image/jpeg,image/png,image/webp')
    })

    it('calls useUpdateAvatar when valid file is selected', async () => {
      const user = userEvent.setup()

      render(
        <QueryClientProvider client={queryClient}>
          <ProfileHeader user={mockUser} />
        </QueryClientProvider>
      )

      const fileInput = screen.getByLabelText(/upload.*photo/i)
      const file = new File(['avatar'], 'avatar.png', { type: 'image/png' })

      await user.upload(fileInput, file)

      expect(mockAvatarMutate).toHaveBeenCalledWith({
        userId: '123',
        file: expect.any(File)
      })
    })

    it('shows error for invalid file type', async () => {
      const user = userEvent.setup()

      render(
        <QueryClientProvider client={queryClient}>
          <ProfileHeader user={mockUser} />
        </QueryClientProvider>
      )

      const fileInput = screen.getByLabelText(/upload.*photo/i)
      const file = new File(['document'], 'document.pdf', { type: 'application/pdf' })

      await user.upload(fileInput, file)

      // Should not call mutate
      expect(mockAvatarMutate).not.toHaveBeenCalled()

      // Should show error message
      expect(screen.getByText(/invalid file type/i)).toBeInTheDocument()
    })

    it('shows error for file too large', async () => {
      const user = userEvent.setup()

      render(
        <QueryClientProvider client={queryClient}>
          <ProfileHeader user={mockUser} />
        </QueryClientProvider>
      )

      const fileInput = screen.getByLabelText(/upload.*photo/i)
      // Create a file larger than 2MB
      const largeContent = new Array(3 * 1024 * 1024).fill('a').join('')
      const file = new File([largeContent], 'large.png', { type: 'image/png' })

      await user.upload(fileInput, file)

      // Should not call mutate
      expect(mockAvatarMutate).not.toHaveBeenCalled()

      // Should show error message
      expect(screen.getByText(/file too large/i)).toBeInTheDocument()
    })

    it('shows upload progress indicator', async () => {
      vi.mocked(useUpdateAvatar).mockReturnValue({
        mutate: mockAvatarMutate,
        isPending: true,
        isSuccess: false,
        isError: false,
        error: null
      } as any)

      render(
        <QueryClientProvider client={queryClient}>
          <ProfileHeader user={mockUser} />
        </QueryClientProvider>
      )

      // Should show uploading indicator
      expect(screen.getByText(/uploading/i)).toBeInTheDocument()
    })
  })
})
