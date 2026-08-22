import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import {
  QrCode,
  Wifi,
  WifiOff,
  RefreshCw,
  Phone,
  Calendar,
  CheckCircle,
  Play,
  Square
} from 'lucide-react';
import { formatDateTime } from '../lib/utils';

export const WhatsAppPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  // Status query (polling every 3s when connecting)
  const { data: statusData, isLoading: isStatusLoading } = useQuery({
    queryKey: ['whatsapp-status'],
    queryFn: async () => {
      const resp = await api.get('/whatsapp/status');
      return resp.data.data;
    },
    refetchInterval: 3000
  });

  const currentStatus = statusData?.details?.status || statusData?.session?.status || 'disconnected';
  const isConnected = currentStatus === 'connected';
  const isConnecting = currentStatus === 'connecting';
  const phoneNumber = statusData?.details?.phoneNumber || statusData?.session?.phone_number;
  const pushname = statusData?.details?.pushname;

  // QR query (polling every 3s when connecting / not connected)
  const { data: qrData, isLoading: isQrLoading } = useQuery({
    queryKey: ['whatsapp-qr'],
    queryFn: async () => {
      const resp = await api.get('/whatsapp/qr');
      return resp.data.data;
    },
    refetchInterval: 3000,
    enabled: isConnecting && !isConnected
  });

  const connectMutation = useMutation({
    mutationFn: async () => {
      const resp = await api.post('/whatsapp/connect');
      return resp.data;
    },
    onSuccess: () => {
      setActionMessage('Connecting initiated... Silakan scan QR code di samping.');
      queryClient.invalidateQueries({ queryKey: ['whatsapp-status'] });
      queryClient.invalidateQueries({ queryKey: ['whatsapp-qr'] });
    },
    onError: (err: any) => {
      setActionMessage(`Error connecting: ${err.message}`);
    }
  });

  const disconnectMutation = useMutation({
    mutationFn: async () => {
      const resp = await api.post('/whatsapp/disconnect');
      return resp.data;
    },
    onSuccess: () => {
      setActionMessage('WhatsApp disconnected dan session dibersihkan.');
      queryClient.invalidateQueries({ queryKey: ['whatsapp-status'] });
      queryClient.invalidateQueries({ queryKey: ['whatsapp-qr'] });
    }
  });

  const session = statusData?.session;
  const qrImage = qrData?.qrDataUrl;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">WhatsApp Connection</h1>
        <p className="text-sm text-slate-500">
          Kelola koneksi WhatsApp Web pribadi Anda untuk pemrosesan ringkasan AI harian
        </p>
      </div>

      {actionMessage && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800 flex items-center justify-between">
          <span>{actionMessage}</span>
          <button onClick={() => setActionMessage(null)} className="text-blue-500 hover:text-blue-700 text-xs font-semibold">
            Dismiss
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Main Status & Controls Card */}
        <div className="md:col-span-2 space-y-6">
          <Card className="border-slate-200/80 shadow-sm">
            <CardHeader className="pb-4 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-xl ${isConnected ? 'bg-emerald-50 text-emerald-600' : isConnecting ? 'bg-amber-50 text-amber-600' : 'bg-slate-100 text-slate-500'}`}>
                    {isConnected ? <Wifi className="h-5 w-5" /> : <WifiOff className="h-5 w-5" />}
                  </div>
                  <div>
                    <CardTitle className="text-base">Connection Status</CardTitle>
                    <CardDescription>
                      {isConnected
                        ? 'WhatsApp Web client aktif dan siap digunakan'
                        : isConnecting
                        ? 'Menghubungkan ke WhatsApp Web, silakan scan QR code di samping'
                        : 'WhatsApp client sedang offline/terputus'}
                    </CardDescription>
                  </div>
                </div>

                <Badge
                  variant={isConnected ? 'success' : isConnecting ? 'warning' : 'secondary'}
                  className="capitalize text-xs px-3 py-1"
                >
                  {currentStatus}
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="pt-6 space-y-4">
              {isConnected ? (
                <div className="bg-emerald-50/50 border border-emerald-200/60 rounded-xl p-5 space-y-4">
                  <div className="flex items-center gap-2 text-emerald-800 font-medium text-sm">
                    <CheckCircle className="h-4 w-4 text-emerald-600" />
                    <span>WhatsApp Terhubung ({pushname ? `${pushname}` : 'Aktif'})</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div className="bg-white p-3 rounded-lg border border-emerald-100">
                      <p className="text-slate-500 flex items-center gap-1 mb-1">
                        <Phone className="h-3.5 w-3.5" /> Nomor WhatsApp
                      </p>
                      <p className="font-semibold text-slate-800 text-sm">
                        {phoneNumber ? `+${phoneNumber}` : 'Connected'}
                      </p>
                    </div>

                    <div className="bg-white p-3 rounded-lg border border-emerald-100">
                      <p className="text-slate-500 flex items-center gap-1 mb-1">
                        <Calendar className="h-3.5 w-3.5" /> Terakhir Terhubung
                      </p>
                      <p className="font-semibold text-slate-800 text-sm">
                        {formatDateTime(session?.last_connected_at || new Date())}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 pt-2">
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => {
                        if (window.confirm('Apakah Anda yakin ingin memutuskan koneksi WhatsApp dan membersihkan sesi?')) {
                          disconnectMutation.mutate();
                        }
                      }}
                      disabled={disconnectMutation.isPending}
                      className="flex items-center gap-2"
                    >
                      <Square className="h-3.5 w-3.5" />
                      <span>Disconnect / Ganti Nomor</span>
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-sm text-slate-600">
                    Klik <strong>Connect WhatsApp</strong> untuk memulai pairing WhatsApp. Scan QR code yang muncul di layar dengan aplikasi WhatsApp di ponsel Anda.
                  </p>

                  <div className="flex items-center gap-3">
                    <Button
                      onClick={() => connectMutation.mutate()}
                      disabled={connectMutation.isPending || isConnecting}
                      className="flex items-center gap-2"
                    >
                      <Play className="h-3.5 w-3.5" />
                      <span>{isConnecting ? 'Menghubungkan...' : 'Connect WhatsApp'}</span>
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* QR Code Card */}
        <div>
          <Card className="border-slate-200/80 shadow-sm h-full flex flex-col justify-between">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2 text-slate-800">
                <QrCode className="h-4 w-4 text-blue-600" />
                <span>Pairing QR Code</span>
              </CardTitle>
              <CardDescription className="text-xs">
                Scan dengan WhatsApp &gt; Perangkat Tertaut
              </CardDescription>
            </CardHeader>

            <CardContent className="flex flex-col items-center justify-center py-6">
              {isConnected ? (
                <div className="text-center p-6 bg-slate-50 rounded-xl border border-slate-200/60 w-full">
                  <CheckCircle className="h-10 w-10 text-emerald-500 mx-auto mb-2" />
                  <p className="text-xs font-semibold text-slate-700">WhatsApp Aktif</p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Akun Anda telah terhubung. Saat generate summary, data chat tanggal tersebut akan otomatis diambil langsung dari WhatsApp.
                  </p>
                </div>
              ) : qrImage ? (
                <div className="flex flex-col items-center space-y-3">
                  <div className="p-3 bg-white border-2 border-blue-500 rounded-xl shadow-lg">
                    <img src={qrImage} alt="WhatsApp QR Code" className="h-52 w-52 object-contain" />
                  </div>
                  <span className="text-xs text-blue-600 font-medium flex items-center gap-1.5 animate-pulse">
                    <RefreshCw className="h-3 w-3 animate-spin" /> Menunggu scan...
                  </span>
                </div>
              ) : isConnecting ? (
                <div className="text-center p-8">
                  <RefreshCw className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-3" />
                  <p className="text-xs font-medium text-slate-600">Menyiapkan QR Code...</p>
                </div>
              ) : (
                <div className="text-center p-6 bg-slate-50 rounded-xl border border-dashed border-slate-300 w-full">
                  <QrCode className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs font-medium text-slate-600">QR Code Belum Aktif</p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Klik Connect WhatsApp untuk memunculkan QR Code pairing.
                  </p>
                </div>
              )}
            </CardContent>

            <CardFooter className="text-[11px] text-slate-400 border-t border-slate-100 pt-3">
              Data chat disinkronkan otomatis sesuai tanggal saat generate summary.
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
};
