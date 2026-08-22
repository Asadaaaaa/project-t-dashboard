export interface User {
  id: number;
  name: string;
  username: string;
  roles?: string[] | { id: number; name: string }[];
  permissions?: string[];
  created_at?: string;
}

export interface Role {
  id: number;
  name: string;
  description?: string;
  permissions?: Permission[];
  created_at?: string;
}

export interface Permission {
  id: number;
  name: string;
  description?: string;
}

export interface WhatsappSession {
  id?: number;
  session_id: string;
  status: 'disconnected' | 'connecting' | 'authenticated' | 'connected' | string;
  phone_number?: string | null;
  last_connected_at?: string | null;
}

export interface WhatsappChat {
  id: number;
  session_id: string;
  whatsapp_chat_id: string;
  name: string;
  is_group: boolean;
  phone_number?: string | null;
  created_at: string;
  updated_at: string;
  messages?: WhatsappMessage[];
}

export interface WhatsappMessage {
  id: number;
  chat_id: number;
  whatsapp_message_id: string;
  sender?: string | null;
  receiver?: string | null;
  message?: string | null;
  message_type: string;
  timestamp: number;
  is_from_me: boolean;
  created_at: string;
}

export interface DailyTodo {
  id: number;
  summary_id: number;
  title: string;
  description?: string | null;
  priority: 'high' | 'medium' | 'low';
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  assignee?: string | null;
  deadline?: string | null;
  created_at: string;
  summary?: {
    id: number;
    summary_date: string;
  };
}

export interface DailySummary {
  id: number;
  user_id?: number | null;
  summary_date: string;
  summary: string;
  highlights?: string[];
  decisions?: string[];
  markdown?: string;
  created_at: string;
  updated_at?: string;
  todos?: DailyTodo[];
  user?: {
    id: number;
    name: string;
    username: string;
  };
}

export interface DashboardStats {
  whatsappStatus: string;
  phoneNumber?: string | null;
  lastConnectedAt?: string | null;
  messagesToday: number;
  activeChats: number;
  pendingTodos: number;
  completedTodos: number;
  latestSummary?: DailySummary | null;
}
