import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  QrCode,
  Sparkles,
  Users,
  Shield,
  Key,
  LogOut,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { cn } from '../../lib/utils';

export const Sidebar: React.FC = () => {
  const { user, logout, hasPermission, hasRole } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('projectt_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const toggleCollapsed = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('projectt_sidebar_collapsed', String(next));
      } catch {}
      return next;
    });
  };

  const isUserAdmin = hasRole('admin');
  const canViewUsers = isUserAdmin || hasPermission('user.view');
  const canViewRoles = isUserAdmin || hasPermission('role.view');
  const canViewPermissions = isUserAdmin || hasPermission('permission.view');
  const showAdminSection = canViewUsers || canViewRoles || canViewPermissions;

  const navItems = [
    {
      label: 'Overview',
      to: '/dashboard',
      icon: LayoutDashboard,
      show: true,
      end: true
    },
    {
      label: 'WhatsApp Connection',
      to: '/dashboard/whatsapp',
      icon: QrCode,
      show: isUserAdmin || hasPermission('whatsapp.view'),
      end: true
    },
    {
      label: 'Daily Summary & Todos',
      to: '/dashboard/whatsapp/summary',
      icon: Sparkles,
      show: isUserAdmin || hasPermission('summary.view')
    }
  ];

  const adminItems = [
    {
      label: 'Users',
      to: '/dashboard/users',
      icon: Users,
      show: canViewUsers
    },
    {
      label: 'Roles',
      to: '/dashboard/roles',
      icon: Shield,
      show: canViewRoles
    },
    {
      label: 'Permissions',
      to: '/dashboard/permissions',
      icon: Key,
      show: canViewPermissions
    }
  ];

  return (
    <aside
      className={cn(
        "bg-slate-900 text-slate-100 flex flex-col flex-shrink-0 border-r border-slate-800 transition-all duration-300 ease-in-out relative select-none",
        isCollapsed ? "w-20" : "w-64"
      )}
    >
      {/* Brand Header & Collapse Toggle */}
      <div className="h-16 px-4 flex items-center justify-between border-b border-slate-800">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="h-9 w-9 flex-shrink-0 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-white shadow-md shadow-blue-500/20">
            T
          </div>
          {!isCollapsed && (
            <div className="min-w-0 transition-opacity duration-200">
              <h1 className="font-bold text-base text-white tracking-wide truncate">ProjectT</h1>
            </div>
          )}
        </div>

        <button
          onClick={toggleCollapsed}
          title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          className={cn(
            "h-8 w-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors flex-shrink-0",
            isCollapsed && "mx-auto"
          )}
        >
          {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>

      {/* Main Navigation */}
      <div className="flex-1 px-3 py-6 space-y-6 overflow-y-auto overflow-x-hidden">
        <div>
          {!isCollapsed && (
            <p className="px-3 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 transition-opacity duration-200">
              Main Menu
            </p>
          )}
          {isCollapsed && <div className="h-px bg-slate-800 my-2 mx-1" />}
          <nav className="space-y-1">
            {navItems.filter(i => i.show).map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  title={isCollapsed ? item.label : undefined}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center rounded-lg text-sm font-medium transition-all group relative",
                      isCollapsed ? "justify-center px-0 py-2.5 h-10 w-full" : "gap-3 px-3 py-2.5",
                      isActive
                        ? "bg-blue-600 text-white shadow-sm"
                        : "text-slate-300 hover:bg-slate-800 hover:text-white"
                    )
                  }
                >
                  <Icon className="h-4 w-4 flex-shrink-0" />
                  {!isCollapsed && <span className="truncate">{item.label}</span>}
                </NavLink>
              );
            })}
          </nav>
        </div>

        {showAdminSection && (
          <div>
            {!isCollapsed && (
              <p className="px-3 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 transition-opacity duration-200">
                Administration
              </p>
            )}
            {isCollapsed && <div className="h-px bg-slate-800 my-2 mx-1" />}
            <nav className="space-y-1">
              {adminItems.filter(i => i.show).map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    title={isCollapsed ? item.label : undefined}
                    className={({ isActive }) =>
                      cn(
                        "flex items-center rounded-lg text-sm font-medium transition-all group relative",
                        isCollapsed ? "justify-center px-0 py-2.5 h-10 w-full" : "gap-3 px-3 py-2.5",
                        isActive
                          ? "bg-blue-600 text-white shadow-sm"
                          : "text-slate-300 hover:bg-slate-800 hover:text-white"
                      )
                    }
                  >
                    <Icon className="h-4 w-4 flex-shrink-0" />
                    {!isCollapsed && <span className="truncate">{item.label}</span>}
                  </NavLink>
                );
              })}
            </nav>
          </div>
        )}
      </div>

      {/* User Footer */}
      <div className="p-3 border-t border-slate-800 bg-slate-950/40">
        {!isCollapsed ? (
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1 mr-2">
              <p className="text-sm font-medium text-white truncate">{user?.name || user?.username}</p>
              <p className="text-xs text-slate-400 truncate">
                {Array.isArray(user?.roles) ? user.roles.join(', ') : 'User'}
              </p>
            </div>
            <button
              onClick={logout}
              title="Logout"
              className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-colors flex-shrink-0"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <div
              title={`${user?.name || user?.username} (${Array.isArray(user?.roles) ? user.roles.join(', ') : 'User'})`}
              className="h-8 w-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs"
            >
              {(user?.name || user?.username || 'U').charAt(0).toUpperCase()}
            </div>
            <button
              onClick={logout}
              title="Logout"
              className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-colors"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
};
