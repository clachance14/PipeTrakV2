// Demo Tour Hook
// Feature: 031-one-click-demo-access
// Description: Guided product tour for demo users using react-joyride

import { useState, useEffect, useCallback } from 'react'
import { Step, CallBackProps, STATUS, EVENTS } from 'react-joyride'

const TOUR_STORAGE_KEY = 'pipetrak:demo-tour-completed'
const TOUR_STEP_KEY = 'pipetrak:demo-tour-step'
const TOUR_ADVANCE_EVENT = 'pipetrak:tour-advance'

// Step indices for auto-advance logic
const DRAWINGS_NAV_STEP = 2 // "Click here to navigate to Drawings"
const EXPAND_DRAWING_STEP = 4 // "Click the chevron to expand"

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
    target: '[data-tour-spool="spool-component"]',
    content: 'Spools track fabrication progress with discrete milestones. Check boxes like Fabricate, Install, and Connect as each step is completed. Try checking one now!',
    title: 'Spool Progress',
    placement: 'bottom',
    spotlightClicks: true
  },
  {
    target: '[data-tour-field-weld="field-weld-component"]',
    content: 'Field welds require welder assignment. When you check "Weld Made", a dialog opens to select the welder who performed the weld. Try it now!',
    title: 'Field Weld Tracking',
    placement: 'bottom',
    spotlightClicks: true
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

  // Initialize step index from localStorage to resume where user left off
  const [stepIndex, setStepIndex] = useState(() => {
    try {
      const saved = localStorage.getItem(TOUR_STEP_KEY)
      return saved ? parseInt(saved, 10) : 0
    } catch {
      return 0
    }
  })

  // Check if tour was already completed
  const hasCompletedTour = useCallback(() => {
    try {
      return localStorage.getItem(TOUR_STORAGE_KEY) === 'true'
    } catch {
      return false
    }
  }, [])

  // Save current step to localStorage
  const saveStepIndex = useCallback((index: number) => {
    try {
      localStorage.setItem(TOUR_STEP_KEY, String(index))
    } catch {
      // Ignore localStorage errors
    }
  }, [])

  // Mark tour as completed and clear step progress
  const markTourCompleted = useCallback(() => {
    try {
      localStorage.setItem(TOUR_STORAGE_KEY, 'true')
      localStorage.removeItem(TOUR_STEP_KEY)
    } catch {
      // Ignore localStorage errors
    }
  }, [])

  // Reset tour (for testing or manual restart)
  const resetTour = useCallback(() => {
    try {
      localStorage.removeItem(TOUR_STORAGE_KEY)
      localStorage.removeItem(TOUR_STEP_KEY)
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

  // Listen for custom advance event (e.g., when user clicks nav or expands a drawing)
  useEffect(() => {
    const handleAdvance = () => {
      // Only auto-advance if tour is running and on specific interactive steps
      const autoAdvanceSteps = [DRAWINGS_NAV_STEP, EXPAND_DRAWING_STEP]
      if (run && autoAdvanceSteps.includes(stepIndex)) {
        const nextIndex = stepIndex + 1
        setStepIndex(nextIndex)
        saveStepIndex(nextIndex)
      }
    }

    window.addEventListener(TOUR_ADVANCE_EVENT, handleAdvance)
    return () => window.removeEventListener(TOUR_ADVANCE_EVENT, handleAdvance)
  }, [run, stepIndex, saveStepIndex])

  // Handle tour callbacks
  const handleJoyrideCallback = useCallback((data: CallBackProps) => {
    const { status, type, index } = data

    // Update step index for controlled mode and persist to localStorage
    if (type === EVENTS.STEP_AFTER) {
      const nextIndex = index + 1
      setStepIndex(nextIndex)
      saveStepIndex(nextIndex)
    }

    // Handle tour completion, skip, or close (X button)
    // STATUS.PAUSED is set when user clicks the close (X) button
    if (
      status === STATUS.FINISHED ||
      status === STATUS.SKIPPED ||
      status === STATUS.PAUSED
    ) {
      setRun(false)
      markTourCompleted()
    }
  }, [markTourCompleted, saveStepIndex])

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

/**
 * Dispatch event to advance the tour (call when user completes an action)
 * Used by components to signal the tour should advance after user interaction
 */
export function advanceDemoTour() {
  window.dispatchEvent(new CustomEvent(TOUR_ADVANCE_EVENT))
}
