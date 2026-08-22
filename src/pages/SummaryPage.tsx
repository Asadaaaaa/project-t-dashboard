import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import api from '../lib/api';
import { DailySummary } from '../types';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import {
  Sparkles,
  Calendar,
  RefreshCw,
  Copy,
  Check,
  FileText,
  DownloadCloud
} from 'lucide-react';
import { formatDate } from '../lib/utils';
import { useAuth } from '../context/AuthContext';

export const SummaryPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { hasPermission, hasRole } = useAuth();
  const canGenerate = hasRole('admin') || hasPermission('summary.generate');

  const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' });
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [generationDate, setGenerationDate] = useState<string>(todayStr);
  const [copied, setCopied] = useState<boolean>(false);
  const [loadingStep, setLoadingStep] = useState<number>(0); // 1 = fetching chat, 2 = generating summary
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const { data: summariesData, isLoading, refetch, isFetching } = useQuery<{ data: DailySummary[] }>({
    queryKey: ['summaries'],
    queryFn: async () => {
      const resp = await api.get('/summaries');
      return resp.data;
    }
  });

  const summaries = summariesData?.data || [];
  const selectedSummary = summaries.find((s) => s.summary_date === selectedDate) || summaries[0];

  const generateMutation = useMutation({
    mutationFn: async (date: string) => {
      setLoadingStep(1); // Step 1: Sedang mengambil data chat...
      const timer = setTimeout(() => {
        setLoadingStep(2); // Step 2: Sedang membuat summary...
      }, 3000);

      try {
        const resp = await api.post('/summaries/generate', { date });
        clearTimeout(timer);
        return resp.data;
      } catch (e) {
        clearTimeout(timer);
        throw e;
      }
    },
    onSuccess: (data) => {
      setLoadingStep(0);
      const dateGen = data?.data?.summary?.summary_date || generationDate;
      const count = data?.data?.messageCount || 0;
      setStatusMsg({
        type: 'success',
        text: `Summary untuk tanggal ${dateGen} berhasil dibuat dari ${count} percakapan WhatsApp!`
      });
      queryClient.invalidateQueries({ queryKey: ['summaries'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      setSelectedDate(dateGen);
    },
    onError: (err: any) => {
      setLoadingStep(0);
      setStatusMsg({
        type: 'error',
        text: err.response?.data?.message || err.message || 'Gagal membuat summary'
      });
    }
  });

  // Helper to compile full markdown for current summary
  const getFullMarkdown = (summary: DailySummary | undefined): string => {
    if (!summary) return '';
    
    // If backend already returned full markdown
    if ((summary as any).markdown) {
      return (summary as any).markdown;
    }

    let md = `# 📅 Ringkasan Harian WhatsApp — ${summary.summary_date}\n\n`;
    md += `## 📝 Deskripsi Hari Ini\n${summary.summary}\n\n`;
    md += `---\n\n`;
    md += `## 📋 Rincian Aktivitas & Rekapitulasi\n\n`;

    md += `### 1. ✅ Yang Sudah Dilakukan (Completed)\n`;
    if (summary.highlights && summary.highlights.length > 0) {
      summary.highlights.forEach((h) => {
        md += `- [x] **${h}**\n`;
      });
    } else {
      md += `- Tidak ada aktivitas yang terselesaikan secara eksplisit hari ini.\n`;
    }
    md += `\n`;

    const todos = summary.todos || [];
    md += `### 2. ⏳ Yang Harus / Belum Dilakukan (Action Items & To-Do List) (${todos.length})\n`;
    if (todos.length > 0) {
      todos.forEach((t) => {
        const isDone = t.status === 'completed';
        const checkbox = isDone ? '[x]' : '[ ]';
        const priorityTag = (t.priority || 'medium').toUpperCase();
        const assigneeTag = t.assignee ? ` | 👤 @${t.assignee}` : '';
        const deadlineTag = t.deadline ? ` | ⏰ Deadline: ${formatDate(t.deadline)}` : '';
        md += `- ${checkbox} **${t.title}** [${priorityTag}]${assigneeTag}${deadlineTag}\n`;
        if (t.description) {
          md += `  > ${t.description}\n`;
        }
      });
    } else {
      md += `- Tidak ada to-do list tertunda.\n`;
    }
    md += `\n`;

    md += `### 3. 📅 Jadwal, Agenda & Rencana Kedepan\n`;
    if (summary.decisions && summary.decisions.length > 0) {
      summary.decisions.forEach((d) => {
        md += `- **Agenda/Keputusan**: ${d}\n`;
      });
    } else {
      md += `- Tidak ada jadwal agenda khusus yang tercatat.\n`;
    }
    md += `\n`;

    return md;
  };

  const currentMarkdown = getFullMarkdown(selectedSummary);

  const handleCopyMarkdown = () => {
    if (!currentMarkdown) return;
    navigator.clipboard.writeText(currentMarkdown).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Daily Summary</h1>
          <p className="text-sm text-slate-500">
            Laporan ringkasan harian dan daftar tugas dalam format Markdown
          </p>
        </div>

        <div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching || generateMutation.isPending}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* Dynamic Multi-Step Loading Banner */}
      {generateMutation.isPending && (
        <div className="p-4 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl text-white shadow-md flex items-center justify-between animate-pulse">
          <div className="flex items-center gap-3">
            {loadingStep === 1 ? (
              <DownloadCloud className="h-6 w-6" />
            ) : (
              <Sparkles className="h-6 w-6" />
            )}
            <div>
              <p className="font-bold text-sm tracking-wide">
                {loadingStep === 1
                  ? 'Tahap 1 / 2: Sedang mengambil data chat...'
                  : 'Tahap 2 / 2: Sedang membuat summary dengan AI Gemini...'}
              </p>
              <p className="text-xs text-blue-100">
                {loadingStep === 1
                  ? `Menarik log percakapan WhatsApp untuk tanggal ${generationDate}`
                  : `Menganalisis isi pesan, mengekstrak ringkasan, poin penting, dan to-do list`}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Action Notification Message */}
      {statusMsg && (
        <div
          className={`p-3 rounded-lg border text-sm flex items-center justify-between ${
            statusMsg.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          <span>{statusMsg.text}</span>
          <button
            onClick={() => setStatusMsg(null)}
            className="text-xs font-semibold hover:underline ml-3"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Date Filter & Generator Toolbar */}
      <Card className="border-slate-200/80 shadow-sm">
        <CardContent className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <Calendar className="h-4 w-4 text-slate-500 flex-shrink-0" />
            <span className="text-xs font-semibold text-slate-700 whitespace-nowrap">Pilih Tanggal Laporan:</span>
            <select
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="h-9 rounded-md border border-slate-200 bg-white px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
            >
              {summaries.map((s) => (
                <option key={s.id} value={s.summary_date}>
                  {formatDate(s.summary_date)} ({s.summary_date})
                </option>
              ))}
              {!summaries.some((s) => s.summary_date === selectedDate) && (
                <option value={selectedDate}>{formatDate(selectedDate)} ({selectedDate})</option>
              )}
            </select>
          </div>

          {canGenerate && (
            <div className="flex items-center gap-2 w-full sm:w-auto justify-end border-t sm:border-t-0 pt-3 sm:pt-0">
              <Input
                type="date"
                value={generationDate}
                onChange={(e) => setGenerationDate(e.target.value)}
                className="w-36 h-9 text-xs"
              />
              <Button
                size="sm"
                onClick={() => generateMutation.mutate(generationDate)}
                disabled={generateMutation.isPending}
                className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 shadow-sm"
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>{generateMutation.isPending ? 'Memproses...' : 'Generate'}</span>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Main Markdown Content Area */}
      {isLoading ? (
        <Card className="border-slate-200/80 shadow-sm p-12 text-center text-slate-400">
          <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-3 text-blue-600" />
          <p className="text-sm font-medium">Memuat data laporan summary...</p>
        </Card>
      ) : selectedSummary ? (
        <Card className="border-slate-200/80 shadow-sm bg-white overflow-hidden">
          <CardHeader className="bg-slate-50/70 border-b border-slate-200/80 py-4 px-6 flex flex-row items-center justify-between">
            <div className="flex items-center gap-2.5">
              <FileText className="h-5 w-5 text-blue-600" />
              <div>
                <CardTitle className="text-base font-bold text-slate-900">
                  Laporan Markdown — {selectedSummary.summary_date}
                </CardTitle>
                <p className="text-xs text-slate-500">
                  Dibuat oleh AI Gemini • Terakhir diperbarui: {formatDate(selectedSummary.updated_at || selectedSummary.created_at)}
                </p>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyMarkdown}
              className="flex items-center gap-1.5 text-xs border-slate-300 hover:bg-slate-100"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{copied ? 'Tersalin!' : 'Copy Markdown'}</span>
            </Button>
          </CardHeader>

          <CardContent className="p-8">
            <article className="markdown-body max-w-none text-slate-800 leading-relaxed">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {currentMarkdown}
              </ReactMarkdown>
            </article>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-slate-200/80 shadow-sm p-12 text-center">
          <Sparkles className="h-10 w-10 text-slate-300 mx-auto mb-3" />
          <p className="text-base font-semibold text-slate-700">Belum Ada Summary untuk Tanggal Ini</p>
          <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 mb-4">
            Pilih tanggal di atas dan klik <strong>Generate</strong> untuk memindai obrolan WhatsApp dan membuat laporan Markdown.
          </p>
          {canGenerate && (
            <Button
              size="sm"
              onClick={() => generateMutation.mutate(selectedDate)}
              disabled={generateMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Sparkles className="h-3.5 w-3.5 mr-1.5" />
              Generate Summary Tanggal {selectedDate}
            </Button>
          )}
        </Card>
      )}
    </div>
  );
};
