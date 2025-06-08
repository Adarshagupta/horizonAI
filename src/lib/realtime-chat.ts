import { rtdb } from './firebase';
import { ref, push, set, onValue, off, serverTimestamp, remove, update, get } from 'firebase/database';

export interface RealtimeMessage {
  id: string;
  conversationId: string;
  content: string;
  sender: {
    id: string;
    name: string;
    type: 'customer' | 'agent' | 'ai';
  };
  timestamp: any;
  read: boolean;
  messageType: 'text' | 'notification' | 'system';
}

export interface ConversationStatus {
  id: string;
  businessId: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  status: 'waiting' | 'connected' | 'ended';
  assignedAgent?: string;
  agentName?: string;
  agentConnected?: boolean; // Computed field indicating if an agent is assigned
  startedAt: any;
  lastActivity: any;
  unreadCount: number;
  priority: 'low' | 'medium' | 'high';
}

export interface AgentPresence {
  id: string;
  name: string;
  email?: string;
  status: 'online' | 'busy' | 'away' | 'offline';
  activeConversations: number;
  lastSeen: any;
}

class RealtimeChatService {
  private listeners: { [key: string]: () => void } = {};

  // Send a message in real-time
  async sendMessage(conversationId: string, message: Omit<RealtimeMessage, 'id' | 'timestamp'>): Promise<string> {
    const messagesRef = ref(rtdb, `conversations/${conversationId}/messages`);
    const newMessageRef = push(messagesRef);
    
    const messageData = {
      ...message,
      timestamp: serverTimestamp(),
    };

    await set(newMessageRef, messageData);
    
    // Update conversation last activity
    await this.updateConversationActivity(conversationId);
    
    return newMessageRef.key!;
  }

  // Listen to messages in a conversation
  listenToMessages(conversationId: string, callback: (messages: RealtimeMessage[]) => void): () => void {
    const messagesRef = ref(rtdb, `conversations/${conversationId}/messages`);
    
    const unsubscribe = onValue(messagesRef, (snapshot) => {
      if (snapshot.exists()) {
        const messages: RealtimeMessage[] = [];
        snapshot.forEach((childSnapshot) => {
          messages.push({
            id: childSnapshot.key!,
            ...childSnapshot.val(),
          });
        });
        // Sort by timestamp
        messages.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
        callback(messages);
      } else {
        callback([]);
      }
    });

    const listenerId = `messages_${conversationId}`;
    this.listeners[listenerId] = () => off(messagesRef);
    
    return () => {
      if (this.listeners[listenerId]) {
        this.listeners[listenerId]();
        delete this.listeners[listenerId];
      }
    };
  }

  // Create a new conversation with specific ID
  async createConversation(conversationId: string, conversation: Omit<ConversationStatus, 'id' | 'startedAt' | 'lastActivity'>): Promise<string> {
    const conversationRef = ref(rtdb, `conversations/${conversationId}`);
    
    const conversationData = {
      id: conversationId,
      ...conversation,
      startedAt: serverTimestamp(),
      lastActivity: serverTimestamp(),
    };

    await set(conversationRef, conversationData);
    
    // Send initial system message
    await this.sendMessage(conversationId, {
      conversationId,
      content: `${conversation.customerName} has joined the conversation`,
      sender: {
        id: 'system',
        name: 'System',
        type: 'ai' as const,
      },
      read: false,
      messageType: 'system',
    });

    return conversationId;
  }

  // Get conversation directly (one-time read)
  async getConversation(conversationId: string): Promise<ConversationStatus | null> {
    const conversationRef = ref(rtdb, `conversations/${conversationId}`);
    const snapshot = await get(conversationRef);
    
    if (snapshot.exists()) {
      return {
        id: snapshot.key!,
        ...snapshot.val(),
      };
    } else {
      return null;
    }
  }

