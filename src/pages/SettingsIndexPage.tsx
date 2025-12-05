import { Link, useParams } from 'react-router-dom'
import { Sliders, Database, FolderCog, Calculator, ArrowRight } from 'lucide-react'
import { usePermissions } from '@/hooks/usePermissions'
import { Layout } from '@/components/Layout'

interface SettingsCard {
  title: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  path: string
}

export function SettingsIndexPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const { canManageProject } = usePermissions()

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

  const cards: SettingsCard[] = [
    {
      title: 'Rules of Credit',
      description: 'Customize progress tracking weights for each component type. Changes apply to all existing and future components.',
      icon: Sliders,
      path: `/projects/${projectId}/settings/milestones`,
    },
    {
      title: 'Metadata Management',
      description: 'Create and manage Areas, Systems, and Test Packages used to organize and categorize components across your project.',
      icon: Database,
      path: `/projects/${projectId}/settings/metadata`,
    },
    {
      title: 'Project Details',
      description: 'Edit project name and description, or archive this project to hide it from active project lists.',
      icon: FolderCog,
      path: `/projects/${projectId}/settings/project`,
    },
    {
      title: 'Manhour Budget',
      description: 'Set project manhour budget for earned value tracking. System auto-distributes to components by size.',
      icon: Calculator,
      path: `/projects/${projectId}/settings/manhours`,
    },
  ]

  return (
    <Layout>
      <div className="max-w-[1400px] mx-auto p-6 md:p-8">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-slate-900 mb-2">Project Settings</h1>
          <p className="text-slate-600">
            Manage your project configuration, templates, and metadata
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {cards.map((card) => {
            const Icon = card.icon
            return (
              <Link
                key={card.path}
                to={card.path}
                className="block p-6 bg-white border border-slate-200 rounded-lg hover:border-blue-500 hover:shadow-md transition-all cursor-pointer"
              >
                <Icon className="w-8 h-8 text-blue-600 mb-4" />
                <h2 className="text-lg font-semibold text-slate-900 mb-2">{card.title}</h2>
                <p className="text-sm text-slate-600 mb-4 min-h-[3rem]">{card.description}</p>
                <div className="flex items-center justify-between">
                  <span className="text-blue-600 font-medium">Manage</span>
                  <ArrowRight className="w-4 h-4 text-blue-600" />
                </div>
              </Link>
            )
          })}
        </div>
      </div>
    </Layout>
  )
}
