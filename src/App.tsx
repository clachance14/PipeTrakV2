import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from '@/contexts/AuthContext'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { LoginPage } from '@/pages/LoginPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { ComponentsPage } from '@/pages/ComponentsPage'
import { PackagesPage } from '@/pages/PackagesPage'
import { NeedsReviewPage } from '@/pages/NeedsReviewPage'
import { WeldersPage } from '@/pages/WeldersPage'
import { ImportsPage } from '@/pages/ImportsPage'

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
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
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
