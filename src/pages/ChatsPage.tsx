import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import { WhatsappChat } from '../types';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Link } from 'react-router-dom';
import { MessageSquare, Users, User, Search, ArrowRight, RefreshCw } from 'lucide-react';
import { formatDateTime } from '../lib/utils';

export const ChatsPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');

  const { data: chatsData, isLoading, refetch, isFetching } = useQuery<{ data: WhatsappChat[] }>({
    queryKey: ['whatsapp-chats'],
    queryFn: async () => {
      const resp = await api.get('/whatsapp/chats');
      return resp.data;
    }
  });

  const chats = chatsData?.data || [];

  const filteredChats = chats.filter((chat) => {
    const matchName = chat.name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchPhone = chat.phone_number?.includes(searchTerm);
    return matchName || matchPhone;
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">WhatsApp Chats</h1>
          <p className="text-sm text-slate-500">
            View captured chats, conversation logs, and real-time message streams
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
        </div>
      </div>

      {/* Search Filter */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
        <Input
          placeholder="Search chats by name or phone..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9 bg-white"
        />
      </div>

      {/* Chats Grid / List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          <div className="col-span-full py-12 text-center text-slate-500 text-sm">
            <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-blue-600" />
            Loading captured chats...
          </div>
        ) : filteredChats.length === 0 ? (
          <div className="col-span-full py-12 text-center bg-white rounded-xl border border-slate-200 p-8">
            <MessageSquare className="h-10 w-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-700">No chats found</p>
            <p className="text-xs text-slate-500 mt-1">
              {searchTerm ? 'No chats match your search query.' : 'Connect WhatsApp to sync chats.'}
            </p>
          </div>
        ) : (
          filteredChats.map((chat) => (
            <Card key={chat.id} className="border-slate-200/80 shadow-sm hover:border-blue-300 hover:shadow-md transition-all">
              <CardContent className="p-5 flex flex-col justify-between h-full space-y-4">
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`p-2 rounded-lg flex-shrink-0 ${chat.is_group ? 'bg-purple-50 text-purple-600' : 'bg-blue-50 text-blue-600'}`}>
                        {chat.is_group ? <Users className="h-4 w-4" /> : <User className="h-4 w-4" />}
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-sm font-semibold text-slate-900 truncate" title={chat.name}>
                          {chat.name || 'Unnamed Chat'}
                        </h3>
                        <p className="text-xs text-slate-500 truncate">
                          {chat.phone_number ? `+${chat.phone_number}` : (chat.is_group ? 'Group Chat' : chat.whatsapp_chat_id)}
                        </p>
                      </div>
                    </div>

                    <Badge variant={chat.is_group ? 'secondary' : 'outline'} className="text-[10px] flex-shrink-0">
                      {chat.is_group ? 'Group' : 'Direct'}
                    </Badge>
                  </div>

                  <p className="text-[11px] text-slate-400 mt-2">
                    Updated: {formatDateTime(chat.updated_at)}
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-end">
                  <Link to={`/dashboard/whatsapp/chats/${chat.id}`}>
                    <Button variant="ghost" size="sm" className="h-8 text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1">
                      <span>View Messages</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};
