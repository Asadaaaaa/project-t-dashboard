import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import { AutoSummaryConfig, WhatsappChat } from '../types';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import {
  Clock,
  Send,
  MessageSquare,
  CheckCircle2,
  AlertCircle,
  Save,
  RefreshCw,
  Sliders,
  Search,
  ChevronDown,
  X,
  UserX
} from 'lucide-react';

import { getSocket } from '../lib/socket';
import { ContactExceptionsTab } from '../components/config/ContactExceptionsTab';


export const ConfigPage: React.FC = () => {
  const queryClient = useQueryClient();

  const [isEnabled, setIsEnabled] = useState<boolean>(false);
  const [sendTime, setSendTime] = useState<string>('18:00');
  const [targetChatId, setTargetChatId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [alertMsg, setAlertMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // 1. Fetch Config
  const { data: configData } = useQuery<{ data: AutoSummaryConfig }>({
    queryKey: ['autoSummaryConfig'],
    queryFn: async () => {
      const res = await api.get('/config/auto-summary');
      return res.data;
    }
  });

  // 2. Fetch WhatsApp Connection Status
  const { data: sessionData } = useQuery({
    queryKey: ['whatsapp-status'],
    queryFn: async () => {
      const res = await api.get('/whatsapp/status');
      return res.data?.data;
    }
  });

  const whatsappStatus = sessionData?.details?.status || sessionData?.session?.status || 'disconnected';
  const isWhatsAppConnected = whatsappStatus === 'connected';

  // Listen to realtime WhatsApp status updates via WebSocket
  useEffect(() => {
    const socket = getSocket();
    const handleStatusUpdated = (payload: any) => {
      queryClient.setQueryData(['whatsapp-status'], (old: any) => ({
        ...old,
        session: {
          ...(old?.session || {}),
          status: payload.status,
          phone_number: payload.phoneNumber || old?.session?.phone_number
        },
        details: {
          ...(old?.details || {}),
          status: payload.status,
          phoneNumber: payload.phoneNumber || old?.details?.phoneNumber
        }
      }));
      queryClient.invalidateQueries({ queryKey: ['whatsapp-status'] });
      queryClient.invalidateQueries({ queryKey: ['whatsappChats'] });
    };
    socket.on('whatsapp:status_updated', handleStatusUpdated);
    return () => { socket.off('whatsapp:status_updated', handleStatusUpdated); };
  }, [queryClient]);

  // 3. Fetch Available WhatsApp Chats
  const { data: chatsData, isLoading: isLoadingChats, refetch: refetchChats } = useQuery<{ data: WhatsappChat[] }>({
    queryKey: ['whatsappChats'],
    queryFn: async () => {
      const res = await api.get('/whatsapp/chats');
      return res.data;
    }
  });

  const rawChats = chatsData?.data || [];

  // Close dropdown when clicked outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Sync loaded config to form
  useEffect(() => {
    if (configData?.data) {
      const cfg = configData.data;
      setIsEnabled(!!cfg.is_enabled);
      setSendTime(cfg.send_time || '18:00');
      setTargetChatId(cfg.target_chat_id || '');
    }
  }, [configData]);

  // Sync display search query with selected chat
  useEffect(() => {
    if (targetChatId && rawChats.length > 0) {
      const found = rawChats.find((c) => c.whatsapp_chat_id === targetChatId);
      if (found) setSearchQuery(found.name || found.phone_number || found.whatsapp_chat_id);
    }
  }, [targetChatId, rawChats]);

  // Filtered chats
  const filteredChats = rawChats.filter((chat) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (chat.name || '').toLowerCase().includes(q) ||
      (chat.whatsapp_chat_id || '').toLowerCase().includes(q) ||
      (chat.phone_number || '').toLowerCase().includes(q)
    );
  });
  const filteredGroups = filteredChats.filter((c) => c.is_group);
  const filteredContacts = filteredChats.filter((c) => !c.is_group);

  const isDirty = Boolean(configData?.data) && (
    isEnabled !== Boolean(configData?.data?.is_enabled) ||
    sendTime !== (configData?.data?.send_time || '18:00') ||
    targetChatId !== (configData?.data?.target_chat_id || '')
  );

  const saveMutation = useMutation({
    mutationFn: async (payload: Partial<AutoSummaryConfig>) => {
      const res = await api.post('/config/auto-summary', payload);
      return res.data;
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['autoSummaryConfig'] });
      setAlertMsg({ type: 'success', text: res?.message || 'Konfigurasi berhasil disimpan!' });
      setTimeout(() => setAlertMsg(null), 4000);
    },
    onError: (err: any) => {
      setAlertMsg({ type: 'error', text: err.response?.data?.message || err.message || 'Gagal menyimpan konfigurasi' });
    }
  });

  const testSendMutation = useMutation({
    mutationFn: async () => {
      const selectedChatObj = rawChats.find((c) => c.whatsapp_chat_id === targetChatId);
      const res = await api.post('/config/auto-summary/test-send', {
        target_chat_id: targetChatId,
        target_chat_name: selectedChatObj ? selectedChatObj.name : targetChatId
      });
      return res.data;
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['autoSummaryConfig'] });
      setAlertMsg({ type: 'success', text: res?.message || 'Summary berhasil dikirim ke room chat!' });
      setTimeout(() => setAlertMsg(null), 5000);
    },
    onError: (err: any) => {
      setAlertMsg({ type: 'error', text: err.response?.data?.message || err.message || 'Gagal mengirim test summary' });
    }
  });

  const handleSave = () => {
    if (isEnabled && !targetChatId) {
      setAlertMsg({ type: 'error', text: 'Silakan pilih room chat tujuan terlebih dahulu.' });
      return;
    }
    const selectedChatObj = rawChats.find((c) => c.whatsapp_chat_id === targetChatId);
    saveMutation.mutate({
      is_enabled: isEnabled,
      send_time: sendTime,
      target_chat_id: targetChatId || null,
      target_chat_name: selectedChatObj ? selectedChatObj.name : null,
      target_chat_type: selectedChatObj ? (selectedChatObj.is_group ? 'group' : 'contact') : 'group'
    });
  };

  const currentConfig = configData?.data;
  const isSaveDisabled = !isDirty || saveMutation.isPending || (isEnabled && !targetChatId);
  const isTestSendDisabled = !targetChatId || !isWhatsAppConnected || testSendMutation.isPending;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Page Title */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Config</h1>
        <p className="text-sm text-slate-500 mt-1">
          Pengaturan otomatisasi sistem, integrasi WhatsApp, dan filter pengecualian kontak
        </p>
      </div>

      {/* Global Alert */}
      {alertMsg && (
        <div
          className={`p-3.5 rounded-lg flex items-center gap-2.5 text-sm ${
            alertMsg.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          {alertMsg.type === 'success' ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
          ) : (
            <AlertCircle className="h-4 w-4 text-rose-600 flex-shrink-0" />
          )}
          <span className="flex-1 font-medium">{alertMsg.text}</span>
          <button onClick={() => setAlertMsg(null)} className="text-slate-400 hover:text-slate-600 text-xs font-bold">✕</button>
        </div>
      )}

      {/* ─── Section 1: Auto Send Summary ─── */}
      <Card className="border border-slate-200 shadow-sm bg-white">
        <CardHeader className="pb-4 border-b border-slate-100">
          <CardTitle className="text-base font-semibold text-slate-800 flex items-center gap-2">
            <Sliders className="h-4 w-4 text-blue-600" />
            Auto Send Summary
          </CardTitle>
          <p className="text-xs text-slate-500 mt-0.5">
            Kirim ringkasan harian otomatis ke room chat WhatsApp sesuai jam yang ditentukan
          </p>
        </CardHeader>

        <CardContent className="p-0 divide-y divide-slate-100">

          {/* Row: Enable toggle */}
          <div className="grid grid-cols-3 gap-6 px-6 py-4 items-center">
            <p className="text-sm font-medium text-slate-900">Enable Auto Send</p>
            <p className="text-xs text-slate-500">Aktifkan pengiriman ringkasan harian secara otomatis setiap hari</p>
            <div className="flex justify-end">
              <button
                type="button"
                role="switch"
                aria-checked={isEnabled}
                onClick={() => setIsEnabled(!isEnabled)}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${isEnabled ? 'bg-blue-600' : 'bg-slate-200'}`}
              >
                <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${isEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
            </div>
          </div>

          {/* Row: Jam Pengiriman */}
          <div className={`grid grid-cols-3 gap-6 px-6 py-4 items-center transition-opacity duration-200 ${!isEnabled ? 'opacity-40 pointer-events-none' : ''}`}>
            <p className="text-sm font-medium text-slate-900 flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-slate-400" />
              Jam Pengiriman
            </p>
            <p className="text-xs text-slate-500">Ringkasan dikirim otomatis setiap hari pada jam ini (WIB)</p>
            <div className="flex justify-end">
              <Input
                type="time"
                value={sendTime}
                onChange={(e) => setSendTime(e.target.value)}
                disabled={!isEnabled}
                className="font-medium text-slate-800 h-9 w-36 text-sm"
              />
            </div>
          </div>

          {/* Row: Target Chat */}
          <div className={`grid grid-cols-3 gap-6 px-6 py-4 items-start transition-opacity duration-200 ${!isEnabled ? 'opacity-40 pointer-events-none' : ''}`}>
            <p className="text-sm font-medium text-slate-900 flex items-center gap-1.5 pt-1">
              <MessageSquare className="h-3.5 w-3.5 text-slate-400" />
              Kirim ke
            </p>
            <p className="text-xs text-slate-500 pt-1">Pilih grup atau kontak WhatsApp sebagai tujuan pengiriman ringkasan harian</p>
            <div className="relative" ref={dropdownRef}>
              <div className="flex justify-end mb-1">
                <button
                  type="button"
                  onClick={() => refetchChats()}
                  disabled={isLoadingChats || !isEnabled}
                  className="text-[11px] text-blue-600 hover:text-blue-800 flex items-center gap-1"
                >
                  <RefreshCw className={`h-2.5 w-2.5 ${isLoadingChats ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
              </div>
              <div className="relative">
                <Search className="h-3.5 w-3.5 text-slate-400 absolute left-2.5 top-2.5 pointer-events-none" />
                <Input
                  type="text"
                  value={searchQuery}
                  placeholder="Cari grup atau kontak..."
                  onFocus={() => isEnabled && setIsDropdownOpen(true)}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setIsDropdownOpen(true);
                    if (!e.target.value) setTargetChatId('');
                  }}
                  disabled={!isEnabled}
                  className="pl-8 pr-7 text-xs h-9 bg-white border-slate-200 focus:ring-2 focus:ring-blue-600"
                />
                {searchQuery ? (
                  <button type="button" onClick={() => { setSearchQuery(''); setTargetChatId(''); setIsDropdownOpen(true); }} className="absolute right-2 top-2.5 text-slate-400 hover:text-slate-600">
                    <X className="h-3.5 w-3.5" />
                  </button>
                ) : (
                  <ChevronDown className="h-3.5 w-3.5 text-slate-400 absolute right-2 top-2.5 pointer-events-none" />
                )}
              </div>

              {isDropdownOpen && isEnabled && (
                <div className="absolute z-20 w-full mt-1 bg-white rounded-lg border border-slate-200 shadow-lg max-h-56 overflow-y-auto divide-y divide-slate-100 text-sm">
                  {isLoadingChats ? (
                    <div className="p-3 text-center text-xs text-slate-400">Memuat daftar chat...</div>
                  ) : filteredChats.length === 0 ? (
                    <div className="p-3 text-center text-xs text-slate-400">
                      {searchQuery ? `Tidak ada yang cocok dengan "${searchQuery}".` : 'Belum ada daftar chat.'}
                    </div>
                  ) : (
                    <>
                      {filteredGroups.length > 0 && (
                        <div>
                          <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50">
                            👥 Grup ({filteredGroups.length})
                          </div>
                          {filteredGroups.map((chat) => (
                            <button
                              key={chat.whatsapp_chat_id}
                              type="button"
                              onClick={() => { setTargetChatId(chat.whatsapp_chat_id); setSearchQuery(chat.name || chat.whatsapp_chat_id); setIsDropdownOpen(false); }}
                              className={`w-full text-left px-3 py-2 flex items-center justify-between hover:bg-blue-50 transition-colors ${targetChatId === chat.whatsapp_chat_id ? 'bg-blue-50/70 font-semibold text-blue-700' : 'text-slate-700'}`}
                            >
                              <div className="truncate pr-2">
                                <span className="truncate text-xs">{chat.name || chat.whatsapp_chat_id}</span>
                                <span className="block text-[10px] text-slate-400 font-mono truncate">{chat.whatsapp_chat_id}</span>
                              </div>
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 flex-shrink-0">Grup</span>
                            </button>
                          ))}
                        </div>
                      )}
                      {filteredContacts.length > 0 && (
                        <div>
                          <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50">
                            👤 Kontak ({filteredContacts.length})
                          </div>
                          {filteredContacts.map((chat) => (
                            <button
                              key={chat.whatsapp_chat_id}
                              type="button"
                              onClick={() => { setTargetChatId(chat.whatsapp_chat_id); setSearchQuery(chat.name || chat.phone_number || chat.whatsapp_chat_id); setIsDropdownOpen(false); }}
                              className={`w-full text-left px-3 py-2 flex items-center justify-between hover:bg-blue-50 transition-colors ${targetChatId === chat.whatsapp_chat_id ? 'bg-blue-50/70 font-semibold text-blue-700' : 'text-slate-700'}`}
                            >
                              <div className="truncate pr-2">
                                <span className="truncate text-xs">{chat.name || chat.phone_number || chat.whatsapp_chat_id}</span>
                                <span className="block text-[10px] text-slate-400 font-mono truncate">{chat.whatsapp_chat_id}</span>
                              </div>
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 flex-shrink-0">Kontak</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
              {targetChatId && (
                <p className="text-[10px] text-slate-400 font-mono mt-1 truncate">{targetChatId}</p>
              )}
            </div>
          </div>

          {/* Row: Last Sent (read-only) */}
          {currentConfig?.last_sent_at && (
            <div className="grid grid-cols-3 gap-6 px-6 py-3 items-center bg-slate-50/60">
              <p className="text-xs font-medium text-slate-600">Terakhir Dikirim</p>
              <p className="text-xs text-slate-500">Status pengiriman ringkasan terakhir</p>
              <div className="flex items-center justify-end gap-2">
                <span className="text-xs text-slate-600">
                  {new Date(currentConfig.last_sent_at).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta', dateStyle: 'short', timeStyle: 'short' })} WIB
                </span>
                <span className={`text-[11px] font-semibold px-1.5 py-0.5 rounded-full ${currentConfig.last_sent_status === 'success' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                  {currentConfig.last_sent_status === 'success' ? 'Sukses' : 'Gagal'}
                </span>
              </div>
            </div>
          )}

          {/* Row: Actions */}
          <div className="grid grid-cols-3 gap-6 px-6 py-4 items-center">
            <p className="text-sm font-medium text-slate-900">Aksi</p>
            <p className="text-xs text-slate-500">
              Simpan perubahan atau kirim test ringkasan sekarang
              {!isWhatsAppConnected && <span className="block text-amber-600 mt-0.5">(WhatsApp belum terhubung)</span>}
            </p>
            <div className="flex items-center gap-2 justify-end">
              <Button
                onClick={handleSave}
                disabled={isSaveDisabled}
                className="bg-blue-600 hover:bg-blue-700 text-white gap-1.5 h-9 px-4 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saveMutation.isPending ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                Simpan
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => testSendMutation.mutate()}
                disabled={isTestSendDisabled}
                title={!isWhatsAppConnected ? 'WhatsApp belum terhubung' : !targetChatId ? 'Pilih room chat terlebih dahulu' : undefined}
                className="border-slate-200 text-slate-700 hover:bg-slate-50 gap-1.5 h-9 px-3 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {testSendMutation.isPending ? <RefreshCw className="h-3.5 w-3.5 animate-spin text-blue-600" /> : <Send className="h-3.5 w-3.5 text-blue-600" />}
                Test Kirim
              </Button>
            </div>
          </div>

        </CardContent>
      </Card>

      {/* ─── Section 2: Contact Exceptional ─── */}
      <div className="space-y-3">
        <div className="flex items-center gap-2.5">
          <UserX className="h-5 w-5 text-rose-600" />
          <div>
            <h2 className="text-base font-semibold text-slate-800">Contact Exceptional</h2>
            <p className="text-xs text-slate-500">
              Kontak yang dikecualikan tidak akan dibaca atau disimpan oleh sistem (Summary &amp; Reimbursement)
            </p>
          </div>
        </div>
        <ContactExceptionsTab />
      </div>
    </div>
  );
};

export default ConfigPage;

