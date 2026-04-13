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

interface NavGroup {
  label: string;
  items: NavItem[];
}

export function Sidebar() {
  const { isCollapsed, isMobileOpen, isHovering, toggle, setMobileOpen, setHovering } = useSidebarStore();
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const location = useLocation();
  const { selectedProjectId } = useProject();
  const { role } = usePermissions();

  const isExpanded = !isCollapsed || isHovering || isMobileOpen;

  const dashboardItem: NavItem = {
    path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, tourId: 'nav-dashboard'
  };

  const navGroups: NavGroup[] = [
    {
      label: 'PROJECT',
      items: [
        { path: '/components', label: 'Components', icon: Box, tourId: 'nav-components' },
        { path: '/drawings', label: 'Drawings', icon: FileText, tourId: 'nav-drawings' },
        { path: '/packages', label: 'Test Packages', icon: Package, tourId: 'nav-packages' },
      ],
    },
    {
      label: 'QC',
      items: [
        { path: '/welders', label: 'Welders', icon: Wrench },
        { path: '/weld-log', label: 'Weld Log', icon: ClipboardCheck, tourId: 'nav-weld-log' },
        { path: '/needs-review', label: 'Needs Review', icon: AlertCircle },
      ],
    },
    {
      label: 'TOOLS',
      items: [
        { path: '/reports', label: 'Reports', icon: BarChart3, tourId: 'nav-reports' },
        { path: '/imports', label: 'Imports', icon: Upload },
      ],
    },
  ];

  const isActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(`${path}/`);
  };

  const handleNavClick = (path: string) => {
    if (isMobileOpen) {
      setMobileOpen(false);
    }
    if (path === '/drawings') {
      setTimeout(() => advanceDemoTour(), 800);
    }
  };

  function renderNavLink(item: NavItem) {
    const Icon = item.icon;
    const active = isActive(item.path);

    return (
      <Link
        key={item.path}
        to={item.path}
        onClick={() => handleNavClick(item.path)}
        className={cn(
          'flex items-center gap-3 px-3 py-2 rounded-lg transition-colors relative',
          active
            ? 'bg-primary/10 text-primary'
            : 'text-foreground hover:bg-muted',
          isCollapsed && !isHovering && !isMobileOpen ? 'md:justify-center' : ''
        )}
        title={isCollapsed && !isHovering && !isMobileOpen ? item.label : undefined}
        {...(item.tourId ? { 'data-tour': item.tourId } : {})}
      >
        <Icon className={cn('flex-shrink-0', isCollapsed && !isHovering && !isMobileOpen ? 'md:h-5 md:w-5 h-6 w-6' : 'h-5 w-5')} />
        {isExpanded && (
          <>
            <span className="flex-1 text-sm font-medium whitespace-nowrap overflow-hidden">{item.label}</span>
            {item.badge !== undefined && item.badge > 0 && (
              <span className="flex items-center justify-center h-5 w-5 bg-destructive text-white text-xs font-bold rounded-full">
                {item.badge > 9 ? '9+' : item.badge}
              </span>
            )}
          </>
        )}
        {isCollapsed && !isHovering && !isMobileOpen && item.badge !== undefined && item.badge > 0 && (
          <span className="absolute top-1 right-1 h-2 w-2 bg-destructive rounded-full" />
        )}
      </Link>
    );
  }

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
          'fixed left-0 top-16 h-[calc(100vh-4rem)] bg-white border-r border-border transition-all duration-300 ease-in-out',
          'md:block md:z-40',
          isCollapsed && !isHovering ? 'md:w-16' : 'md:w-64',
          'md:translate-x-0',
          isMobileOpen ? 'translate-x-0 w-64 z-50' : '-translate-x-full w-64'
        )}
      >
        {/* Toggle button (desktop only) */}
        <button
          onClick={toggle}
          className="hidden md:flex absolute -right-5 top-4 items-center justify-center h-11 w-11 bg-transparent hover:bg-muted/50 rounded-full transition-colors"
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <span className="flex items-center justify-center h-6 w-6 bg-white border border-border rounded-full shadow-sm">
            {isCollapsed ? (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronLeft className="h-4 w-4 text-muted-foreground" />
            )}
          </span>
        </button>

        {/* Navigation */}
        <nav className="p-2 space-y-4" aria-label="Main">
          {/* Dashboard — standalone */}
          <div>
            {renderNavLink(dashboardItem)}
          </div>

          {/* Grouped sections */}
          {navGroups.map((group) => (
            <div key={group.label} role="group" aria-label={group.label}>
              <div className="h-5 flex items-center mb-1">
                {isExpanded ? (
                  <span className="px-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {group.label}
                  </span>
                ) : (
                  <div className="mx-2 w-full border-t border-border" />
                )}
              </div>
              <div className="space-y-1">
                {group.items.map((item) => {
                  if (item.permission) {
                    return (
                      <PermissionGate key={item.path} permission={item.permission}>
                        {renderNavLink(item)}
                      </PermissionGate>
                    );
                  }
                  return renderNavLink(item);
                })}
              </div>
            </div>
          ))}

          {/* ADMIN group */}
          <div role="group" aria-label="ADMIN">
            <div className="h-5 flex items-center mb-1">
              {isExpanded ? (
                <span className="px-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  ADMIN
                </span>
              ) : (
                <div className="mx-2 w-full border-t border-border" />
              )}
            </div>
            <div className="space-y-1">
              <PermissionGate permission="can_manage_team">
                {renderNavLink({ path: '/team', label: 'Team', icon: Users })}
              </PermissionGate>

              {selectedProjectId && (role === 'owner' || role === 'admin' || role === 'project_manager') && (
                renderNavLink({ path: `/projects/${selectedProjectId}/settings`, label: 'Settings', icon: Sliders })
              )}
            </div>
          </div>
        </nav>
      </div>
    </>
  );
}
