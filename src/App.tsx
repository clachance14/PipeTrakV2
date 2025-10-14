import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from '@/components/ui/sonner'
import { AuthProvider } from '@/contexts/AuthContext'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { LoginPage } from '@/pages/LoginPage'
import { Register } from '@/pages/Register'
import { CheckEmail } from '@/pages/CheckEmail'
import { CompleteSetup } from '@/pages/CompleteSetup'
import { AcceptInvitation } from '@/pages/AcceptInvitation'
import { OnboardingWizard } from '@/components/auth/OnboardingWizard'
import { TeamManagement } from '@/pages/TeamManagement'
import { DashboardPage } from '@/pages/DashboardPage'
import { ComponentsPage } from '@/pages/ComponentsPage'
import { PackagesPage } from '@/pages/PackagesPage'
import { NeedsReviewPage } from '@/pages/NeedsReviewPage'
import { WeldersPage } from '@/pages/WeldersPage'
import { ImportsPage } from '@/pages/ImportsPage'
import { TermsOfService } from '@/pages/legal/TermsOfService'
import { PrivacyPolicy } from '@/pages/legal/PrivacyPolicy'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<Register />} />
            <Route path="/check-email" element={<CheckEmail />} />
            <Route path="/onboarding/complete-setup" element={<CompleteSetup />} />
            <Route path="/accept-invitation" element={<AcceptInvitation />} />

            {/* Legal routes */}
            <Route path="/legal/terms" element={<TermsOfService />} />
            <Route path="/legal/privacy" element={<PrivacyPolicy />} />

            {/* Protected auth routes */}
            <Route
              path="/onboarding/wizard"
              element={
                <ProtectedRoute>
                  <OnboardingWizard />
                </ProtectedRoute>
              }
            />

            {/* Protected team management (owner/admin only) */}
            <Route
              path="/team"
              element={
                <ProtectedRoute>
                  <TeamManagement />
                </ProtectedRoute>
              }
            />

            {/* Protected main routes */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <DashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/components"
              element={
                <ProtectedRoute>
                  <ComponentsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/packages"
              element={
                <ProtectedRoute>
                  <PackagesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/needs-review"
              element={
                <ProtectedRoute>
                  <NeedsReviewPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/welders"
              element={
                <ProtectedRoute>
                  <WeldersPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/imports"
              element={
                <ProtectedRoute>
                  <ImportsPage />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          <Toaster />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  )
}

export default App
