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

export interface ReimbursementItem {
  name: string;
  qty?: number;
  price?: number;
  total?: number;
}

export interface ReimbursementAnomaly {
  type: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
}

export interface WhatsappReimbursement {
  id: number;
  whatsapp_message_id: string;
  quoted_message_id?: string | null;
  chat_id?: string | null;
  chat_name?: string | null;
  sender_phone?: string | null;
  sender_name?: string | null;
  reimburse_image_path?: string | null;
  receipt_image_path?: string | null;
  reimburse_amount: number | string;
  receipt_amount: number | string;
  difference_amount: number | string;
  difference_status: 'MATCH' | 'OVERPAID' | 'UNDERPAID' | 'UNKNOWN';
  merchant_name?: string | null;
  receipt_date?: string | null;
  reimburse_date?: string | null;
  items_breakdown?: ReimbursementItem[] | null;
  anomalies?: (ReimbursementAnomaly | string)[] | null;
  ai_notes?: string | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'FLAGGED';
  created_at: string;
  updated_at?: string;
}

export interface ReimbursementMetrics {
  totalClaims: number;
  totalReimburseAmount: number;
  totalReceiptAmount: number;
  totalDifference: number;
  anomaliesCount: number;
  pendingCount: number;
  approvedCount: number;
  flaggedCount: number;
  rejectedCount: number;
}

