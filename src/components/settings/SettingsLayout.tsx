import { ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { usePermissions } from '@/hooks/usePermissions'
import { Layout } from '@/components/Layout'

interface SettingsLayoutProps {
  title: string
  description: string
  children: ReactNode
}

export function SettingsLayout({ title, description, children }: SettingsLayoutProps) {
  const { canManageProject } = usePermissions()
  const { projectId } = useParams<{ projectId: string }>()

  if (!canManageProject) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h2 className="text-2xl font-semibold text-slate-900 mb-2">Access Denied</h2>
            <p className="text-slate-600">You don't have permission to access project settings.</p>
          </div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="max-w-[1400px] mx-auto p-6 md:p-8">
        {/* Breadcrumbs */}
        <nav className="flex items-center gap-2 text-sm text-slate-600 mb-6" aria-label="Breadcrumb">
          <Link
            to={`/projects/${projectId}/settings`}
            className="hover:text-slate-900 transition-colors"
          >
            Settings
          </Link>
          <ChevronRight className="w-4 h-4" />
          <span className="text-slate-900">{title}</span>
        </nav>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-slate-900 mb-2">{title}</h1>
          <p className="text-slate-600">{description}</p>
        </div>

        {/* Content */}
        <div>{children}</div>
      </div>
    </Layout>
  )
}
