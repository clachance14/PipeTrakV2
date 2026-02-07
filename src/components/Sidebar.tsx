import { useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Box,
  FileText,
  Package,
  AlertCircle,
  Wrench,
  ClipboardCheck,
  Upload,
  Users,
  ChevronLeft,
  ChevronRight,
  BarChart3,
  Sliders
} from 'lucide-react';
import { useSidebarStore } from '@/stores/useSidebarStore';
import { PermissionGate } from '@/components/PermissionGate';
import { cn } from '@/lib/utils';
import { useProject } from '@/contexts/ProjectContext';
import { usePermissions } from '@/hooks/usePermissions';
import { advanceDemoTour } from '@/hooks/useDemoTour';

type Permission =
  | 'can_update_milestones'
  | 'can_manage_team'
  | 'can_view_dashboards'
  | 'can_resolve_reviews'
  | 'can_manage_welders';

interface NavItem {
  path: string;
  label: string;
  icon: typeof LayoutDashboard;
  badge?: number;
  permission?: Permission;
  tourId?: string;
}

export function Sidebar() {
  const { isCollapsed, isMobileOpen, isHovering, toggle, setMobileOpen, setHovering } = useSidebarStore();
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const location = useLocation();
  const { selectedProjectId } = useProject();
  const { role } = usePermissions();

  const navItems: NavItem[] = [
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, tourId: 'nav-dashboard' },
    { path: '/components', label: 'Components', icon: Box, tourId: 'nav-components' },
    { path: '/drawings', label: 'Drawings', icon: FileText, tourId: 'nav-drawings' },
    { path: '/packages', label: 'Test Packages', icon: Package, tourId: 'nav-packages' },
    { path: '/needs-review', label: 'Needs Review', icon: AlertCircle },
    { path: '/welders', label: 'Welders', icon: Wrench },
    { path: '/weld-log', label: 'Weld Log', icon: ClipboardCheck, tourId: 'nav-weld-log' },
    { path: '/reports', label: 'Reports', icon: BarChart3, tourId: 'nav-reports' },
    { path: '/imports', label: 'Imports', icon: Upload },
    { path: '/team', label: 'Team', icon: Users, permission: 'can_manage_team' }
  ];

  const isActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(`${path}/`);
  };

  const handleNavClick = (path: string) => {
    // Close mobile sidebar when navigating
    if (isMobileOpen) {
      setMobileOpen(false);
    }
    // Advance demo tour when clicking Drawings nav (delay to allow page to load)
    if (path === '/drawings') {
      setTimeout(() => advanceDemoTour(), 800);
    }
  };

  return (
    <>
      {/* Backdrop overlay for mobile */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setMobileOpen(false)}
          aria-label="Close sidebar"
        />
      )}

      {/* Sidebar */}
      <div
        onMouseEnter={() => {
          if (isCollapsed) {
            hoverTimeoutRef.current = setTimeout(() => setHovering(true), 300);
          }
        }}
        onMouseLeave={() => {
          if (hoverTimeoutRef.current) {
            clearTimeout(hoverTimeoutRef.current);
            hoverTimeoutRef.current = null;
          }
          if (isCollapsed) {
            setHovering(false);
          }
        }}
        className={cn(
          'fixed left-0 top-16 h-[calc(100vh-4rem)] bg-white border-r border-gray-200 transition-all duration-300 ease-in-out',
          // Desktop: always visible, collapsible width
          'md:block md:z-40',
          isCollapsed && !isHovering ? 'md:w-16' : 'md:w-64',
          // Mobile: hidden by default, slide in from left when open, full width
          'md:translate-x-0',
          isMobileOpen ? 'translate-x-0 w-64 z-50' : '-translate-x-full w-64'
        )}
      >
        {/* Toggle button (desktop only) */}
        <button
          onClick={toggle}
          className="hidden md:flex absolute -right-3 top-6 items-center justify-center h-6 w-6 bg-white border border-gray-200 rounded-full shadow-sm hover:bg-gray-50 transition-colors"
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? (
            <ChevronRight className="h-4 w-4 text-gray-600" />
          ) : (
            <ChevronLeft className="h-4 w-4 text-gray-600" />
          )}
        </button>

        {/* Navigation items */}
        <nav className="p-2 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);

            // Wrap in PermissionGate if permission is required
            const navLink = (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => handleNavClick(item.path)}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-lg transition-colors',
                  active
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-700 hover:bg-gray-100',
                  isCollapsed && !isHovering ? 'md:justify-center' : ''
                )}
                title={isCollapsed && !isHovering ? item.label : undefined}
                {...(item.tourId ? { 'data-tour': item.tourId } : {})}
              >
                <Icon className={cn('flex-shrink-0', isCollapsed && !isHovering ? 'md:h-5 md:w-5 h-6 w-6' : 'h-5 w-5')} />
                {((!isCollapsed || isHovering) || isMobileOpen) && (
                  <>
                    <span className="flex-1 text-sm font-medium whitespace-nowrap overflow-hidden">{item.label}</span>
                    {item.badge !== undefined && item.badge > 0 && (
                      <span className="flex items-center justify-center h-5 w-5 bg-red-500 text-white text-xs font-bold rounded-full">
                        {item.badge > 9 ? '9+' : item.badge}
                      </span>
                    )}
                  </>
                )}
              </Link>
            );

            // If permission is required, wrap in PermissionGate
            if (item.permission) {
              return (
                <PermissionGate key={item.path} permission={item.permission}>
                  {navLink}
                </PermissionGate>
              );
            }

            return navLink;
          })}

          {/* Settings - Only for owner/admin/PM with selected project */}
          {selectedProjectId && (role === 'owner' || role === 'admin' || role === 'project_manager') && (
            <Link
              to={`/projects/${selectedProjectId}/settings`}
              onClick={() => handleNavClick(`/projects/${selectedProjectId}/settings`)}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg transition-colors',
                isActive(`/projects/${selectedProjectId}/settings`)
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-700 hover:bg-gray-100',
                isCollapsed && !isHovering ? 'md:justify-center' : ''
              )}
              title={isCollapsed && !isHovering ? 'Settings' : undefined}
            >
              <Sliders className={cn('flex-shrink-0', isCollapsed && !isHovering ? 'md:h-5 md:w-5 h-6 w-6' : 'h-5 w-5')} />
              {((!isCollapsed || isHovering) || isMobileOpen) && (
                <span className="flex-1 text-sm font-medium whitespace-nowrap overflow-hidden">Settings</span>
              )}
            </Link>
          )}
        </nav>
      </div>
    </>
  );
}
