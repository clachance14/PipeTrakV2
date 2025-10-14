import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Register } from './Register'

const queryClient = new QueryClient()

describe('Register', () => {
  it('renders registration page with title', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Register />
        </BrowserRouter>
      </QueryClientProvider>
    )

    expect(screen.getByText(/create your pipetrak account/i)).toBeInTheDocument()
    expect(screen.getByText(/already have an account/i)).toBeInTheDocument()
  })
})
