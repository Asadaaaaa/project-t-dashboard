import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import { DailyTodo } from '../types';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import {
  CheckSquare,
  Clock,
  UserCheck,
  Calendar,
  RefreshCw,
  CheckCircle2,
  Circle,
  AlertCircle
} from 'lucide-react';
import { formatDate } from '../lib/utils';
import { useAuth } from '../context/AuthContext';

export const TodoPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { hasPermission, hasRole } = useAuth();
  const canUpdate = hasRole('admin') || hasPermission('todo.update');

  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');

  const { data: todosData, isLoading, refetch, isFetching } = useQuery<{ data: DailyTodo[] }>({
    queryKey: ['todos', statusFilter, priorityFilter],
    queryFn: async () => {
      const params: any = {};
      if (statusFilter !== 'all') params.status = statusFilter;
      if (priorityFilter !== 'all') params.priority = priorityFilter;
      const resp = await api.get('/todos', { params });
      return resp.data;
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const resp = await api.put(`/todos/${id}`, { status });
      return resp.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['todos'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['summaries'] });
    }
  });

  const todos = todosData?.data || [];

  const handleToggleStatus = (todo: DailyTodo) => {
    if (!canUpdate) return;
    const nextStatus = todo.status === 'completed' ? 'pending' : 'completed';
    updateMutation.mutate({ id: todo.id, status: nextStatus });
  };

  const handleStatusSelect = (id: number, newStatus: string) => {
    if (!canUpdate) return;
    updateMutation.mutate({ id, status: newStatus });
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Daily Action Items</h1>
          <p className="text-sm text-slate-500">
            Action items and todos extracted from WhatsApp conversations by AI
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

      {/* Filters Bar */}
      <div className="flex flex-wrap items-center gap-3 bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-500 uppercase">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-500 uppercase">Priority:</span>
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
          >
            <option value="all">All Priorities</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>

        <div className="ml-auto text-xs text-slate-500 font-medium">
          Showing {todos.length} task{todos.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Todo List */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="py-12 text-center text-slate-400 text-sm">
            <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-blue-600" />
            Loading action items...
          </div>
        ) : todos.length === 0 ? (
          <Card className="p-12 text-center border-dashed">
            <CheckSquare className="h-10 w-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-700">No action items found</p>
            <p className="text-xs text-slate-500 mt-1">
              Todos extracted from conversations will appear here.
            </p>
          </Card>
        ) : (
          todos.map((todo) => {
            const isDone = todo.status === 'completed';

            return (
              <Card
                key={todo.id}
                className={`border-slate-200/80 shadow-sm transition-all hover:border-blue-200 ${
                  isDone ? 'bg-slate-50/70 opacity-80' : 'bg-white'
                }`}
              >
                <CardContent className="p-4 flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 min-w-0">
                    <button
                      onClick={() => handleToggleStatus(todo)}
                      disabled={!canUpdate || updateMutation.isPending}
                      className="mt-0.5 text-slate-400 hover:text-blue-600 transition-colors flex-shrink-0"
                      title={isDone ? 'Mark as Pending' : 'Mark as Completed'}
                    >
                      {isDone ? (
                        <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                      ) : (
                        <Circle className="h-5 w-5 text-slate-300 hover:text-blue-500" />
                      )}
                    </button>

                    <div className="space-y-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`text-sm font-semibold ${
                            isDone ? 'line-through text-slate-500' : 'text-slate-900'
                          }`}
                        >
                          {todo.title}
                        </span>

                        <Badge
                          variant={
                            todo.priority === 'high'
                              ? 'destructive'
                              : todo.priority === 'medium'
                              ? 'warning'
                              : 'secondary'
                          }
                          className="text-[10px] uppercase font-bold"
                        >
                          {todo.priority}
                        </Badge>
                      </div>

                      {todo.description && (
                        <p className={`text-xs ${isDone ? 'text-slate-400' : 'text-slate-600'}`}>
                          {todo.description}
                        </p>
                      )}

                      <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-400 pt-1">
                        {todo.summary && (
                          <span className="flex items-center gap-1 text-slate-500">
                            <Calendar className="h-3 w-3 text-blue-500" /> Date:{' '}
                            {formatDate(todo.summary.summary_date)}
                          </span>
                        )}
                        {todo.assignee && (
                          <span className="flex items-center gap-1 text-slate-700 font-medium">
                            <UserCheck className="h-3 w-3 text-blue-600" /> Assignee: {todo.assignee}
                          </span>
                        )}
                        {todo.deadline && (
                          <span className="flex items-center gap-1 text-amber-700 font-medium">
                            <Clock className="h-3 w-3 text-amber-500" /> Deadline:{' '}
                            {formatDate(todo.deadline)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Status Dropdown */}
                  <div className="flex-shrink-0">
                    <select
                      value={todo.status}
                      onChange={(e) => handleStatusSelect(todo.id, e.target.value)}
                      disabled={!canUpdate || updateMutation.isPending}
                      className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 font-medium capitalize focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="pending">Pending</option>
                      <option value="in_progress">In Progress</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
};
