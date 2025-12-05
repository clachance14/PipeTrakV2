import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from '@/components/ui/sonner'
import { AuthProvider } from '@/contexts/AuthContext'
import { ProjectProvider, useProject } from '@/contexts/ProjectContext'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { LoginPage } from '@/pages/LoginPage'
import { Register } from '@/pages/Register'
import { CheckEmail } from '@/pages/CheckEmail'
import { CompleteSetup } from '@/pages/CompleteSetup'
import { AcceptInvitation } from '@/pages/AcceptInvitation'
import { ForgotPasswordPage } from '@/pages/ForgotPasswordPage'
import { ResetPasswordPage } from '@/pages/ResetPasswordPage'
import { OnboardingWizard } from '@/components/auth/OnboardingWizard'
import { TeamManagement } from '@/pages/TeamManagement'
import { DashboardPage } from '@/pages/DashboardPage'
import { ProjectListPage } from '@/pages/ProjectListPage'
import { ComponentsPage } from '@/pages/ComponentsPage'
import { PackagesPage } from '@/pages/PackagesPage'
import { NeedsReviewPage } from '@/pages/NeedsReviewPage'
import { WeldersPage } from '@/pages/WeldersPage'
import { WeldLogPage } from '@/pages/WeldLogPage'
import { ImportsPage } from '@/pages/ImportsPage'
import { ComponentsTable } from '@/pages/ComponentsTable'
import { ProjectSetup } from '@/pages/ProjectSetup'
import { DrawingComponentTablePage } from '@/pages/DrawingComponentTablePage'
import { PackageDetailPage } from '@/pages/PackageDetailPage'
import { PackageCompletionReportPage } from '@/pages/PackageCompletionReportPage'
import { DebugUserPage } from '@/pages/DebugUserPage'
import MetadataManagementPage from '@/pages/MetadataManagementPage'
import { TermsOfService } from '@/pages/legal/TermsOfService'
import { PrivacyPolicy } from '@/pages/legal/PrivacyPolicy'
import { CreateProjectPage } from '@/pages/CreateProjectPage'
import { ReportBuilderPage } from '@/pages/ReportBuilderPage'
import { ReportViewPage } from '@/pages/ReportViewPage'
import { ReportsPage } from '@/pages/ReportsPage'
import { WelderSummaryReportPage } from '@/pages/WelderSummaryReportPage'
import { HomePage } from '@/pages/HomePage'
import { DemoSignupPage } from '@/pages/DemoSignupPage'
import { MilestoneTemplatesPage } from '@/components/settings/MilestoneTemplatesPage'
import { ManhourBudgetPage } from '@/components/settings/manhour-budget/ManhourBudgetPage'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { SettingsIndexPage } from '@/pages/SettingsIndexPage'
import { ProjectDetailsPage } from '@/pages/ProjectDetailsPage'

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
          <ProjectProvider>
            <Routes>
            {/* Public routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<Register />} />
            <Route path="/check-email" element={<CheckEmail />} />
            <Route path="/onboarding/complete-setup" element={<CompleteSetup />} />
            <Route path="/accept-invitation" element={<AcceptInvitation />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />

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

            {/* Public homepage (Feature 021) */}
            <Route path="/" element={<HomePage />} />
            <Route path="/demo-signup" element={<DemoSignupPage />} />

            {/* Protected main routes */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <DashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/projects"
              element={
                <ProtectedRoute>
                  <ProjectListPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/projects/new"
              element={
                <ProtectedRoute>
                  <CreateProjectPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/project-setup"
              element={
                <ProtectedRoute>
                  <ProjectSetupWrapper />
                </ProtectedRoute>
              }
            />
            <Route
              path="/components"
              element={
                <ProtectedRoute>
                  <ComponentsPageWrapper />
                </ProtectedRoute>
              }
            />
            <Route
              path="/drawings"
              element={
                <ProtectedRoute>
                  <DrawingsPageWrapper />
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
              path="/packages/:packageId/components"
              element={
                <ProtectedRoute>
                  <PackageDetailPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/packages/:packageId/completion-report"
              element={
                <ProtectedRoute>
                  <PackageCompletionReportPage />
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
              path="/weld-log"
              element={
                <ProtectedRoute>
                  <WeldLogPage />
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
            <Route
              path="/reports"
              element={
                <ProtectedRoute>
                  <ReportsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/reports/new"
              element={
                <ProtectedRoute>
                  <ReportBuilderPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/reports/view"
              element={
                <ProtectedRoute>
                  <ReportViewPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/reports/welder-summary"
              element={
                <ProtectedRoute>
                  <WelderSummaryReportPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/projects/:projectId/components"
              element={
                <ProtectedRoute>
                  <ComponentsTable />
                </ProtectedRoute>
              }
            />
            <Route
              path="/projects/:projectId/drawing-table"
              element={
                <ProtectedRoute>
                  <DrawingComponentTablePage />
                </ProtectedRoute>
              }
            />
            {/* Settings routes (Feature 027) */}
            <Route
              path="/projects/:projectId/settings"
              element={
                <ProtectedRoute>
                  <SettingsIndexPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/projects/:projectId/settings/milestones"
              element={
                <ProtectedRoute>
                  <MilestoneTemplatesPageWrapper />
                </ProtectedRoute>
              }
            />
            <Route
              path="/projects/:projectId/settings/metadata"
              element={
                <ProtectedRoute>
                  <MetadataManagementPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/projects/:projectId/settings/project"
              element={
                <ProtectedRoute>
                  <ProjectDetailsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/projects/:projectId/settings/manhours"
              element={
                <ProtectedRoute>
                  <ManhourBudgetPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/debug"
              element={
                <ProtectedRoute>
                  <DebugUserPage />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          <Toaster />
          </ProjectProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  )
}

// Wrapper components to inject projectId from context
function ProjectSetupWrapper() {
  const { selectedProjectId } = useProject()
  if (!selectedProjectId) {
    return <Navigate to="/projects" replace />
  }
  return <ProjectSetup projectId={selectedProjectId} />
}

function ComponentsPageWrapper() {
  const { selectedProjectId } = useProject()
  if (!selectedProjectId) {
    return <Navigate to="/projects" replace />
  }
  // TODO: Get actual permission from usePermissions hook
  return <ComponentsPage projectId={selectedProjectId} canUpdateMilestones={true} />
}

function DrawingsPageWrapper() {
  const { selectedProjectId } = useProject()
  if (!selectedProjectId) {
    return <Navigate to="/projects" replace />
  }
  // Feature 010: Drawing-centered component progress table
  return <DrawingComponentTablePage />
}

function MilestoneTemplatesPageWrapper() {
  const { selectedProjectId } = useProject()
  if (!selectedProjectId) {
    return <Navigate to="/projects" replace />
  }
  // Feature 026: Editable milestone weight templates
  return (
    <ErrorBoundary>
      <MilestoneTemplatesPage projectId={selectedProjectId} />
    </ErrorBoundary>
  )
}

export default App
