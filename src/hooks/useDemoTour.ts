// Demo Tour Hook
// Feature: 031-one-click-demo-access
// Description: Guided product tour for demo users using react-joyride

import { useState, useEffect, useCallback } from 'react'
import { Step, CallBackProps, STATUS, EVENTS, ACTIONS } from 'react-joyride'

const TOUR_STORAGE_KEY = 'pipetrak:demo-tour-completed'

// Tour step definitions
export const demoTourSteps: Step[] = [
  {
    target: 'body',
    content: 'Welcome to PipeTrak! Let me show you around the demo project. This tour will highlight the key features.',
    placement: 'center',
    disableBeacon: true,
    title: 'Welcome to PipeTrak'
  },
  {
    target: '[data-tour="nav-dashboard"]',
    content: 'The Dashboard gives you a real-time overview of project progress, including completion percentages and milestone tracking.',
    title: 'Dashboard',
    disableBeacon: true
  },
  {
    target: '[data-tour="nav-drawings"]',
    content: 'The Drawings page is your primary workspace. Click here to navigate and see how to track progress.',
    title: 'Drawings',
    spotlightClicks: true
  },
  {
    target: '[data-tour="drawing-row"]',
    content: 'Each drawing shows the drawing number, spec, area, system, test package, and overall progress. This row represents a piping isometric or P&ID.',
    title: 'Drawing Row',
    placement: 'bottom'
  },
  {
    target: '[data-tour="drawing-expand"]',
    content: 'Click the chevron to expand and see all components in this drawing. Try it now!',
    title: 'Expand Drawing',
    spotlightClicks: true,
    placement: 'right'
  },
  {
    target: '[data-tour="component-milestones"]',
    content: 'Each component has milestone checkboxes and percentage inputs. Update progress by checking boxes or entering percentages. Changes save automatically!',
    title: 'Update Progress',
    placement: 'bottom'
  },
  {
    target: '[data-tour="nav-components"]',
    content: 'View and manage all pipe components across all drawings. Track materials, sizes, and progress through fabrication milestones.',
    title: 'Components'
  },
  {
    target: '[data-tour="nav-weld-log"]',
    content: 'The Weld Log tracks all field welds with welder assignments, test results, and completion status.',
    title: 'Weld Log'
  },
  {
    target: '[data-tour="nav-reports"]',
    content: 'Generate PDF and Excel reports for progress tracking, weld logs, and test package status.',
    title: 'Reports'
  },
  {
    target: '[data-tour="nav-packages"]',
    content: 'Test Packages group components for hydro testing and other QC requirements.',
    title: 'Test Packages'
  },
  {
    target: '[data-tour="demo-banner"]',
    content: 'Remember: this is a shared demo environment. Data resets nightly at midnight UTC. Ready to get your own account? Click "Sign Up Free" anytime!',
    title: 'Demo Mode',
    placement: 'bottom'
  }
]

interface UseDemoTourOptions {
  enabled?: boolean
}

export function useDemoTour(options: UseDemoTourOptions = {}) {
  const { enabled = true } = options

  const [run, setRun] = useState(false)
  const [stepIndex, setStepIndex] = useState(0)

  // Check if tour was already completed
  const hasCompletedTour = useCallback(() => {
    try {
      return localStorage.getItem(TOUR_STORAGE_KEY) === 'true'
    } catch {
      return false
    }
  }, [])

  // Mark tour as completed
  const markTourCompleted = useCallback(() => {
    try {
      localStorage.setItem(TOUR_STORAGE_KEY, 'true')
    } catch {
      // Ignore localStorage errors
    }
  }, [])

  // Reset tour (for testing or manual restart)
  const resetTour = useCallback(() => {
    try {
      localStorage.removeItem(TOUR_STORAGE_KEY)
    } catch {
      // Ignore localStorage errors
    }
    setStepIndex(0)
  }, [])

  // Start the tour
  const startTour = useCallback(() => {
    setStepIndex(0)
    setRun(true)
  }, [])

  // Stop the tour
  const stopTour = useCallback(() => {
    setRun(false)
  }, [])

  // Auto-start tour for new demo users
  useEffect(() => {
    if (enabled && !hasCompletedTour()) {
      // Small delay to ensure UI is ready
      const timer = setTimeout(() => {
        setRun(true)
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [enabled, hasCompletedTour])

  // Handle tour callbacks
  const handleJoyrideCallback = useCallback((data: CallBackProps) => {
    const { status, type, index, action } = data

    // Update step index for controlled mode
    if (type === EVENTS.STEP_AFTER) {
      setStepIndex(index + 1)
    }

    // Handle tour completion, skip, or close (X button)
    if (
      status === STATUS.FINISHED ||
      status === STATUS.SKIPPED ||
      action === ACTIONS.CLOSE
    ) {
      setRun(false)
      markTourCompleted()
    }
  }, [markTourCompleted])

  return {
    run,
    stepIndex,
    steps: demoTourSteps,
    handleJoyrideCallback,
    startTour,
    stopTour,
    resetTour,
    hasCompletedTour: hasCompletedTour()
  }
}
