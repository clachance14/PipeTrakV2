import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { RoleBasedRedirect } from './RoleBasedRedirect'

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

describe('RoleBasedRedirect', () => {
  it('redirects owner to root', () => {
    render(
      <BrowserRouter>
        <RoleBasedRedirect role="owner" />
      </BrowserRouter>
    )

    expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true })
  })

  it('redirects foreman to root', () => {
    render(
      <BrowserRouter>
        <RoleBasedRedirect role="foreman" />
      </BrowserRouter>
    )

    expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true })
  })
})
