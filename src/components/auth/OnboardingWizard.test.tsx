import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router-dom'
import { OnboardingWizard } from './OnboardingWizard'

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

const renderWizard = () => {
  return render(
    <BrowserRouter>
      <OnboardingWizard />
    </BrowserRouter>
  )
}

describe('OnboardingWizard', () => {
  it('renders step 1 initially', () => {
    renderWizard()

    expect(screen.getByText('Organization Settings')).toBeInTheDocument()
    expect(screen.getByLabelText(/organization logo/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/industry/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/timezone/i)).toBeInTheDocument()
  })

  it('navigates to step 2 when Next is clicked', async () => {
    const user = userEvent.setup()
    renderWizard()

    await user.click(screen.getByRole('button', { name: /next/i }))

    expect(screen.getByText(/create your first project/i)).toBeInTheDocument()
  })

  it('allows navigation back to step 1', async () => {
    const user = userEvent.setup()
    renderWizard()

    // Go to step 2
    await user.click(screen.getByRole('button', { name: /next/i }))

    // Go back to step 1
    await user.click(screen.getByRole('button', { name: /back/i }))

    expect(screen.getByText('Organization Settings')).toBeInTheDocument()
  })

  it('allows skipping step 2', async () => {
    const user = userEvent.setup()
    renderWizard()

    // Go to step 2
    await user.click(screen.getByRole('button', { name: /next/i }))

    // Skip to step 3
    await user.click(screen.getByRole('button', { name: /skip/i }))

    expect(screen.getByText(/invite your team/i)).toBeInTheDocument()
  })

  it('completes wizard and navigates to dashboard', async () => {
    const user = userEvent.setup()
    renderWizard()

    // Navigate through all steps
    await user.click(screen.getByRole('button', { name: /next/i })) // To step 2
    await user.click(screen.getByRole('button', { name: /next/i })) // To step 3
    await user.click(screen.getByRole('button', { name: /complete setup/i }))

    expect(mockNavigate).toHaveBeenCalledWith('/')
  })

  it('allows skipping entire setup', async () => {
    const user = userEvent.setup()
    renderWizard()

    await user.click(screen.getByRole('button', { name: /skip setup/i }))

    expect(mockNavigate).toHaveBeenCalledWith('/')
  })
})
