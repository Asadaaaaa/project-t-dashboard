import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import { User, Role } from '../types';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import {
  Users as UsersIcon,
  UserPlus,
  Trash2,
  Edit2,
  Shield,
  RefreshCw,
  Check,
  X
} from 'lucide-react';
import { formatDate } from '../lib/utils';

export const UsersPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [formName, setFormName] = useState('');
  const [formUsername, setFormUsername] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formRoleId, setFormRoleId] = useState<number | ''>('');
  const [modalError, setModalError] = useState<string | null>(null);

  const { data: usersData, isLoading, refetch, isFetching } = useQuery<{ data: User[] }>({
    queryKey: ['users'],
    queryFn: async () => {
      const resp = await api.get('/users');
      return resp.data;
    }
  });

  const { data: rolesData } = useQuery<{ data: Role[] }>({
    queryKey: ['roles'],
    queryFn: async () => {
      const resp = await api.get('/roles');
      return resp.data;
    }
  });

  const createUserMutation = useMutation({
    mutationFn: async (payload: any) => {
      const resp = await api.post('/users', payload);
      return resp.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setShowModal(false);
      setFormName('');
      setFormUsername('');
      setFormPassword('');
      setFormRoleId('');
      setModalError(null);
    },
    onError: (err: any) => {
      setModalError(err.response?.data?.message || err.message || 'Failed to create user');
    }
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (id: number) => {
      const resp = await api.delete(`/users/${id}`);
      return resp.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    }
  });

  const users = usersData?.data || [];
  const roles = rolesData?.data || [];

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName || !formUsername || !formPassword) {
      setModalError('Please fill in all required fields.');
      return;
    }
    createUserMutation.mutate({
      name: formName,
      username: formUsername,
      password: formPassword,
      role_id: formRoleId ? Number(formRoleId) : undefined
    });
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">User Management</h1>
          <p className="text-sm text-slate-500">
            Manage application users, credentials, and assigned RBAC roles
          </p>
        </div>

        <div className="flex items-center gap-3">
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

          <Button
            size="sm"
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2"
          >
            <UserPlus className="h-3.5 w-3.5" />
            <span>Create User</span>
          </Button>
        </div>
      </div>

      {/* Users Table Card */}
      <Card className="border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="px-6 py-3.5">User</th>
                <th className="px-6 py-3.5">Username</th>
                <th className="px-6 py-3.5">Roles</th>
                <th className="px-6 py-3.5">Created At</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-slate-400">
                    <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-blue-600" />
                    Loading users...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-slate-400">
                    No users found.
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/50">
                    <td className="px-6 py-4 font-semibold text-slate-900 flex items-center gap-2.5">
                      <div className="h-8 w-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
                        {u.name.charAt(0).toUpperCase()}
                      </div>
                      <span>{u.name}</span>
                    </td>
                    <td className="px-6 py-4 text-slate-600 font-mono text-xs">{u.username}</td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {u.roles && u.roles.length > 0 ? (
                          u.roles.map((r: any, idx: number) => (
                            <Badge
                              key={idx}
                              variant={
                                (typeof r === 'string' ? r : r.name) === 'admin'
                                  ? 'default'
                                  : 'secondary'
                              }
                              className="text-[10px]"
                            >
                              <Shield className="h-2.5 w-2.5 mr-1" />
                              {typeof r === 'string' ? r : r.name}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-xs text-slate-400">No role</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-500 text-xs">
                      {formatDate(u.created_at)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {u.username !== 'admin' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            if (window.confirm(`Are you sure you want to delete user ${u.username}?`)) {
                              deleteUserMutation.mutate(u.id);
                            }
                          }}
                          className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Create User Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                <UserPlus className="h-4 w-4 text-blue-600" />
                <span>Create New User</span>
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {modalError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
                {modalError}
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Full Name</label>
                <Input
                  placeholder="John Doe"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Username</label>
                <Input
                  placeholder="johndoe"
                  value={formUsername}
                  onChange={(e) => setFormUsername(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Password</label>
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={formPassword}
                  onChange={(e) => setFormPassword(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Assign Role</label>
                <select
                  value={formRoleId}
                  onChange={(e) => setFormRoleId(e.target.value ? Number(e.target.value) : '')}
                  className="w-full h-9 rounded-md border border-slate-200 bg-white px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">No Role</option>
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} — {r.description || ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={createUserMutation.isPending}
                >
                  {createUserMutation.isPending ? 'Saving...' : 'Create User'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
