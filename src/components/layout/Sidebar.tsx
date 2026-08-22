import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  QrCode,
  Sparkles,
  Users,
  Shield,
  Key,
  LogOut
} from 'lucide-react';
import { cn } from '../../lib/utils';

export const Sidebar: React.FC = () => {
  const { user, logout, hasPermission, hasRole } = useAuth();

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
    <aside className="w-64 bg-slate-900 text-slate-100 flex flex-col flex-shrink-0 border-r border-slate-800">
      {/* Brand Header */}
      <div className="h-16 px-6 flex items-center gap-3 border-b border-slate-800">
        <div className="h-9 w-9 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-white shadow-md shadow-blue-500/20">
          T
        </div>
        <div>
          <h1 className="font-bold text-base text-white tracking-wide">ProjectT</h1>
        </div>
      </div>

      {/* Main Navigation */}
      <div className="flex-1 px-4 py-6 space-y-6 overflow-y-auto">
        <div>
          <p className="px-3 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
            Main Menu
          </p>
          <nav className="space-y-1">
            {navItems.filter(i => i.show).map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                      isActive
                        ? "bg-blue-600 text-white shadow-sm"
                        : "text-slate-300 hover:bg-slate-800 hover:text-white"
                    )
                  }
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>
        </div>

        {showAdminSection && (
          <div>
            <p className="px-3 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Administration
            </p>
            <nav className="space-y-1">
              {adminItems.filter(i => i.show).map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) =>
                      cn(
                        "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                        isActive
                          ? "bg-blue-600 text-white shadow-sm"
                          : "text-slate-300 hover:bg-slate-800 hover:text-white"
                      )
                    }
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </NavLink>
                );
              })}
            </nav>
          </div>
        )}
      </div>

      {/* User Footer */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/40">
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
            className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};
