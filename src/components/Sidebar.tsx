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
  Settings,
  ChevronLeft,
  ChevronRight,
  BarChart3
} from 'lucide-react';
import { useSidebarStore } from '@/stores/useSidebarStore';
import { PermissionGate } from '@/components/PermissionGate';
import { cn } from '@/lib/utils';

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
}

export function Sidebar() {
  const { isCollapsed, isMobileOpen, toggle, setMobileOpen } = useSidebarStore();
  const location = useLocation();

  const navItems: NavItem[] = [
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/components', label: 'Components', icon: Box },
    { path: '/drawings', label: 'Drawings', icon: FileText },
    { path: '/packages', label: 'Test Packages', icon: Package },
    { path: '/needs-review', label: 'Needs Review', icon: AlertCircle },
    { path: '/welders', label: 'Welders', icon: Wrench },
    { path: '/weld-log', label: 'Weld Log', icon: ClipboardCheck },
    { path: '/reports', label: 'Reports', icon: BarChart3 },
    { path: '/imports', label: 'Imports', icon: Upload },
    { path: '/metadata', label: 'Metadata', icon: Settings },
    { path: '/team', label: 'Team', icon: Users, permission: 'can_manage_team' }
  ];

  const isActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(`${path}/`);
  };

  const handleNavClick = () => {
    // Close mobile sidebar when navigating
    if (isMobileOpen) {
      setMobileOpen(false);
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
        className={cn(
          'fixed left-0 top-16 h-[calc(100vh-4rem)] bg-white border-r border-gray-200 transition-all duration-300 ease-in-out',
          // Desktop: always visible, collapsible width
          'md:block md:z-40',
          isCollapsed ? 'md:w-16' : 'md:w-64',
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
                onClick={handleNavClick}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-lg transition-colors',
                  active
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-700 hover:bg-gray-100',
                  isCollapsed ? 'md:justify-center' : ''
                )}
                title={isCollapsed ? item.label : undefined}
              >
                <Icon className={cn('flex-shrink-0', isCollapsed ? 'md:h-5 md:w-5 h-6 w-6' : 'h-5 w-5')} />
                {(!isCollapsed || isMobileOpen) && (
                  <>
                    <span className="flex-1 text-sm font-medium">{item.label}</span>
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
        </nav>
      </div>
    </>
  );
}
