import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

interface ProtectedRouteProps {
  requiredPermission?: string;
  requiredRole?: string;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  requiredPermission,
  requiredRole
}) => {
  const { user, token, isLoading, hasPermission, hasRole } = useAuth();

  if (isLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
          <p className="text-sm font-medium text-slate-600">Loading ProjectT...</p>
        </div>
      </div>
    );
  }

  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && !hasRole(requiredRole) && !hasRole('admin')) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-xl font-bold text-red-600 mb-2">Access Denied</h2>
        <p className="text-slate-600 text-sm">
          You do not have the required role ({requiredRole}) to access this page.
        </p>
      </div>
    );
  }

  if (requiredPermission && !hasPermission(requiredPermission) && !hasRole('admin')) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-xl font-bold text-red-600 mb-2">Access Denied</h2>
        <p className="text-slate-600 text-sm">
          You do not have the required permission ({requiredPermission}) to view this section.
        </p>
      </div>
    );
  }

  return <Outlet />;
};
