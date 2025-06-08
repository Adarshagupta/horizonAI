// Persistent in-memory data store for full functionality
// This provides real working features without external dependencies

interface Agent {
  id: string
  name: string
  status: 'online' | 'offline' | 'busy'
  activeConversations: number
  lastSeen: number
}

interface Conversation {
  id: string
  customerName: string
  customerEmail: string
  customerId: string
  businessId: string
  status: 'waiting' | 'connected' | 'ended'
  priority: 'low' | 'medium' | 'high'
  assignedAgent?: string
  agentName?: string
  startedAt: number
  lastActivity: number
  unreadCount: number
  messages: Message[]
}

interface Message {
  id: string
  content: string
  type: 'customer' | 'agent' | 'system'
  sender: string
  timestamp: number
  messageType: 'text' | 'image' | 'file'
}

interface Ticket {
  id: string
  customerName: string
  customerEmail: string
  message: string
  businessId: string
  priority: string
  status: 'pending' | 'resolved'
  createdAt: number
  updatedAt: number
  type: 'offline_message'
}

class DataStore {
  private agents: Map<string, Map<string, Agent>> = new Map() // businessId -> agentId -> Agent
  private conversations: Map<string, Conversation> = new Map() // conversationId -> Conversation
  private tickets: Map<string, Map<string, Ticket>> = new Map() // businessId -> ticketId -> Ticket
  private businessConversations: Map<string, Set<string>> = new Map() // businessId -> Set of conversationIds

  // Multi-tenant constructor - supports unlimited businesses dynamically
  constructor() {
    console.log('✅ DataStore initialized - ready for multi-tenant use')
  }

  // Dynamically ensure business exists when first accessed
  private ensureBusinessExists(businessId: string) {
    if (!this.agents.has(businessId)) {
      console.log('🆕 Auto-initializing new business:', businessId)
      
      // Create default agents for new business
      const agents = new Map<string, Agent>()
      agents.set('agent_1', {
        id: 'agent_1',
        name: 'Support Agent',
        status: 'online',
        activeConversations: 0,
        lastSeen: Date.now()
      })
      
      this.agents.set(businessId, agents)
      this.businessConversations.set(businessId, new Set<string>())
      this.tickets.set(businessId, new Map<string, Ticket>())
      
      console.log('✅ Business auto-initialized:', businessId)
    }
  }

  // Agent methods
  getAgents(businessId: string): Agent[] {
    this.ensureBusinessExists(businessId)
    const businessAgents = this.agents.get(businessId)
    return businessAgents ? Array.from(businessAgents.values()) : []
  }

  updateAgentStatus(businessId: string, agentId: string, status: Agent['status']) {
    const businessAgents = this.agents.get(businessId)
    if (businessAgents?.has(agentId)) {
      const agent = businessAgents.get(agentId)!
      agent.status = status
      agent.lastSeen = Date.now()
    }
  }

  // Conversation methods
  getConversations(businessId: string): Conversation[] {
    this.ensureBusinessExists(businessId)
    console.log('Getting conversations for business:', businessId)
    const conversationIds = this.businessConversations.get(businessId) || new Set()
    console.log('Found conversation IDs:', Array.from(conversationIds))
    const conversations: Conversation[] = []
    
    conversationIds.forEach(id => {
      const conversation = this.conversations.get(id)
      if (conversation) {
        conversations.push(conversation)
      }
    })

    console.log('Returning', conversations.length, 'conversations')
    return conversations.sort((a, b) => b.lastActivity - a.lastActivity)
  }

  getConversation(conversationId: string): Conversation | null {
    return this.conversations.get(conversationId) || null
  }

  createConversation(data: Omit<Conversation, 'messages'>): Conversation {
    this.ensureBusinessExists(data.businessId)
    const conversation: Conversation = {
      ...data,
      messages: []
    }
    
    console.log('Creating conversation:', data.id, 'for business:', data.businessId)
    this.conversations.set(data.id, conversation)
    
    // Track in business conversations
    const businessConvs = this.businessConversations.get(data.businessId) || new Set()
    businessConvs.add(data.id)
    this.businessConversations.set(data.businessId, businessConvs)
    
    console.log('Business conversations for', data.businessId, 'now has', businessConvs.size, 'conversations')

    return conversation
  }

  updateConversationStatus(conversationId: string, status: Conversation['status']) {
    const conversation = this.conversations.get(conversationId)
    if (conversation) {
      conversation.status = status
      conversation.lastActivity = Date.now()
    }
  }

  assignAgent(conversationId: string, agentId: string, agentName: string) {
    const conversation = this.conversations.get(conversationId)
    if (conversation) {
      conversation.assignedAgent = agentId
      conversation.agentName = agentName
      conversation.status = 'connected'
      conversation.lastActivity = Date.now()
    }
  }

  updateConversationActivity(conversationId: string) {
    const conversation = this.conversations.get(conversationId)
    if (conversation) {
      conversation.lastActivity = Date.now()
    }
  }

  addMessage(conversationId: string, message: Omit<Message, 'id'>): Message {
    const conversation = this.conversations.get(conversationId)
    if (conversation) {
      const newMessage: Message = {
        ...message,
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      }
      
      conversation.messages.push(newMessage)
      conversation.lastActivity = Date.now()
      
      if (message.type === 'customer') {
        conversation.unreadCount++
      }

      return newMessage
    }
    throw new Error('Conversation not found')
  }

  // Ticket methods
  createTicket(data: Omit<Ticket, 'id' | 'createdAt' | 'updatedAt'>): Ticket {
    const ticket: Ticket = {
      ...data,
      id: `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: Date.now(),
      updatedAt: Date.now()
    }

    const businessTickets = this.tickets.get(data.businessId) || new Map()
    businessTickets.set(ticket.id, ticket)
    this.tickets.set(data.businessId, businessTickets)

    return ticket
  }

  getTickets(businessId: string): Ticket[] {
    const businessTickets = this.tickets.get(businessId) || new Map()
    return Array.from(businessTickets.values()).sort((a, b) => b.createdAt - a.createdAt)
  }
}

// Export singleton instance with global preservation for development
let globalDataStore: DataStore

if (typeof globalThis !== 'undefined') {
  // In development, preserve the instance across hot reloads
  if (!globalThis.__dataStore) {
    globalThis.__dataStore = new DataStore()
  }
  globalDataStore = globalThis.__dataStore
} else {
  // Fallback for environments without globalThis
  globalDataStore = new DataStore()
}

export const dataStore = globalDataStore

// Type augmentation for global
declare global {
  var __dataStore: DataStore | undefined
} 