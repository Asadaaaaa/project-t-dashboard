import React from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import { Permission } from '../types';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Key, RefreshCw } from 'lucide-react';

export const PermissionsPage: React.FC = () => {
  const { data: permissionsData, isLoading, refetch, isFetching } = useQuery<{ data: Permission[] }>({
    queryKey: ['permissions'],
    queryFn: async () => {
      const resp = await api.get('/permissions');
      return resp.data;
    }
  });

  const permissions = permissionsData?.data || [];

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">System Permissions</h1>
          <p className="text-sm text-slate-500">
            Available fine-grained system permissions across authentication, WhatsApp, summaries, and administration
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isFetching}
          className="flex items-center gap-2"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </Button>
      </div>

      <Card className="border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="px-6 py-3.5">ID</th>
                <th className="px-6 py-3.5">Permission Name</th>
                <th className="px-6 py-3.5">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {isLoading ? (
                <tr>
                  <td colSpan={3} className="text-center py-8 text-slate-400">
                    <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-blue-600" />
                    Loading permissions...
                  </td>
                </tr>
              ) : (
                permissions.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/50">
                    <td className="px-6 py-3 text-slate-400 font-mono text-xs">{p.id}</td>
                    <td className="px-6 py-3">
                      <span className="font-mono text-xs font-semibold bg-slate-100 text-slate-800 px-2 py-0.5 rounded border border-slate-200">
                        {p.name}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-slate-600 text-xs">{p.description || '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
