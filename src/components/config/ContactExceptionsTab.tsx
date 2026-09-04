import React, { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import { ContactException, WhatsappChat } from '../../types';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import {
  UserX,
  User,
  Users,
  Search,
  Plus,
  Trash2,
  RefreshCw,
  ShieldAlert,
  ChevronDown,
  X,
  ShieldBan
} from 'lucide-react';

interface CardProps {
  onAlert?: (msg: { type: 'success' | 'error'; text: string }) => void;
}

/**
 * Kolom 2: Form Tambah Kontak Pengecualian
 */
export const AddContactExceptionCard: React.FC<CardProps> = ({ onAlert }) => {
  const queryClient = useQueryClient();

  // State for adding contact
  const [selectedChatId, setSelectedChatId] = useState<string>('');
  const [selectedChatName, setSelectedChatName] = useState<string>('');
  const [selectedChatPhone, setSelectedChatPhone] = useState<string>('');
  const [selectedChatType, setSelectedChatType] = useState<'contact' | 'group'>('contact');
  const [reason, setReason] = useState<string>('');

  // Selector dropdown state
  const [chatSearchQuery, setChatSearchQuery] = useState<string>('');
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
  const [isManualInput, setIsManualInput] = useState<boolean>(false);
  const [manualChatId, setManualChatId] = useState<string>('');
  const [manualName, setManualName] = useState<string>('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 1. Fetch Contact Exceptions (for filtering existing)
  const { data: exceptionsData } = useQuery<{ data: ContactException[] }>({
    queryKey: ['contactExceptions'],
    queryFn: async () => {
      const res = await api.get('/config/contact-exceptions');
      return res.data;
    }
  });
  const exceptionsList = exceptionsData?.data || [];
  const excludedSet = new Set(exceptionsList.map((e) => e.whatsapp_chat_id));

  // 2. Fetch WhatsApp Chats for quick selection
  const { data: chatsData, isLoading: isLoadingChats, refetch: refetchChats } = useQuery<{ data: WhatsappChat[] }>({
    queryKey: ['whatsappChats'],
    queryFn: async () => {
      const res = await api.get('/whatsapp/chats');
      return res.data;
    }
  });
  const rawChats = chatsData?.data || [];

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter available chats in dropdown
  const filteredAvailableChats = rawChats.filter((c) => {
    if (excludedSet.has(c.whatsapp_chat_id)) return false;
    if (!chatSearchQuery.trim()) return true;
    const q = chatSearchQuery.toLowerCase();
    const nameMatch = (c.name || '').toLowerCase().includes(q);
    const idMatch = (c.whatsapp_chat_id || '').toLowerCase().includes(q);
    const phoneMatch = (c.phone_number || '').toLowerCase().includes(q);
    return nameMatch || idMatch || phoneMatch;
  });

  // Add Mutation
  const addMutation = useMutation({
    mutationFn: async (payload: {
      whatsapp_chat_id: string;
      contact_name?: string;
      phone_number?: string;
      chat_type?: 'contact' | 'group';
      reason?: string;
    }) => {
      const res = await api.post('/config/contact-exceptions', payload);
      return res.data;
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['contactExceptions'] });
      setSelectedChatId('');
      setSelectedChatName('');
      setSelectedChatPhone('');
      setChatSearchQuery('');
      setReason('');
      setManualChatId('');
      setManualName('');
      setIsManualInput(false);

      if (onAlert) {
        onAlert({
          type: 'success',
          text: res?.message || 'Kontak berhasil ditambahkan ke daftar pengecualian!'
        });
      }
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || err.message || 'Gagal menambahkan kontak ke pengecualian';
      if (onAlert) {
        onAlert({ type: 'error', text: msg });
      }
    }
  });

  const handleAddException = (e: React.FormEvent) => {
    e.preventDefault();

    if (isManualInput) {
      if (!manualChatId.trim()) {
        if (onAlert) onAlert({ type: 'error', text: 'Nomor HP atau Chat ID wajib diisi.' });
        return;
      }

      let chatId = manualChatId.trim();
      let phone = chatId;
      let type: 'contact' | 'group' = 'contact';

      if (chatId.endsWith('@g.us')) {
        type = 'group';
        phone = '';
      } else {
        phone = chatId.replace(/[^0-9]/g, '');
        if (!chatId.includes('@')) {
          chatId = `${phone}@c.us`;
        }
      }

      addMutation.mutate({
        whatsapp_chat_id: chatId,
        contact_name: manualName.trim() || phone || chatId,
        phone_number: phone || null,
        chat_type: type,
        reason: reason.trim() || null
      });
    } else {
      if (!selectedChatId) {
        if (onAlert) onAlert({ type: 'error', text: 'Silakan pilih kontak atau grup yang ingin dikecualikan.' });
        return;
      }

      addMutation.mutate({
        whatsapp_chat_id: selectedChatId,
        contact_name: selectedChatName || selectedChatId,
        phone_number: selectedChatPhone || null,
        chat_type: selectedChatType,
        reason: reason.trim() || null
      });
    }
  };

  return (
    <Card className="border border-slate-200 shadow-sm bg-white h-full flex flex-col">
      <CardHeader className="pb-3 border-b border-slate-100">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base font-semibold text-slate-800 flex items-center gap-2">
            <UserX className="h-4 w-4 text-rose-600" />
            <span>Kecualikan Kontak</span>
          </CardTitle>
          <button
            type="button"
            onClick={() => {
              setIsManualInput(!isManualInput);
              setSelectedChatId('');
              setChatSearchQuery('');
            }}
            className="text-xs font-medium text-blue-600 hover:text-blue-800 underline"
          >
            {isManualInput ? 'Pilih Chat' : 'Input Manual'}
          </button>
        </div>
        <p className="text-xs text-slate-500 mt-1">
          Kontak yang dipilih tidak akan dibaca dan disimpan (Summary & Reimbursement).
        </p>
      </CardHeader>

      <CardContent className="p-5 flex-1 flex flex-col justify-between space-y-4">
        <form onSubmit={handleAddException} className="space-y-4">
          {!isManualInput ? (
            /* Dropdown Picker from WhatsApp Chats */
            <div className="space-y-1.5 relative" ref={dropdownRef}>
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-slate-700">
                  Pilih dari WhatsApp:
                </label>
                <button
                  type="button"
                  onClick={() => refetchChats()}
                  disabled={isLoadingChats}
                  className="text-[11px] text-blue-600 hover:text-blue-800 flex items-center gap-1"
                >
                  <RefreshCw className={`h-2.5 w-2.5 ${isLoadingChats ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
              </div>

              <div className="relative">
                <Search className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                <Input
                  type="text"
                  value={chatSearchQuery}
                  placeholder="Cari kontak atau grup..."
                  onFocus={() => setIsDropdownOpen(true)}
                  onChange={(e) => {
                    setChatSearchQuery(e.target.value);
                    setIsDropdownOpen(true);
                    if (!e.target.value) setSelectedChatId('');
                  }}
                  className="pl-8 pr-7 text-xs h-9 bg-white border-slate-200 focus:ring-2 focus:ring-rose-500"
                />
                {chatSearchQuery ? (
                  <button
                    type="button"
                    onClick={() => {
                      setChatSearchQuery('');
                      setSelectedChatId('');
                      setIsDropdownOpen(true);
                    }}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                ) : (
                  <ChevronDown className="h-3.5 w-3.5 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
                )}
              </div>

              {/* Dropdown Options */}
              {isDropdownOpen && (
                <div className="absolute z-30 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl max-h-56 overflow-y-auto divide-y divide-slate-100">
                  {isLoadingChats ? (
                    <div className="p-4 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                      <RefreshCw className="h-3 w-3 animate-spin" />
                      Memuat daftar chat...
                    </div>
                  ) : filteredAvailableChats.length === 0 ? (
                    <div className="p-4 text-center text-xs text-slate-500">
                      {rawChats.length === 0
                        ? 'Belum ada chat tersinkron. Hubungkan WhatsApp terlebih dahulu.'
                        : 'Tidak ada kontak yang cocok (atau sudah dikecualikan).'}
                    </div>
                  ) : (
                    filteredAvailableChats.map((chat) => (
                      <div
                        key={chat.whatsapp_chat_id}
                        onClick={() => {
                          setSelectedChatId(chat.whatsapp_chat_id);
                          setSelectedChatName(chat.name || chat.whatsapp_chat_id);
                          setSelectedChatPhone(chat.phone_number || '');
                          setSelectedChatType(chat.is_group ? 'group' : 'contact');
                          setChatSearchQuery(chat.name || chat.phone_number || chat.whatsapp_chat_id);
                          setIsDropdownOpen(false);
                        }}
                        className={`p-2 hover:bg-slate-50 cursor-pointer flex items-center justify-between text-xs transition-colors ${
                          selectedChatId === chat.whatsapp_chat_id ? 'bg-rose-50 text-rose-900 font-medium' : ''
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          {chat.is_group ? (
                            <Users className="h-3.5 w-3.5 text-indigo-500 flex-shrink-0" />
                          ) : (
                            <User className="h-3.5 w-3.5 text-blue-500 flex-shrink-0" />
                          )}
                          <div className="truncate">
                            <p className="font-medium text-slate-800 truncate">
                              {chat.name || chat.whatsapp_chat_id}
                            </p>
                            <p className="text-[10px] text-slate-400 font-mono truncate">
                              {chat.phone_number || chat.whatsapp_chat_id}
                            </p>
                          </div>
                        </div>
                        <Badge variant={chat.is_group ? 'secondary' : 'outline'} className="text-[9px] px-1 py-0 ml-1.5 flex-shrink-0">
                          {chat.is_group ? 'Grup' : 'Personal'}
                        </Badge>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          ) : (
            /* Manual Input Mode */
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700">
                  Nomor HP / Chat ID <span className="text-rose-500">*</span>:
                </label>
                <Input
                  type="text"
                  value={manualChatId}
                  onChange={(e) => setManualChatId(e.target.value)}
                  placeholder="Contoh: 628123456789 atau ID grup"
                  className="h-8 text-xs"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700">
                  Nama Kontak (Opsional):
                </label>
                <Input
                  type="text"
                  value={manualName}
                  onChange={(e) => setManualName(e.target.value)}
                  placeholder="Nama pengenal kontak"
                  className="h-8 text-xs"
                />
              </div>
            </div>
          )}

          {/* Reason / Catatan */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-700">
              Alasan / Catatan (Opsional):
            </label>
            <Input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Misal: Kontak pribadi, keluarga..."
              className="h-8 text-xs"
            />
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={addMutation.isPending || (!isManualInput && !selectedChatId) || (isManualInput && !manualChatId.trim())}
            className="w-full bg-rose-600 hover:bg-rose-700 text-white text-xs h-9 gap-1.5 shadow-sm disabled:opacity-50"
          >
            {addMutation.isPending ? (
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Plus className="h-3.5 w-3.5" />
            )}
            Kecualikan Kontak Ini
          </Button>
        </form>

        <div className="pt-3 border-t border-slate-100 flex items-start gap-2 text-[11px] text-slate-500">
          <ShieldBan className="h-3.5 w-3.5 text-rose-500 flex-shrink-0 mt-0.5" />
          <span>Sistem akan langsung mengabaikan pesan realtime dan riwayat scan dari kontak ini.</span>
        </div>
      </CardContent>
    </Card>
  );
};

/**
 * Kolom 3: Daftar Kontak yang Dikecualikan
 */
export const ContactExceptionsListCard: React.FC<CardProps> = ({ onAlert }) => {
  const queryClient = useQueryClient();
  const [listSearchQuery, setListSearchQuery] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'contact' | 'group'>('all');

  // Fetch Contact Exceptions
  const {
    data: exceptionsData,
    isLoading: isLoadingExceptions
  } = useQuery<{ data: ContactException[] }>({
    queryKey: ['contactExceptions'],
    queryFn: async () => {
      const res = await api.get('/config/contact-exceptions');
      return res.data;
    }
  });
  const exceptionsList = exceptionsData?.data || [];

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await api.delete(`/config/contact-exceptions/${id}`);
      return res.data;
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['contactExceptions'] });
      if (onAlert) {
        onAlert({
          type: 'success',
          text: res?.message || 'Kontak berhasil dihapus dari daftar pengecualian!'
        });
      }
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || err.message || 'Gagal menghapus kontak pengecualian';
      if (onAlert) {
        onAlert({ type: 'error', text: msg });
      }
    }
  });

  // Filtered list
  const displayedExceptions = exceptionsList.filter((item) => {
    if (typeFilter !== 'all' && item.chat_type !== typeFilter) {
      return false;
    }
    if (!listSearchQuery.trim()) return true;
    const q = listSearchQuery.toLowerCase();
    const nameMatch = (item.contact_name || '').toLowerCase().includes(q);
    const idMatch = (item.whatsapp_chat_id || '').toLowerCase().includes(q);
    const phoneMatch = (item.phone_number || '').toLowerCase().includes(q);
    const reasonMatch = (item.reason || '').toLowerCase().includes(q);
    return nameMatch || idMatch || phoneMatch || reasonMatch;
  });

  return (
    <Card className="border border-slate-200 shadow-sm bg-white h-full flex flex-col">
      <CardHeader className="pb-3 border-b border-slate-100">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base font-semibold text-slate-800 flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-amber-600" />
            <span>Kontak Dikecualikan</span>
          </CardTitle>
          <Badge variant="destructive" className="text-xs font-semibold px-2 py-0.5">
            {exceptionsList.length}
          </Badge>
        </div>

        {/* Filter & Search */}
        <div className="flex items-center gap-2 pt-2">
          <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5 text-[11px]">
            <button
              type="button"
              onClick={() => setTypeFilter('all')}
              className={`px-2 py-0.5 rounded-md transition-colors ${
                typeFilter === 'all' ? 'bg-white font-medium text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Semua
            </button>
            <button
              type="button"
              onClick={() => setTypeFilter('contact')}
              className={`px-2 py-0.5 rounded-md transition-colors ${
                typeFilter === 'contact' ? 'bg-white font-medium text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Personal
            </button>
            <button
              type="button"
              onClick={() => setTypeFilter('group')}
              className={`px-2 py-0.5 rounded-md transition-colors ${
                typeFilter === 'group' ? 'bg-white font-medium text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Grup
            </button>
          </div>

          <div className="relative flex-1">
            <Search className="h-3 w-3 text-slate-400 absolute left-2 top-2 pointer-events-none" />
            <Input
              type="text"
              value={listSearchQuery}
              onChange={(e) => setListSearchQuery(e.target.value)}
              placeholder="Cari..."
              className="pl-7 h-7 text-xs bg-slate-50 border-slate-200"
            />
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0 flex-1 overflow-hidden flex flex-col">
        {isLoadingExceptions ? (
          <div className="p-8 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
            <RefreshCw className="h-3.5 w-3.5 animate-spin" />
            Memuat daftar pengecualian...
          </div>
        ) : displayedExceptions.length === 0 ? (
          <div className="p-8 text-center space-y-2 my-auto">
            <div className="mx-auto w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
              <UserX className="h-4 w-4" />
            </div>
            <p className="text-xs font-medium text-slate-700">
              {listSearchQuery ? 'Tidak ditemukan' : 'Belum Ada Kontak Dikecualikan'}
            </p>
            <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
              {listSearchQuery
                ? 'Coba kata kunci lain.'
                : 'Semua pesan dari seluruh kontak akan diproses normal.'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 overflow-y-auto max-h-[460px]">
            {displayedExceptions.map((item) => {
              const isGroup = item.chat_type === 'group';
              return (
                <div
                  key={item.id}
                  className="p-2.5 hover:bg-slate-50 flex items-center justify-between gap-2 transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
                        isGroup ? 'bg-purple-100 text-purple-700' : 'bg-rose-100 text-rose-700'
                      }`}
                    >
                      {isGroup ? <Users className="h-3.5 w-3.5" /> : <User className="h-3.5 w-3.5" />}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="font-semibold text-xs text-slate-900 truncate">
                          {item.contact_name || item.whatsapp_chat_id}
                        </p>
                        <Badge
                          variant={isGroup ? 'secondary' : 'outline'}
                          className="text-[9px] px-1 py-0"
                        >
                          {isGroup ? 'Grup' : 'Personal'}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                        <span className="font-mono truncate">
                          {item.phone_number || item.whatsapp_chat_id}
                        </span>
                        {item.reason && (
                          <>
                            <span>•</span>
                            <span className="italic text-slate-500 truncate max-w-[120px]">
                              "{item.reason}"
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    disabled={deleteMutation.isPending}
                    onClick={() => {
                      if (
                        window.confirm(
                          `Hapus "${item.contact_name || item.whatsapp_chat_id}" dari daftar pengecualian?`
                        )
                      ) {
                        deleteMutation.mutate(item.id);
                      }
                    }}
                    className="h-7 px-2 text-[11px] text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 flex-shrink-0"
                    title="Hapus"
                  >
                    <Trash2 className="h-3 w-3 mr-1" />
                    Hapus
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

/**
 * ContactExceptionsTab – main tab component used by ConfigPage
 * Composes AddContactExceptionCard + ContactExceptionsListCard side-by-side
 */
export const ContactExceptionsTab: React.FC = () => {
  const [alertMsg, setAlertMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  return (
    <div className="space-y-4">
      {alertMsg && (
        <div
          className={`p-3.5 rounded-lg flex items-center gap-2.5 text-sm transition-all ${
            alertMsg.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          <span className="flex-1 font-medium">{alertMsg.text}</span>
          <button
            onClick={() => setAlertMsg(null)}
            className="text-slate-400 hover:text-slate-600 font-bold text-xs"
          >
            ✕
          </button>
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
        <AddContactExceptionCard onAlert={setAlertMsg} />
        <ContactExceptionsListCard onAlert={setAlertMsg} />
      </div>
    </div>
  );
};

export default AddContactExceptionCard;
