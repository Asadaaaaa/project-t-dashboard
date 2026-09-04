import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import { WhatsappReimbursement, ReimbursementMetrics, ReimbursementItem, ReimbursementAnomaly } from '../types';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { getSocket } from '../lib/socket';
import {
  Receipt,
  Search,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  Flag,
  Store,
  Calendar,
  DollarSign,
  Eye,
  Sparkles,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Equal,
  X,
  Maximize2,
  ExternalLink,
  ShieldAlert,
  Check,
  User
} from 'lucide-react';
import { cn } from '../lib/utils';

export const ReimbursementPage: React.FC = () => {
  const queryClient = useQueryClient();

  // Search and Filter State
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [diffFilter, setDiffFilter] = useState<string>('ALL');
  
  // Selected Reimbursement for Detail Modal
  const [selectedItem, setSelectedItem] = useState<WhatsappReimbursement | null>(null);
  
  // Lightbox / Image Preview Modal
  const [previewImage, setPreviewImage] = useState<{ url: string; title: string } | null>(null);


  // Fetch Reimbursements List
  const { data: reimbursementsData, isLoading, refetch, isFetching } = useQuery<{ data: WhatsappReimbursement[] }>({
    queryKey: ['reimbursements', statusFilter, diffFilter, searchTerm],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter !== 'ALL') params.append('status', statusFilter);
      if (diffFilter !== 'ALL') params.append('difference_status', diffFilter);
      if (searchTerm.trim()) params.append('search', searchTerm.trim());
      const res = await api.get(`/reimbursements?${params.toString()}`);
      return res.data;
    }
  });

  // Fetch Metrics
  const { data: metricsData } = useQuery<{ data: ReimbursementMetrics }>({
    queryKey: ['reimbursement-metrics'],
    queryFn: async () => {
      const res = await api.get('/reimbursements/metrics');
      return res.data;
    }
  });

  const rawReimbursementsData = reimbursementsData?.data as any;
  const reimbursements: WhatsappReimbursement[] = Array.isArray(rawReimbursementsData)
    ? rawReimbursementsData
    : Array.isArray(rawReimbursementsData?.items)
    ? rawReimbursementsData.items
    : [];
  const metrics = metricsData?.data;

  // Reliable overview calculations (falls back to calculating directly from reimbursements list)
  const totalReimburseVal = metrics?.totalReimburseAmount ?? (metrics as any)?.totalReimburse ?? reimbursements.reduce((acc, curr) => acc + (Number(curr.reimburse_amount) || 0), 0);
  const totalReceiptVal = metrics?.totalReceiptAmount ?? (metrics as any)?.totalReceipt ?? reimbursements.reduce((acc, curr) => acc + (Number(curr.receipt_amount) || 0), 0);
  const totalDiffVal = metrics?.totalDifference ?? (totalReimburseVal - totalReceiptVal);
  const totalClaimsCount = metrics?.totalClaims ?? (metrics as any)?.totalCount ?? reimbursements.length;
  const approvedCount = metrics?.approvedCount ?? reimbursements.filter(r => r.status === 'APPROVED').length;
  const anomaliesCount = metrics?.anomaliesCount ?? (metrics as any)?.anomalyCount ?? reimbursements.reduce((acc, curr) => acc + (curr.anomalies?.length || 0), 0);
  const pendingCount = metrics?.pendingCount ?? reimbursements.filter(r => r.status === 'PENDING' || r.status === 'FLAGGED').length;

  // Socket.IO Realtime listener
  useEffect(() => {
    const socket = getSocket();
    const handleUpdate = () => {
      queryClient.invalidateQueries({ queryKey: ['reimbursements'] });
      queryClient.invalidateQueries({ queryKey: ['reimbursement-metrics'] });
    };

    socket.on('whatsapp:reimbursement_detected', handleUpdate);
    socket.on('whatsapp:reimbursement_updated', handleUpdate);

    return () => {
      socket.off('whatsapp:reimbursement_detected', handleUpdate);
      socket.off('whatsapp:reimbursement_updated', handleUpdate);
    };
  }, [queryClient]);


  // Mutation: Update Status (Approve, Reject, Flag, Pending)
  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const res = await api.patch(`/reimbursements/${id}/status`, { status });
      return res.data;
    },
    onSuccess: (res, vars) => {
      queryClient.invalidateQueries({ queryKey: ['reimbursements'] });
      queryClient.invalidateQueries({ queryKey: ['reimbursement-metrics'] });
      if (selectedItem && selectedItem.id === vars.id) {
        setSelectedItem({ ...selectedItem, status: vars.status as any });
      }
    }
  });

  // Mutation: Re-analyze with Gemini
  const reanalyzeMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await api.post(`/reimbursements/${id}/reanalyze`);
      return res.data;
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['reimbursements'] });
      queryClient.invalidateQueries({ queryKey: ['reimbursement-metrics'] });
      if (res.data) {
        setSelectedItem(res.data);
      }
    }
  });

  const formatRupiah = (val: number | string | undefined | null) => {
    const num = Number(val) || 0;
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0
    }).format(num);
  };

  const getImageUrl = (item: WhatsappReimbursement, type: 'reimburse' | 'receipt') => {
    const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
    return `${apiBase}/reimbursements/${item.id}/image/${type}`;
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-500/10 rounded-lg text-blue-600">
              <Receipt className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                Verifikasi Reimbursement
              </h1>
              <p className="text-sm text-slate-500">
                Pencocokan otomatis bukti transfer & nota belanja via Gemini Multimodal AI
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              refetch();
              queryClient.invalidateQueries({ queryKey: ['reimbursement-metrics'] });
            }}
            disabled={isFetching}
            className="flex items-center gap-2"
          >
            <RefreshCw className={cn("h-4 w-4", isFetching && "animate-spin")} />
            <span>Refresh</span>
          </Button>

        </div>
      </div>

      {/* Metrics Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-slate-200 shadow-sm hover:shadow transition-shadow">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Total Klaim Transfer
                </p>
                <h3 className="text-xl font-bold text-slate-900 mt-1">
                  {formatRupiah(totalReimburseVal)}
                </h3>
                <span className="text-xs text-slate-500 mt-1 block">
                  {totalClaimsCount} klaim diajukan
                </span>
              </div>
              <div className="h-11 w-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <DollarSign className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm hover:shadow transition-shadow">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Total Struk Terverifikasi
                </p>
                <h3 className="text-xl font-bold text-slate-900 mt-1">
                  {formatRupiah(totalReceiptVal)}
                </h3>
                <span className="text-xs text-emerald-600 font-medium mt-1 flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  {approvedCount} Disetujui
                </span>
              </div>
              <div className="h-11 w-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Receipt className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm hover:shadow transition-shadow">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Total Selisih (Net)
                </p>
                <h3 className={cn(
                  "text-xl font-bold mt-1",
                  totalDiffVal > 0 ? "text-amber-600" :
                  totalDiffVal < 0 ? "text-blue-600" : "text-emerald-600"
                )}>
                  {formatRupiah(Math.abs(totalDiffVal))}
                </h3>
                <span className="text-xs text-slate-500 mt-1 block">
                  {totalDiffVal > 0 ? "Klaim lebih besar" :
                   totalDiffVal < 0 ? "Nota lebih besar" : "Nominal sama (Pas)"}
                </span>
              </div>
              <div className={cn(
                "h-11 w-11 rounded-xl flex items-center justify-center",
                totalDiffVal > 0 ? "bg-amber-50 text-amber-600" :
                totalDiffVal < 0 ? "bg-blue-50 text-blue-600" : "bg-emerald-50 text-emerald-600"
              )}>
                {totalDiffVal > 0 ? <TrendingUp className="h-5 w-5" /> :
                 totalDiffVal < 0 ? <TrendingDown className="h-5 w-5" /> : <Equal className="h-5 w-5" />}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm hover:shadow transition-shadow">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Indikasi Kejanggalan
                </p>
                <h3 className="text-xl font-bold text-red-600 mt-1">
                  {anomaliesCount} Terdeteksi
                </h3>
                <span className="text-xs text-slate-500 mt-1 block">
                  {pendingCount} Perlu verifikasi
                </span>
              </div>
              <div className="h-11 w-11 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <Card className="border-slate-200 shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
            {/* Search */}
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Cari toko, pengirim, chat..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 bg-slate-50 border-slate-200"
              />
            </div>

            {/* Filter Tabs */}
            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              <div className="flex items-center bg-slate-100 p-1 rounded-lg text-xs font-medium">
                {['ALL', 'PENDING', 'APPROVED', 'FLAGGED', 'REJECTED'].map((st) => (
                  <button
                    key={st}
                    onClick={() => setStatusFilter(st)}
                    className={cn(
                      "px-3 py-1.5 rounded-md transition-colors capitalize",
                      statusFilter === st
                        ? "bg-white text-slate-900 shadow-sm font-semibold"
                        : "text-slate-600 hover:text-slate-900"
                    )}
                  >
                    {st === 'ALL' ? 'Semua Status' : st.toLowerCase()}
                  </button>
                ))}
              </div>

              <div className="flex items-center bg-slate-100 p-1 rounded-lg text-xs font-medium">
                {[
                  { key: 'ALL', label: 'Semua Selisih' },
                  { key: 'MATCH', label: 'Pas' },
                  { key: 'OVERPAID', label: 'Lebih' },
                  { key: 'UNDERPAID', label: 'Kurang' }
                ].map((item) => (
                  <button
                    key={item.key}
                    onClick={() => setDiffFilter(item.key)}
                    className={cn(
                      "px-2.5 py-1.5 rounded-md transition-colors",
                      diffFilter === item.key
                        ? "bg-white text-slate-900 shadow-sm font-semibold"
                        : "text-slate-600 hover:text-slate-900"
                    )}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reimbursements Data List / Table */}
      <Card className="border-slate-200 shadow-sm overflow-hidden">
        <CardHeader className="py-4 px-6 border-b border-slate-100 bg-slate-50/50 flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-base font-semibold text-slate-800">
              Daftar Bukti Klaim Reimburse
            </CardTitle>
            <Badge variant="secondary" className="bg-slate-200/80 text-slate-700">
              {reimbursements.length} Data
            </Badge>
          </div>
        </CardHeader>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 text-xs font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-4">Nota & Bukti</th>
                <th className="py-3.5 px-4">Toko / Merchant</th>
                <th className="py-3.5 px-4">Pengirim & Chat</th>
                <th className="py-3.5 px-4 text-right">Klaim Transfer</th>
                <th className="py-3.5 px-4 text-right">Total Nota</th>
                <th className="py-3.5 px-4 text-center">Selisih</th>
                <th className="py-3.5 px-4 text-center">Kejanggalan</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <RefreshCw className="h-6 w-6 animate-spin text-blue-500" />
                      <span>Memuat data reimbursement...</span>
                    </div>
                  </td>
                </tr>
              ) : reimbursements.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Receipt className="h-8 w-8 text-slate-300" />
                      <p className="font-medium text-slate-600">Belum ada data reimbursement</p>
                      <p className="text-xs text-slate-400 max-w-sm">
                        Kirim pesan gambar dengan caption <code>#reimburse</code> yang me-reply gambar nota/struk belanja di WhatsApp.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                reimbursements.map((item) => {
                  const hasAnomalies = item.anomalies && item.anomalies.length > 0;
                  const diffVal = Number(item.difference_amount) || 0;

                  return (
                    <tr
                      key={item.id}
                      className={cn(
                        "hover:bg-slate-50/80 transition-colors",
                        selectedItem?.id === item.id && "bg-blue-50/40"
                      )}
                    >
                      {/* Image Thumbnails */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5">
                          {/* Image 1: Reimburse Proof */}
                          <button
                            type="button"
                            onClick={() => setPreviewImage({
                              url: getImageUrl(item, 'reimburse'),
                              title: `Bukti Transfer #reimburse - ${item.sender_name || 'Pengirim'}`
                            })}
                            className="relative group h-12 w-12 rounded-lg border border-slate-200 bg-slate-100 overflow-hidden flex-shrink-0 shadow-sm hover:border-blue-400 transition"
                            title="Klik untuk perbesar bukti transfer"
                          >
                            <img
                              src={getImageUrl(item, 'reimburse')}
                              alt="Transfer"
                              className="h-full w-full object-cover group-hover:scale-105 transition duration-200"
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = 'none';
                              }}
                            />
                            <span className="absolute bottom-0 inset-x-0 bg-black/60 text-[9px] text-white text-center font-mono py-0.5">
                              TF
                            </span>
                          </button>

                          <ArrowRight className="h-3 w-3 text-slate-300 flex-shrink-0" />

                          {/* Image 2: Quoted Receipt */}
                          <button
                            type="button"
                            onClick={() => setPreviewImage({
                              url: getImageUrl(item, 'receipt'),
                              title: `Struk Nota Belanja - ${item.merchant_name || 'Toko'}`
                            })}
                            className="relative group h-12 w-12 rounded-lg border border-slate-200 bg-slate-100 overflow-hidden flex-shrink-0 shadow-sm hover:border-blue-400 transition"
                            title="Klik untuk perbesar nota belanja"
                          >
                            <img
                              src={getImageUrl(item, 'receipt')}
                              alt="Struk"
                              className="h-full w-full object-cover group-hover:scale-105 transition duration-200"
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = 'none';
                              }}
                            />
                            <span className="absolute bottom-0 inset-x-0 bg-black/60 text-[9px] text-white text-center font-mono py-0.5">
                              Nota
                            </span>
                          </button>
                        </div>
                      </td>

                      {/* Merchant & Dates */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                          <Store className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                          <span>{item.merchant_name || 'Toko / Merchant'}</span>
                        </div>
                        <div className="text-xs text-slate-500 mt-1 flex flex-col gap-0.5">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3 text-slate-400" />
                            Nota: {item.receipt_date || '-'}
                          </span>
                          <span className="text-[11px] text-slate-400">
                            Reimburse: {item.reimburse_date || '-'}
                          </span>
                        </div>
                      </td>

                      {/* Sender & Chat */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                          <User className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                          <span className="truncate max-w-[170px]" title={item.sender_name || item.sender_phone || 'WhatsApp User'}>
                            {item.sender_name || item.sender_phone || 'WhatsApp User'}
                          </span>
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5 flex flex-col gap-0.5">
                          {item.sender_phone && item.sender_name && item.sender_phone !== item.sender_name && (
                            <span className="text-[11px] text-slate-400 font-mono">
                              +{item.sender_phone}
                            </span>
                          )}
                          <span className="truncate max-w-[170px] text-slate-500" title={item.chat_name || item.chat_id || 'Chat WhatsApp'}>
                            {item.chat_name || item.chat_id || 'Chat WhatsApp'}
                          </span>
                        </div>
                      </td>

                      {/* Reimburse Amount */}
                      <td className="py-3.5 px-4 text-right font-semibold text-slate-900">
                        {formatRupiah(item.reimburse_amount)}
                      </td>

                      {/* Receipt Amount */}
                      <td className="py-3.5 px-4 text-right font-semibold text-slate-900">
                        {formatRupiah(item.receipt_amount)}
                      </td>

                      {/* Difference Badge */}
                      <td className="py-3.5 px-4 text-center">
                        {item.difference_status === 'MATCH' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">
                            <Check className="h-3 w-3" /> Pas
                          </span>
                        ) : item.difference_status === 'OVERPAID' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
                            <TrendingUp className="h-3 w-3" /> +{formatRupiah(diffVal)}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                            <TrendingDown className="h-3 w-3" /> -{formatRupiah(Math.abs(diffVal))}
                          </span>
                        )}
                      </td>

                      {/* Kejanggalan Indicator */}
                      <td className="py-3.5 px-4 text-center">
                        {hasAnomalies ? (
                          <span
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 cursor-pointer"
                            onClick={() => setSelectedItem(item)}
                            title="Klik untuk lihat detail kejanggalan"
                          >
                            <AlertTriangle className="h-3 w-3" />
                            {item.anomalies!.length} Kejanggalan
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs text-slate-400">
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                            Wajar
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 text-center">
                        <Badge
                          variant={
                            item.status === 'APPROVED' ? 'success' :
                            item.status === 'REJECTED' ? 'destructive' :
                            item.status === 'FLAGGED' ? 'warning' : 'secondary'
                          }
                          className="capitalize text-xs font-medium"
                        >
                          {item.status.toLowerCase()}
                        </Badge>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-center">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedItem(item)}
                          className="h-8 px-2.5 text-xs text-blue-600 hover:text-blue-700 border-blue-200 hover:bg-blue-50 flex items-center gap-1"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          <span>Periksa</span>
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Detail Modal / Drawer */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-slate-200">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/10 rounded-xl text-blue-600">
                  <Receipt className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-lg">
                    Rincian Verifikasi Reimbursement #{selectedItem.id}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {selectedItem.chat_name} &bull; {selectedItem.sender_name ? `${selectedItem.sender_name}${selectedItem.sender_phone && selectedItem.sender_phone !== selectedItem.sender_name ? ` (+${selectedItem.sender_phone})` : ''}` : (selectedItem.sender_phone ? `+${selectedItem.sender_phone}` : 'WhatsApp User')}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => reanalyzeMutation.mutate(selectedItem.id)}
                  disabled={reanalyzeMutation.isPending}
                  className="text-xs flex items-center gap-1 border-purple-200 text-purple-700 hover:bg-purple-50"
                  title="Jalankan ulang analisis Gemini AI untuk kedua gambar ini"
                >
                  <Sparkles className={cn("h-3.5 w-3.5 text-purple-600", reanalyzeMutation.isPending && "animate-spin")} />
                  <span>{reanalyzeMutation.isPending ? "Menganalisa..." : "Re-analisis AI"}</span>
                </Button>

                <button
                  onClick={() => setSelectedItem(null)}
                  className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Modal Body Scrollable */}
            <div className="p-6 overflow-y-auto space-y-6">
              {/* Top Side-by-Side Images */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Image 1: Transfer Proof (#reimburse) */}
                <div className="border border-slate-200 rounded-xl p-3 bg-slate-50/50 flex flex-col">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-blue-500"></span>
                      1. Bukti Transfer (#reimburse)
                    </span>
                    <button
                      type="button"
                      onClick={() => setPreviewImage({
                        url: getImageUrl(selectedItem, 'reimburse'),
                        title: 'Bukti Transfer Pembayaran Reimbursement'
                      })}
                      className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                    >
                      <Maximize2 className="h-3 w-3" /> Zoom
                    </button>
                  </div>
                  <div className="h-52 w-full bg-slate-900/5 rounded-lg border border-slate-200 overflow-hidden flex items-center justify-center relative">
                    <img
                      src={getImageUrl(selectedItem, 'reimburse')}
                      alt="Bukti Transfer"
                      className="max-h-full max-w-full object-contain cursor-pointer hover:opacity-95"
                      onClick={() => setPreviewImage({
                        url: getImageUrl(selectedItem, 'reimburse'),
                        title: 'Bukti Transfer Pembayaran Reimbursement'
                      })}
                    />
                  </div>
                  <div className="mt-2 text-xs space-y-1">
                    <div className="flex justify-between text-slate-600">
                      <span>Nominal Transfer:</span>
                      <span className="font-bold text-slate-900">{formatRupiah(selectedItem.reimburse_amount)}</span>
                    </div>
                    <div className="flex justify-between text-slate-500">
                      <span>Tanggal Transfer:</span>
                      <span>{selectedItem.reimburse_date || '-'}</span>
                    </div>
                  </div>
                </div>

                {/* Image 2: Quoted Receipt */}
                <div className="border border-slate-200 rounded-xl p-3 bg-slate-50/50 flex flex-col">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                      2. Nota / Struk Toko (Pesan Yang Di-Reply)
                    </span>
                    <button
                      type="button"
                      onClick={() => setPreviewImage({
                        url: getImageUrl(selectedItem, 'receipt'),
                        title: 'Struk / Nota Belanja Asli'
                      })}
                      className="text-xs text-emerald-600 hover:underline flex items-center gap-1"
                    >
                      <Maximize2 className="h-3 w-3" /> Zoom
                    </button>
                  </div>
                  <div className="h-52 w-full bg-slate-900/5 rounded-lg border border-slate-200 overflow-hidden flex items-center justify-center relative">
                    <img
                      src={getImageUrl(selectedItem, 'receipt')}
                      alt="Nota Toko"
                      className="max-h-full max-w-full object-contain cursor-pointer hover:opacity-95"
                      onClick={() => setPreviewImage({
                        url: getImageUrl(selectedItem, 'receipt'),
                        title: 'Struk / Nota Belanja Asli'
                      })}
                    />
                  </div>
                  <div className="mt-2 text-xs space-y-1">
                    <div className="flex justify-between text-slate-600">
                      <span>Toko / Merchant:</span>
                      <span className="font-bold text-slate-900">{selectedItem.merchant_name || '-'}</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Total Nota:</span>
                      <span className="font-bold text-slate-900">{formatRupiah(selectedItem.receipt_amount)}</span>
                    </div>
                    <div className="flex justify-between text-slate-500">
                      <span>Tanggal Nota:</span>
                      <span>{selectedItem.receipt_date || '-'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Comparison & Difference Banner */}
              <div className={cn(
                "p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3",
                selectedItem.difference_status === 'MATCH' ? "bg-emerald-50/70 border-emerald-200" :
                selectedItem.difference_status === 'OVERPAID' ? "bg-amber-50/70 border-amber-200" :
                "bg-blue-50/70 border-blue-200"
              )}>
                <div>
                  <h4 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                    {selectedItem.difference_status === 'MATCH' && (
                      <>
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        <span>Nominal Sesuai (Pas)</span>
                      </>
                    )}
                    {selectedItem.difference_status === 'OVERPAID' && (
                      <>
                        <AlertTriangle className="h-4 w-4 text-amber-600" />
                        <span>Klaim Reimburse Lebih Besar Dari Nota</span>
                      </>
                    )}
                    {selectedItem.difference_status === 'UNDERPAID' && (
                      <>
                        <AlertTriangle className="h-4 w-4 text-blue-600" />
                        <span>Klaim Reimburse Lebih Kecil Dari Nota</span>
                      </>
                    )}
                  </h4>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Klaim: {formatRupiah(selectedItem.reimburse_amount)} &bull; Nota: {formatRupiah(selectedItem.receipt_amount)}
                  </p>
                </div>
                <div className="text-right">
                  <div className={cn(
                    "text-lg font-extrabold",
                    selectedItem.difference_status === 'MATCH' ? "text-emerald-700" :
                    selectedItem.difference_status === 'OVERPAID' ? "text-amber-700" : "text-blue-700"
                  )}>
                    {selectedItem.difference_status === 'MATCH' ? 'Selisih Rp 0' :
                     selectedItem.difference_status === 'OVERPAID' ? `Lebih +${formatRupiah(selectedItem.difference_amount)}` :
                     `Kurang -${formatRupiah(Math.abs(Number(selectedItem.difference_amount)))}`}
                  </div>
                </div>
              </div>

              {/* Itemized Breakdown Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Receipt className="h-3.5 w-3.5 text-slate-500" />
                    Rincian Barang / Menu Pada Nota
                  </h4>
                  <span className="text-xs text-slate-500">
                    {selectedItem.items_breakdown?.length || 0} item terdeteksi
                  </span>
                </div>
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100/70 text-slate-600 border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-4">Nama Barang</th>
                      <th className="py-2.5 px-4 text-center">Qty</th>
                      <th className="py-2.5 px-4 text-right">Harga Satuan</th>
                      <th className="py-2.5 px-4 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedItem.items_breakdown && selectedItem.items_breakdown.length > 0 ? (
                      selectedItem.items_breakdown.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="py-2 px-4 font-medium text-slate-800">{item.name}</td>
                          <td className="py-2 px-4 text-center text-slate-600">{item.qty || 1}</td>
                          <td className="py-2 px-4 text-right text-slate-600">{formatRupiah(item.price)}</td>
                          <td className="py-2 px-4 text-right font-semibold text-slate-900">{formatRupiah(item.total)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="py-4 text-center text-slate-400">
                          Tidak ada rincian item individual pada nota atau rincian berupa total langsung.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Anomalies & Discrepancies Card */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldAlert className="h-4 w-4 text-slate-500" />
                  Pemeriksaan Kejanggalan (Anomaly Check)
                </h4>
                {selectedItem.anomalies && selectedItem.anomalies.length > 0 ? (
                  <div className="space-y-2">
                    {selectedItem.anomalies.map((anom, idx) => {
                      const desc = typeof anom === 'string' ? anom : anom.description;
                      const type = typeof anom === 'object' && anom.type ? anom.type : 'Indikasi Kejanggalan';
                      const severity = typeof anom === 'object' && anom.severity ? anom.severity : 'medium';

                      return (
                        <div
                          key={idx}
                          className={cn(
                            "p-3 rounded-lg border text-xs flex items-start gap-2.5",
                            severity === 'high' ? "bg-red-50/80 border-red-200 text-red-800" :
                            severity === 'medium' ? "bg-amber-50/80 border-amber-200 text-amber-800" :
                            "bg-slate-50 border-slate-200 text-slate-700"
                          )}
                        >
                          <AlertTriangle className={cn(
                            "h-4 w-4 flex-shrink-0 mt-0.5",
                            severity === 'high' ? "text-red-600" :
                            severity === 'medium' ? "text-amber-600" : "text-slate-500"
                          )} />
                          <div>
                            <span className="font-bold uppercase tracking-wider text-[10px] block opacity-80">
                              {type} &bull; Severity {severity}
                            </span>
                            <p className="mt-0.5 font-medium">{desc}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                    <span>Tidak ditemukan kejanggalan pada nominal, tanggal, maupun keaslian struk.</span>
                  </div>
                )}
              </div>

              {/* Gemini AI Notes */}
              {selectedItem.ai_notes && (
                <div className="p-4 bg-purple-50/60 border border-purple-200 rounded-xl text-xs space-y-1">
                  <div className="flex items-center gap-1.5 text-purple-800 font-bold uppercase tracking-wider text-[11px]">
                    <Sparkles className="h-3.5 w-3.5 text-purple-600" />
                    Catatan Analisis by AI
                  </div>
                  <p className="text-slate-700 whitespace-pre-line leading-relaxed">
                    {selectedItem.ai_notes}
                  </p>
                </div>
              )}
            </div>

            {/* Modal Footer / Action Buttons */}
            <div className="px-6 py-4 border-t border-slate-200 bg-slate-50/70 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">Ubah Status:</span>
                <Button
                  size="sm"
                  variant={selectedItem.status === 'APPROVED' ? 'default' : 'outline'}
                  onClick={() => statusMutation.mutate({ id: selectedItem.id, status: 'APPROVED' })}
                  disabled={statusMutation.isPending}
                  className={cn(
                    "text-xs h-8",
                    selectedItem.status === 'APPROVED' && "bg-emerald-600 hover:bg-emerald-700 text-white"
                  )}
                >
                  <Check className="h-3.5 w-3.5 mr-1" /> Setujui (Approve)
                </Button>

                <Button
                  size="sm"
                  variant={selectedItem.status === 'FLAGGED' ? 'default' : 'outline'}
                  onClick={() => statusMutation.mutate({ id: selectedItem.id, status: 'FLAGGED' })}
                  disabled={statusMutation.isPending}
                  className={cn(
                    "text-xs h-8",
                    selectedItem.status === 'FLAGGED' && "bg-amber-600 hover:bg-amber-700 text-white"
                  )}
                >
                  <Flag className="h-3.5 w-3.5 mr-1" /> Tandai (Flag)
                </Button>

                <Button
                  size="sm"
                  variant={selectedItem.status === 'REJECTED' ? 'default' : 'outline'}
                  onClick={() => statusMutation.mutate({ id: selectedItem.id, status: 'REJECTED' })}
                  disabled={statusMutation.isPending}
                  className={cn(
                    "text-xs h-8",
                    selectedItem.status === 'REJECTED' && "bg-red-600 hover:bg-red-700 text-white"
                  )}
                >
                  <XCircle className="h-3.5 w-3.5 mr-1" /> Tolak (Reject)
                </Button>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedItem(null)}
                className="text-xs h-8"
              >
                Tutup
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Fullscreen Image Preview Modal (Lightbox) */}
      {previewImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150"
          onClick={() => setPreviewImage(null)}
        >
          <div
            className="relative max-w-4xl max-h-[90vh] bg-slate-900 rounded-2xl overflow-hidden shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-4 py-3 bg-slate-800 text-white flex items-center justify-between text-xs font-semibold">
              <span>{previewImage.title}</span>
              <button
                onClick={() => setPreviewImage(null)}
                className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-700 transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-4 flex items-center justify-center overflow-auto max-h-[80vh]">
              <img
                src={previewImage.url}
                alt={previewImage.title}
                className="max-h-[75vh] max-w-full object-contain rounded-lg shadow-md"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReimbursementPage;
