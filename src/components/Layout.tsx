import { ReactNode, useEffect } from 'react'
import { Link, useNavigate, useLocation, useParams } from 'react-router-dom'
import { useProject } from '@/contexts/ProjectContext'
import { useProjects } from '@/hooks/useProjects'
import { useSidebarStore } from '@/stores/useSidebarStore'
import { Sidebar } from '@/components/Sidebar'
import { UserMenu } from '@/components/profile/UserMenu'
import { cn } from '@/lib/utils'

interface LayoutProps {
  children: ReactNode
  fixedHeight?: boolean // Enable fixed height mode for pages that need scrollable content areas
}

export function Layout({ children, fixedHeight = false }: LayoutProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const params = useParams()
  const { selectedProjectId, setSelectedProjectId } = useProject()
  const { data: projects, isLoading: projectsLoading } = useProjects()
  const { isCollapsed, toggleMobile } = useSidebarStore()

  // Auto-select first project if none selected and projects loaded
  useEffect(() => {
    if (!projectsLoading && projects && projects.length > 0 && !selectedProjectId) {
      const firstProject = projects[0];
      if (firstProject) {
        setSelectedProjectId(firstProject.id);
      }
    }
  }, [projects, projectsLoading, selectedProjectId, setSelectedProjectId]);

  // Sync context with URL params (for project-specific routes)
  useEffect(() => {
    if (params.projectId && params.projectId !== selectedProjectId) {
      setSelectedProjectId(params.projectId);
    }
  }, [params.projectId, selectedProjectId, setSelectedProjectId]);

  const handleProjectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newProjectId = e.target.value;

    // Special handling for "Add New Project" option
    if (newProjectId === '__new__') {
      navigate('/projects/new');
      return;
    }

    setSelectedProjectId(newProjectId);

    // If on a project-specific route, navigate to same route with new project ID
    if (params.projectId) {
      const newPath = location.pathname.replace(params.projectId, newProjectId);
      navigate(newPath);
    }
  }

  return (
    <div className={fixedHeight ? "h-screen flex flex-col bg-gray-50" : "min-h-screen bg-gray-50"}>
      {/* Top Navigation Bar */}
      <nav className={cn(
        "sticky top-0 z-50 bg-slate-800 text-white shadow-lg",
        fixedHeight && "flex-shrink-0"
      )}>
        <div className="mx-auto px-4">
          <div className="flex h-16 items-center justify-between gap-4">
            {/* Left: Hamburger + Logo + Project Selector */}
            <div className="flex items-center gap-3 md:gap-6 flex-shrink-0">
              {/* Hamburger menu (mobile only) */}
              <button
                onClick={toggleMobile}
                className="md:hidden flex items-center justify-center min-h-[44px] min-w-[44px] hover:bg-slate-700 rounded-md transition-colors"
                aria-label="Toggle menu"
              >
                <svg
                  className="h-6 w-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
              </button>

              <Link to="/" className="flex items-center gap-2">
                <div className="text-xl md:text-2xl font-bold">PipeTrak</div>
              </Link>

              <select
                value={selectedProjectId || ''}
                onChange={handleProjectChange}
                disabled={projectsLoading}
                className="rounded-md bg-slate-700 px-2 md:px-4 py-2 text-xs md:text-sm text-white border border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed max-w-[120px] md:max-w-none"
              >
                {projectsLoading && <option>Loading projects...</option>}
                {!projectsLoading && (!projects || projects.length === 0) && (
                  <option>No projects yet</option>
                )}
                {!projectsLoading && projects && projects.length > 0 && projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
                {!projectsLoading && <option value="__new__">➕ Add New Project</option>}
              </select>
            </div>

            {/* Center: Search Bar (hidden on mobile) */}
            <div className="hidden lg:flex flex-1 max-w-2xl mx-8">
              <div className="relative w-full">
                <input
                  type="text"
                  placeholder="Search components, drawings, packages..."
                  className="w-full rounded-md bg-slate-700 px-4 py-2 pl-10 text-sm text-white placeholder-slate-400 border border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <svg
                  className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>
            </div>

            {/* Right: Notifications and User Menu */}
            <div className="flex items-center gap-2 md:gap-4 flex-shrink-0">
              {/* Notifications (hidden on small mobile) */}
              <button className="hidden sm:block relative p-2 rounded-md hover:bg-slate-700 transition-colors">
                <svg
                  className="h-6 w-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                  />
                </svg>
                <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-red-500"></span>
              </button>

              {/* User Menu */}
              <UserMenu />
            </div>
          </div>
        </div>
      </nav>

      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <main
        className={cn(
          'transition-all duration-300 ease-in-out',
          fixedHeight && 'flex-1 overflow-hidden',
          // Mobile: no margin (full width)
          'ml-0',
          // Desktop: margin based on sidebar collapse state
          isCollapsed ? 'md:ml-16' : 'md:ml-64'
        )}
      >
        {children}
      </main>
    </div>
  )
}
