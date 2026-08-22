import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { Badge } from '../ui/badge';
import { ShieldCheck, User as UserIcon } from 'lucide-react';

export const Header: React.FC<{ title?: string; subtitle?: string }> = ({ title, subtitle }) => {
  const { user, hasRole } = useAuth();

  return (
    <header className="h-16 px-8 bg-white border-b border-slate-200/80 flex items-center justify-between flex-shrink-0">
      <div>
        {title && <h2 className="text-lg font-semibold text-slate-900">{title}</h2>}
        {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200/80 rounded-full px-3 py-1 text-xs text-slate-700">
          <UserIcon className="h-3.5 w-3.5 text-slate-500" />
          <span className="font-medium">{user?.name}</span>
          {hasRole('admin') && (
            <Badge variant="default" className="text-[10px] px-1.5 py-0 h-4 bg-blue-500">
              <ShieldCheck className="h-2.5 w-2.5 mr-0.5" /> Admin
            </Badge>
          )}
        </div>
      </div>
    </header>
  );
};
