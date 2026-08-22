import React from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import { DashboardStats } from '../types';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Link } from 'react-router-dom';
import {
  MessageSquare,
  Users,
  CheckCircle2,
  Clock,
  Sparkles,
  QrCode,
  ArrowRight,
  Wifi,
  WifiOff,
  RefreshCw
} from 'lucide-react';
import { formatDate } from '../lib/utils';

export const OverviewPage: React.FC = () => {
  const { data: statsData, isLoading, refetch, isFetching } = useQuery<{ data: DashboardStats }>({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const resp = await api.get('/dashboard/stats');
      return resp.data;
    },
    refetchInterval: 10000
  });

  const stats = statsData?.data;

  const isConnected = stats?.whatsappStatus === 'connected';

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard Overview</h1>
          <p className="text-sm text-slate-500">
            Overview of activity, daily summaries, and action items
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
          <Link to="/dashboard/whatsapp">
            <Button size="sm" className="flex items-center gap-2">
              <QrCode className="h-3.5 w-3.5" />
              <span>WhatsApp Hub</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Card 1: WhatsApp Status */}
        <Card className="border-slate-200/80 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              WhatsApp Status
            </CardTitle>
            {isConnected ? (
              <Wifi className="h-4 w-4 text-emerald-600" />
            ) : (
              <WifiOff className="h-4 w-4 text-slate-400" />
            )}
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div className="text-2xl font-bold capitalize text-slate-900">
                {isLoading ? '...' : (stats?.whatsappStatus || 'Disconnected')}
              </div>
              <Badge variant={isConnected ? 'success' : 'secondary'}>
                {isConnected ? 'Live' : 'Offline'}
              </Badge>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {stats?.phoneNumber ? `+${stats.phoneNumber}` : 'No active phone session'}
            </p>
          </CardContent>
        </Card>

        {/* Card 2: Messages Today */}
        <Card className="border-slate-200/80 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Messages Today
            </CardTitle>
            <MessageSquare className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">
              {isLoading ? '...' : stats?.messagesToday?.toLocaleString() ?? 0}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Across {stats?.activeChats ?? 0} chats / groups
            </p>
          </CardContent>
        </Card>

        {/* Card 3: Pending Todos */}
        <Card className="border-slate-200/80 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Pending Action Items
            </CardTitle>
            <Clock className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">
              {isLoading ? '...' : stats?.pendingTodos ?? 0}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Extracted by Gemini AI
            </p>
          </CardContent>
        </Card>

        {/* Card 4: Completed Todos */}
        <Card className="border-slate-200/80 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Completed Tasks
            </CardTitle>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">
              {isLoading ? '...' : stats?.completedTodos ?? 0}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Resolved action items
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Latest Summary Card */}
      <Card className="border-slate-200/80 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold text-slate-900">
                Latest Daily Summary
              </CardTitle>
              <p className="text-xs text-slate-500">
                {stats?.latestSummary
                  ? `Summary Date: ${formatDate(stats.latestSummary.summary_date)}`
                  : 'Daily summary generated by Gemini AI'}
              </p>
            </div>
          </div>

          <Link to="/dashboard/whatsapp/summary">
            <Button variant="ghost" size="sm" className="flex items-center gap-1.5 text-blue-600 hover:text-blue-700">
              <span>View All Summaries</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </CardHeader>

        <CardContent className="pt-6">
          {stats?.latestSummary ? (
            <div className="space-y-6">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/60">
                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  Executive Summary
                </h4>
                <p className="text-sm text-slate-800 leading-relaxed whitespace-pre-wrap">
                  {stats.latestSummary.summary}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Highlights */}
                {stats.latestSummary.highlights && stats.latestSummary.highlights.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Important Highlights
                    </h4>
                    <ul className="space-y-1.5">
                      {stats.latestSummary.highlights.map((h, i) => (
                        <li key={i} className="text-xs text-slate-700 flex items-start gap-2">
                          <span className="h-1.5 w-1.5 rounded-full bg-blue-500 mt-1.5 flex-shrink-0"></span>
                          <span>{h}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Decisions */}
                {stats.latestSummary.decisions && stats.latestSummary.decisions.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Key Decisions
                    </h4>
                    <ul className="space-y-1.5">
                      {stats.latestSummary.decisions.map((d, i) => (
                        <li key={i} className="text-xs text-slate-700 flex items-start gap-2">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 mt-1.5 flex-shrink-0"></span>
                          <span>{d}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="py-8 text-center">
              <Sparkles className="h-8 w-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-medium text-slate-700">No summaries generated yet</p>
              <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 mb-4">
                Connect your WhatsApp account to start generating daily AI summaries.
              </p>
              <Link to="/dashboard/whatsapp">
                <Button size="sm">Connect WhatsApp</Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