  // Listen to conversation status changes
  listenToConversation(conversationId: string, callback: (conversation: ConversationStatus | null) => void): () => void {
    const conversationRef = ref(rtdb, `conversations/${conversationId}`);
    
    const unsubscribe = onValue(conversationRef, (snapshot) => {
      if (snapshot.exists()) {
        callback({
          id: snapshot.key!,
          ...snapshot.val(),
        });
      } else {
        callback(null);
      }
    });

    const listenerId = `conversation_${conversationId}`;
    this.listeners[listenerId] = () => off(conversationRef);
    
    return () => {
      if (this.listeners[listenerId]) {
        this.listeners[listenerId]();
        delete this.listeners[listenerId];
      }
    };
  }

  // Request human agent
  async requestHumanAgent(conversationId: string, customerMessage: string): Promise<void> {
    // Update conversation status
    const conversationRef = ref(rtdb, `conversations/${conversationId}`);
    await update(conversationRef, {
      status: 'waiting',
      priority: 'high',
      lastActivity: serverTimestamp(),
    });

    // Send notification message
    await this.sendMessage(conversationId, {
      conversationId,
      content: 'Customer has requested to speak with a human agent',
      sender: {
        id: 'system',
        name: 'System',
        type: 'ai',
      },
      read: false,
      messageType: 'notification',
    });

    // Send customer's request
    await this.sendMessage(conversationId, {
      conversationId,
      content: customerMessage,
      sender: {
        id: 'customer',
        name: 'Customer',
        type: 'customer',
      },
      read: false,
      messageType: 'text',
    });

    // Create agent notification
    await this.createAgentNotification(conversationId, 'human_requested');
  }

  // Connect agent to conversation
  async connectAgent(conversationId: string, agentId: string, agentName: string): Promise<void> {
    const conversationRef = ref(rtdb, `conversations/${conversationId}`);
    await update(conversationRef, {
      status: 'connected',
      assignedAgent: agentId,
      agentName: agentName,
      lastActivity: serverTimestamp(),
    });

    // Send system message
    await this.sendMessage(conversationId, {
      conversationId,
      content: `${agentName} has joined the conversation`,
      sender: {
        id: 'system',
        name: 'System',
        type: 'ai',
      },
      read: false,
      messageType: 'system',
    });

    // Send agent greeting
    await this.sendMessage(conversationId, {
      conversationId,
      content: "Hi! I'm here to help you. How can I assist you today?",
      sender: {
        id: agentId,
        name: agentName,
        type: 'agent',
      },
      read: false,
      messageType: 'text',
    });
  }

  // Listen to agent notifications
  listenToAgentNotifications(businessId: string, callback: (notifications: any[]) => void): () => void {
    const notificationsRef = ref(rtdb, `notifications/${businessId}/agents`);
    
    const unsubscribe = onValue(notificationsRef, (snapshot) => {
      if (snapshot.exists()) {
        const notifications: any[] = [];
        snapshot.forEach((childSnapshot) => {
          notifications.push({
            id: childSnapshot.key!,
            ...childSnapshot.val(),
          });
        });
        // Sort by timestamp (newest first)
        notifications.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        callback(notifications);
      } else {
        callback([]);
      }
    });

    const listenerId = `notifications_${businessId}`;
    this.listeners[listenerId] = () => off(notificationsRef);
    
    return () => {
      if (this.listeners[listenerId]) {
        this.listeners[listenerId]();
        delete this.listeners[listenerId];
      }
    };
  }

  // Create agent notification
  async createAgentNotification(conversationId: string, type: 'human_requested' | 'new_conversation' | 'urgent_message'): Promise<void> {
    // Get conversation info first
    const conversationRef = ref(rtdb, `conversations/${conversationId}`);
    const snapshot = await new Promise<any>((resolve) => {
      onValue(conversationRef, resolve, { onlyOnce: true });
    });

    if (snapshot.exists()) {
      const conversation = snapshot.val();
      const notificationsRef = ref(rtdb, `notifications/${conversation.businessId}/agents`);
      const newNotificationRef = push(notificationsRef);

      const notification = {
        conversationId,
        type,
        customerName: conversation.customerName,
        customerEmail: conversation.customerEmail,
        priority: conversation.priority || 'medium',
        timestamp: serverTimestamp(),
        read: false,
        message: this.getNotificationMessage(type, conversation.customerName),
      };

      await set(newNotificationRef, notification);
    }
  }

