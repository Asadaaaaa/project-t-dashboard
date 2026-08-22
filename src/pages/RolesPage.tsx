import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import { Role, Permission } from '../types';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import {
  Shield,
  ShieldPlus,
  Trash2,
  Edit2,
  Key,
  RefreshCw,
  X
} from 'lucide-react';
import { formatDate } from '../lib/utils';

export const RolesPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [selectedPermissions, setSelectedPermissions] = useState<number[]>([]);
  const [modalError, setModalError] = useState<string | null>(null);

  const { data: rolesData, isLoading, refetch, isFetching } = useQuery<{ data: Role[] }>({
    queryKey: ['roles'],
    queryFn: async () => {
      const resp = await api.get('/roles');
      return resp.data;
    }
  });

  const { data: permissionsData } = useQuery<{ data: Permission[] }>({
    queryKey: ['permissions'],
    queryFn: async () => {
      const resp = await api.get('/permissions');
      return resp.data;
    }
  });

  const allPermissions = permissionsData?.data || [];
  const roles = rolesData?.data || [];

  const createRoleMutation = useMutation({
    mutationFn: async (payload: any) => {
      const resp = await api.post('/roles', payload);
      return resp.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      closeModal();
    },
    onError: (err: any) => {
      setModalError(err.response?.data?.message || err.message || 'Failed to create role');
    }
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: number; payload: any }) => {
      const resp = await api.put(`/roles/${id}`, payload);
      return resp.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      closeModal();
    },
    onError: (err: any) => {
      setModalError(err.response?.data?.message || err.message || 'Failed to update role');
    }
  });

  const deleteRoleMutation = useMutation({
    mutationFn: async (id: number) => {
      const resp = await api.delete(`/roles/${id}`);
      return resp.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
    }
  });

  const openCreateModal = () => {
    setEditingRole(null);
    setFormName('');
    setFormDescription('');
    setSelectedPermissions([]);
    setModalError(null);
    setShowModal(true);
  };

  const openEditModal = (role: Role) => {
    setEditingRole(role);
    setFormName(role.name);
    setFormDescription(role.description || '');
    const currentPermIds = role.permissions ? role.permissions.map((p: any) => (typeof p === 'number' ? p : p.id)) : [];
    setSelectedPermissions(currentPermIds);
    setModalError(null);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingRole(null);
    setFormName('');
    setFormDescription('');
    setSelectedPermissions([]);
    setModalError(null);
  };

  const togglePermission = (permId: number) => {
    setSelectedPermissions((prev) =>
      prev.includes(permId) ? prev.filter((id) => id !== permId) : [...prev, permId]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName) {
      setModalError('Role name is required.');
      return;
    }

    const payload = {
      name: formName,
      description: formDescription,
      permission_ids: selectedPermissions
    };

    if (editingRole) {
      updateRoleMutation.mutate({ id: editingRole.id, payload });
    } else {
      createRoleMutation.mutate(payload);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Role Management</h1>
          <p className="text-sm text-slate-500">
            Define system roles and assign granular permissions
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

          <Button size="sm" onClick={openCreateModal} className="flex items-center gap-2">
            <ShieldPlus className="h-3.5 w-3.5" />
            <span>Create Role</span>
          </Button>
        </div>
      </div>

      {/* Roles List Card */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {isLoading ? (
          <div className="col-span-2 text-center py-12 text-slate-400">
            <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-blue-600" />
            Loading roles...
          </div>
        ) : (
          roles.map((r) => (
            <Card key={r.id} className="border-slate-200/80 shadow-sm flex flex-col justify-between">
              <CardHeader className="pb-3 border-b border-slate-100">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
                      <Shield className="h-4 w-4" />
                    </div>
                    <div>
                      <CardTitle className="text-base font-bold text-slate-900">{r.name}</CardTitle>
                      <p className="text-xs text-slate-500 mt-0.5">{r.description || 'No description'}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditModal(r)}
                      className="h-8 w-8 p-0 text-slate-500 hover:text-blue-600"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </Button>
                    {r.name !== 'admin' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (window.confirm(`Are you sure you want to delete role "${r.name}"?`)) {
                            deleteRoleMutation.mutate(r.id);
                          }
                        }}
                        className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>

              <CardContent className="pt-4 flex-1">
                <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Key className="h-3 w-3 text-slate-400" />
                  Permissions ({r.permissions?.length || 0})
                </p>

                <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                  {r.permissions && r.permissions.length > 0 ? (
                    r.permissions.map((p: any, idx: number) => (
                      <Badge
                        key={idx}
                        variant="outline"
                        className="text-[10px] bg-slate-50 border-slate-200 text-slate-700"
                      >
                        {typeof p === 'string' ? p : p.name}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-xs text-slate-400 italic">No permissions assigned</span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Role Create / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-lg w-full p-6 space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                <Shield className="h-4 w-4 text-blue-600" />
                <span>{editingRole ? `Edit Role: ${editingRole.name}` : 'Create New Role'}</span>
              </h3>
              <button onClick={closeModal} className="text-slate-400 hover:text-slate-600">
                <X className="h-4 w-4" />
              </button>
            </div>

            {modalError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
                {modalError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 flex-1 overflow-y-auto pr-1">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Role Name</label>
                <Input
                  placeholder="e.g. operations-manager"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  disabled={editingRole?.name === 'admin'}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Description</label>
                <Input
                  placeholder="Brief description of responsibilities"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-700">Assign Permissions</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 border border-slate-200 rounded-lg p-3 max-h-56 overflow-y-auto">
                  {allPermissions.map((p) => {
                    const isChecked = selectedPermissions.includes(p.id);
                    return (
                      <label
                        key={p.id}
                        className={`flex items-center gap-2 p-1.5 rounded text-xs cursor-pointer transition-colors ${
                          isChecked ? 'bg-blue-50 text-blue-900 font-medium' : 'hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => togglePermission(p.id)}
                          className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="truncate">{p.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <Button type="button" variant="outline" size="sm" onClick={closeModal}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={createRoleMutation.isPending || updateRoleMutation.isPending}
                >
                  {createRoleMutation.isPending || updateRoleMutation.isPending
                    ? 'Saving...'
                    : editingRole
                    ? 'Update Role'
                    : 'Create Role'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
