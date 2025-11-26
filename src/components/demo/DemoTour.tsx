// Demo Tour Component
// Feature: 031-one-click-demo-access
// Description: Guided product tour for demo users

import Joyride from 'react-joyride'
import { useAuth } from '@/contexts/AuthContext'
import { isDemoUser } from './DemoModeBanner'
import { useDemoTour } from '@/hooks/useDemoTour'

/**
 * Product tour component that shows a guided walkthrough for demo users.
 * Only renders for demo@pipetrak.co users who haven't completed the tour.
 */
export function DemoTour() {
  const { user } = useAuth()
  const isDemo = isDemoUser(user?.email)

  const {
    run,
    stepIndex,
    steps,
    handleJoyrideCallback
  } = useDemoTour({ enabled: isDemo })

  // Don't render anything for non-demo users
  if (!isDemo) {
    return null
  }

  return (
    <Joyride
      steps={steps}
      run={run}
      stepIndex={stepIndex}
      callback={handleJoyrideCallback}
      continuous
      showProgress
      showSkipButton
      disableOverlayClose
      spotlightClicks
      styles={{
        options: {
          primaryColor: '#2563eb', // blue-600
          textColor: '#1e293b', // slate-800
          backgroundColor: '#ffffff',
          arrowColor: '#ffffff',
          overlayColor: 'rgba(0, 0, 0, 0.5)',
          zIndex: 10000
        },
        buttonNext: {
          backgroundColor: '#2563eb',
          borderRadius: '8px',
          padding: '8px 16px',
          fontWeight: 600
        },
        buttonBack: {
          color: '#64748b',
          marginRight: '8px'
        },
        buttonSkip: {
          color: '#94a3b8'
        },
        tooltip: {
          borderRadius: '12px',
          padding: '20px'
        },
        tooltipTitle: {
          fontSize: '18px',
          fontWeight: 700,
          marginBottom: '8px'
        },
        tooltipContent: {
          fontSize: '14px',
          lineHeight: 1.6
        }
      }}
      locale={{
        back: 'Back',
        close: 'Close',
        last: 'Got it!',
        next: 'Next',
        skip: 'Skip tour'
      }}
    />
  )
}