  // Update agent presence
  async updateAgentPresence(businessId: string, agentId: string, presence: Partial<AgentPresence>): Promise<void> {
    const presenceRef = ref(rtdb, `presence/${businessId}/${agentId}`);
    await update(presenceRef, {
      ...presence,
      lastSeen: serverTimestamp(),
    });
  }

  // Get agent presence
  async getAgentPresence(businessId: string, agentId: string): Promise<AgentPresence | null> {
    const presenceRef = ref(rtdb, `presence/${businessId}/${agentId}`);
    const snapshot = await new Promise<any>((resolve) => {
      onValue(presenceRef, resolve, { onlyOnce: true });
    });

    if (snapshot.exists()) {
      return {
        id: agentId,
        ...snapshot.val(),
      };
    }
    return null;
  }

  // Listen to agent presence (all agents)
  listenToAllAgentPresence(businessId: string, callback: (agents: AgentPresence[]) => void): () => void {
    const presenceRef = ref(rtdb, `presence/${businessId}`);
    
    const unsubscribe = onValue(presenceRef, (snapshot) => {
      if (snapshot.exists()) {
        const agents: AgentPresence[] = [];
        snapshot.forEach((childSnapshot) => {
          agents.push({
            id: childSnapshot.key!,
            ...childSnapshot.val(),
          });
        });
        callback(agents);
      } else {
        callback([]);
      }
    });

    const listenerId = `presence_${businessId}`;
    this.listeners[listenerId] = () => off(presenceRef);
    
    return () => {
      if (this.listeners[listenerId]) {
        this.listeners[listenerId]();
        delete this.listeners[listenerId];
      }
    };
  }

  // Listen to specific agent presence
  listenToAgentPresence(businessId: string, agentId: string, callback: (presence: AgentPresence | null) => void): () => void {
    const presenceRef = ref(rtdb, `presence/${businessId}/${agentId}`);
    
    const unsubscribe = onValue(presenceRef, (snapshot) => {
      if (snapshot.exists()) {
        callback({
          id: agentId,
          ...snapshot.val(),
        });
      } else {
        callback(null);
      }
    });

    const listenerId = `agent_presence_${businessId}_${agentId}`;
    this.listeners[listenerId] = () => off(presenceRef);
    
    return () => {
      if (this.listeners[listenerId]) {
        this.listeners[listenerId]();
        delete this.listeners[listenerId];
      }
    };
  }

  // Mark messages as read
  async markMessagesAsRead(conversationId: string, messageIds: string[]): Promise<void> {
    const updates: { [key: string]: any } = {};
    messageIds.forEach(messageId => {
      updates[`conversations/${conversationId}/messages/${messageId}/read`] = true;
    });
    await update(ref(rtdb), updates);
  }

  // End conversation
  async endConversation(conversationId: string): Promise<void> {
    const conversationRef = ref(rtdb, `conversations/${conversationId}`);
    await update(conversationRef, {
      status: 'ended',
      lastActivity: serverTimestamp(),
    });

    // Send system message
    await this.sendMessage(conversationId, {
      conversationId,
      content: 'Conversation has been ended',
      sender: {
        id: 'system',
        name: 'System',
        type: 'ai',
      },
      read: false,
      messageType: 'system',
    });
  }

  // Private helper methods
  private async updateConversationActivity(conversationId: string): Promise<void> {
    const conversationRef = ref(rtdb, `conversations/${conversationId}`);
    await update(conversationRef, {
      lastActivity: serverTimestamp(),
    });
  }

  private getNotificationMessage(type: string, customerName: string): string {
    switch (type) {
      case 'human_requested':
        return `${customerName} has requested to speak with a human agent`;
      case 'new_conversation':
        return `New conversation started with ${customerName}`;
      case 'urgent_message':
        return `Urgent message from ${customerName}`;
      default:
        return `New notification from ${customerName}`;
    }
  }

  // Clean up all listeners
  cleanup(): void {
    Object.values(this.listeners).forEach(unsubscribe => unsubscribe());
    this.listeners = {};
  }
}

export const realtimeChatService = new RealtimeChatService(); 