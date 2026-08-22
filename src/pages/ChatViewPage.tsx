import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import { WhatsappChat, WhatsappMessage } from '../types';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { ArrowLeft, Users, User, RefreshCw, MessageSquare } from 'lucide-react';
import { formatDateTime } from '../lib/utils';

export const ChatViewPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  const { data: chatData, isLoading: isChatLoading } = useQuery<{ data: WhatsappChat }>({
    queryKey: ['whatsapp-chat', id],
    queryFn: async () => {
      const resp = await api.get(`/whatsapp/chats/${id}`);
      return resp.data;
    }
  });

  const { data: messagesData, isLoading: isMessagesLoading, refetch } = useQuery<{ data: { rows: WhatsappMessage[]; count: number } }>({
    queryKey: ['whatsapp-chat-messages', id],
    queryFn: async () => {
      const resp = await api.get(`/whatsapp/chats/${id}/messages?limit=200`);
      return resp.data;
    },
    refetchInterval: 5000
  });

  const chat = chatData?.data;
  const messages = messagesData?.data?.rows || [];

  return (
    <div className="space-y-6 max-w-4xl mx-auto flex flex-col h-[calc(100vh-8rem)]">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-shrink-0">
        <div className="flex items-center gap-3">
          <Link to="/dashboard/whatsapp/chats">
            <Button variant="outline" size="icon" className="h-9 w-9">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-lg ${chat?.is_group ? 'bg-purple-50 text-purple-600' : 'bg-blue-50 text-blue-600'}`}>
              {chat?.is_group ? <Users className="h-5 w-5" /> : <User className="h-5 w-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-slate-900 leading-tight">
                  {chat?.name || 'Chat Messages'}
                </h1>
                {chat?.is_group && (
                  <Badge variant="secondary" className="text-[10px]">Group</Badge>
                )}
              </div>
              <p className="text-xs text-slate-500">
                {chat?.phone_number ? `+${chat.phone_number}` : chat?.whatsapp_chat_id}
              </p>
            </div>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          className="flex items-center gap-2"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          <span>Refresh</span>
        </Button>
      </div>

      {/* Messages Container */}
      <Card className="flex-1 border-slate-200/80 shadow-sm flex flex-col overflow-hidden">
        <CardContent className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/50">
          {isChatLoading || isMessagesLoading ? (
            <div className="h-full flex items-center justify-center text-slate-400 text-sm">
              <RefreshCw className="h-6 w-6 animate-spin mr-2 text-blue-600" />
              Loading messages...
            </div>
          ) : messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8">
              <MessageSquare className="h-10 w-10 text-slate-300 mb-2" />
              <p className="text-sm font-semibold text-slate-700">No messages in this chat</p>
              <p className="text-xs text-slate-500 mt-1">
                New incoming messages will automatically show up here.
              </p>
            </div>
          ) : (
            messages.map((msg) => {
              const isMe = msg.is_from_me;
              const formattedTime = new Date(Number(msg.timestamp)).toLocaleTimeString('id-ID', {
                hour: '2-digit',
                minute: '2-digit'
              });

              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[75%] rounded-2xl px-4 py-2.5 shadow-sm text-sm ${
                      isMe
                        ? 'bg-blue-600 text-white rounded-br-none'
                        : 'bg-white text-slate-900 border border-slate-200/70 rounded-bl-none'
                    }`}
                  >
                    {!isMe && msg.sender && (
                      <p className="text-[11px] font-semibold text-blue-600 mb-0.5">
                        {msg.sender.split('@')[0]}
                      </p>
                    )}
                    <p className="whitespace-pre-wrap break-words leading-relaxed">{msg.message}</p>
                    <p
                      className={`text-[10px] mt-1 text-right ${
                        isMe ? 'text-blue-200' : 'text-slate-400'
                      }`}
                    >
                      {formattedTime}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
};
