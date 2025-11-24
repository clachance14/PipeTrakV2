/**
 * MilestoneTemplatesPage component (Feature 026 - US1)
 * Main settings page for viewing and managing milestone templates
 */

import { useState } from 'react'
import { useProjectTemplates } from '@/hooks/useProjectTemplates'
import { useCloneTemplates } from '@/hooks/useCloneTemplates'
import { useTemplateChanges } from '@/hooks/useTemplateChanges'
import { TemplateCard } from './TemplateCard'
import { CloneTemplatesBanner } from './CloneTemplatesBanner'
import { TemplateEditor } from './TemplateEditor'
import { SettingsLayout } from './SettingsLayout'
import { MilestoneTemplatesTable } from './MilestoneTemplatesTable'
import { toast } from 'sonner'
import { usePermissions } from '@/hooks/usePermissions'
import { LayoutGrid, Table as TableIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface MilestoneTemplatesPageProps {
  projectId: string
}

/**
 * Wrapper component that calls useTemplateChanges hook at the top level
 * to avoid React hooks rules violation
 */
interface TemplateCardWithChangesProps {
  projectId: string
  componentType: string
  milestoneCount: number
  hasTemplates: boolean
  onEdit: () => void
  canEdit: boolean
}

function TemplateCardWithChanges({
  projectId,
  componentType,
  milestoneCount,
  hasTemplates,
  onEdit,
  canEdit,
}: TemplateCardWithChangesProps) {
  const { data: lastMod } = useTemplateChanges(projectId, componentType, 1)
  const lastModified = lastMod?.[0]
    ? {
        userName: null, // TODO: Fetch user name separately
        date: lastMod[0].changed_at,
      }
    : undefined

  return (
    <TemplateCard
      componentType={componentType}
      milestoneCount={milestoneCount}
      hasTemplates={hasTemplates}
      onEdit={onEdit}
      canEdit={canEdit}
      lastModified={lastModified}
    />
  )
}

export function MilestoneTemplatesPage({ projectId }: MilestoneTemplatesPageProps) {
  const { data: templates, isLoading, error, refetch } = useProjectTemplates(projectId)
  const cloneMutation = useCloneTemplates()
  const { canManageProject } = usePermissions()

  // State for view mode
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('table')

  // State for template editor modal
  const [editorOpen, setEditorOpen] = useState(false)
  const [selectedComponentType, setSelectedComponentType] = useState<string | null>(null)

  // Check if user can edit templates (requires manage_projects permission)
  const canEdit = canManageProject

  const handleClone = () => {
    cloneMutation.mutate(
      { projectId },
      {
        onSuccess: (data) => {
          toast.success(`Successfully cloned ${data.templates_created} templates`)
          refetch()
        },
        onError: (error) => {
          toast.error(`Failed to clone templates: ${error.message}`)
        },
      }
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-gray-600">Loading templates...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-red-600">Error loading templates: {error.message}</div>
      </div>
    )
  }

  // Group templates by component type
  type TemplateArray = NonNullable<typeof templates>;
  const templatesByType = (templates || []).reduce<Record<string, TemplateArray>>((acc, template) => {
    if (!acc[template.component_type]) {
      acc[template.component_type] = []
    }
    acc[template.component_type]!.push(template)
    return acc
  }, {})

  const componentTypes = Object.keys(templatesByType)
  const hasTemplates = componentTypes.length > 0

  // Get templates for selected component type
  const selectedTemplates = selectedComponentType ? (templatesByType[selectedComponentType] || []) : []
  // Use server timestamp if available, otherwise use epoch (never updated sentinel)
  const lastUpdated = selectedTemplates[0]?.updated_at || '1970-01-01T00:00:00Z'

  const handleEditClick = (componentType: string) => {
    setSelectedComponentType(componentType)
    setEditorOpen(true)
  }

  return (
    <SettingsLayout
      title="Rules of Credit"
      description="Customize progress tracking weights for each component type. Changes apply to all existing and future components."
    >
      <div className="space-y-6">
        {/* View Toggle */}
        {hasTemplates && (
            <div className="flex justify-end">
            <div className="bg-slate-100 p-1 rounded-lg flex gap-1">
                <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewMode('cards')}
                className={`gap-2 ${viewMode === 'cards' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500'}`}
                >
                <LayoutGrid className="w-4 h-4" />
                Cards
                </Button>
                <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewMode('table')}
                className={`gap-2 ${viewMode === 'table' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500'}`}
                >
                <TableIcon className="w-4 h-4" />
                Table
                </Button>
            </div>
            </div>
        )}

        {!hasTemplates ? (
            <CloneTemplatesBanner onClone={handleClone} isCloning={cloneMutation.isPending} />
        ) : viewMode === 'table' ? (
            <MilestoneTemplatesTable 
                projectId={projectId} 
                templates={templates || []} 
                onRefresh={refetch}
            />
        ) : (
            <>
            <div
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                role="region"
                aria-label="Component type templates"
            >
                {componentTypes.map((componentType) => (
                <TemplateCardWithChanges
                    key={componentType}
                    projectId={projectId}
                    componentType={componentType}
                    milestoneCount={templatesByType[componentType]?.length || 0}
                    hasTemplates={true}
                    onEdit={() => handleEditClick(componentType)}
                    canEdit={canEdit}
                />
                ))}
            </div>

            {/* Template Editor Modal (US2) */}
            {selectedComponentType && (
                <TemplateEditor
                open={editorOpen}
                onOpenChange={setEditorOpen}
                projectId={projectId}
                componentType={selectedComponentType}
                weights={selectedTemplates.map((t) => ({
                    milestone_name: t.milestone_name,
                    weight: t.weight,
                }))}
                lastUpdated={lastUpdated}
                />
            )}
            </>
        )}
      </div>
    </SettingsLayout>
  )
}
