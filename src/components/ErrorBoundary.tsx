/**
 * ErrorBoundary Component
 *
 * Feature: 020-component-metadata-editing
 * Task: T058 - Add error boundary for modal
 * Date: 2025-10-29
 *
 * React error boundary that catches JavaScript errors anywhere in the component tree,
 * logs the error, and displays a fallback UI instead of crashing the entire app.
 *
 * Usage:
 * ```tsx
 * <ErrorBoundary>
 *   <YourComponent />
 * </ErrorBoundary>
 * ```
 */

import React, { Component, ReactNode } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'

interface ErrorBoundaryProps {
  /** Child components to render */
  children: ReactNode
  /** Optional custom fallback UI */
  fallback?: (error: Error, resetError: () => void) => ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

/**
 * ErrorBoundary Component
 *
 * Catches errors in child components and displays a fallback UI.
 * Provides a "Try again" button to reset the error state and retry rendering.
 *
 * @example
 * ```tsx
 * <ErrorBoundary>
 *   <ComponentMetadataModal {...props} />
 * </ErrorBoundary>
 * ```
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = {
      hasError: false,
      error: null
    }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    // Update state so next render shows fallback UI
    return {
      hasError: true,
      error
    }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error to console (in production, send to error tracking service)
    console.error('ErrorBoundary caught an error:', error, errorInfo)
  }

  resetError = () => {
    this.setState({
      hasError: false,
      error: null
    })
  }

  render() {
    if (this.state.hasError && this.state.error) {
      // Render custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.resetError)
      }

      // Default fallback UI
      return (
        <Alert variant="destructive" className="m-4">
          <AlertDescription className="space-y-4">
            <div>
              <div className="font-semibold mb-2">Something went wrong</div>
              <div className="text-sm text-muted-foreground">
                {this.state.error.message}
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={this.resetError}
            >
              Try again
            </Button>
          </AlertDescription>
        </Alert>
      )
    }

    return this.props.children
  }
}
