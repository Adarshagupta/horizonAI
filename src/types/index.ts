export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'agent' | 'customer';
  businessId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Business {
  id: string;
  name: string;
  domain: string;
  widgetConfig: WidgetConfig;
  ownerId: string;
  agents: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface WidgetConfig {
  primaryColor: string;
  accentColor: string;
  welcomeMessage: string;
  position: 'bottom-right' | 'bottom-left';
  enabled: boolean;
  aiEnabled: boolean;
  showOnPages: string[];
}

export interface Conversation {
  id: string;
  businessId: string;
  customerId: string;
  customerEmail?: string;
  customerName?: string;
  status: 'open' | 'closed' | 'pending';
  assignedTo?: string;
  priority: 'low' | 'medium' | 'high';
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  lastMessageAt: Date;
}

export interface Message {
  id: string;
  conversationId: string;
  content: string;
  type: 'text' | 'image' | 'file';
  sender: {
    id: string;
    name: string;
    type: 'customer' | 'agent' | 'ai';
  };
  isRead: boolean;
  createdAt: Date;
}

export interface AIResponse {
  message: string;
  confidence: number;
  suggestedActions?: string[];
}

export interface Widget {
  businessId: string;
  isOpen: boolean;
  unreadCount: number;
} 