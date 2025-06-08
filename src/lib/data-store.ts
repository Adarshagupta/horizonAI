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

  // Initialize with sample data for the known business
  constructor() {
    this.initializeSampleData()
  }

  private initializeSampleData() {
    // Support both business IDs for compatibility
    const businessIds = [
      'NsBoejWEdMN2ev1iKYcD1Yh7qaZ2',  // Correct ID
      'NsBoejWEdNN2eviiKYcD1Yh7qaZ2'   // Common typo in widgets
    ]
    
    businessIds.forEach(businessId => {
      // Don't reinitialize if agents already exist for this business (to prevent data loss in dev mode)
      if (this.agents.has(businessId)) {
        console.log('✅ Skipping initialization - data already exists for business:', businessId)
        return
      }
      // Create sample agents
      const agents = new Map<string, Agent>()
      agents.set('agent_1', {
        id: 'agent_1',
        name: 'John Smith',
        status: 'online',
        activeConversations: 1,
        lastSeen: Date.now()
      })
      agents.set('agent_2', {
        id: 'agent_2',
        name: 'Sarah Johnson',
        status: 'online',
        activeConversations: 0,
        lastSeen: Date.now()
      })
      agents.set('agent_3', {
        id: 'agent_3',
        name: 'Mike Wilson',
        status: 'offline',
        activeConversations: 0,
        lastSeen: Date.now() - 3600000 // 1 hour ago
      })
      
      this.agents.set(businessId, agents)

      // Create sample conversation (only for the main business ID to avoid duplicates)
      if (businessId === 'NsBoejWEdMN2ev1iKYcD1Yh7qaZ2') {
        const conversationId = 'conv_1749382446075_oei3le14q'
        const conversation: Conversation = {
          id: conversationId,
          customerName: 'adarsh',
          customerEmail: 'adarsh@example.com',
          customerId: 'customer_123',
          businessId,
          status: 'waiting',
          priority: 'medium',
          assignedAgent: undefined,
          agentName: undefined,
          startedAt: 1749382446075,
          lastActivity: Date.now(),
          unreadCount: 2,
          messages: [
            {
              id: 'msg_1',
              content: 'Hello, I need help with my order',
              type: 'customer',
              sender: 'adarsh',
              timestamp: 1749382446075,
              messageType: 'text'
            },
            {
              id: 'msg_2',
              content: 'Can someone please assist me?',
              type: 'customer',
              sender: 'adarsh',
              timestamp: Date.now() - 300000, // 5 minutes ago
              messageType: 'text'
            }
          ]
        }

        this.conversations.set(conversationId, conversation)
        
        // Track business conversations
        const businessConvs = new Set<string>()
        businessConvs.add(conversationId)
        this.businessConversations.set(businessId, businessConvs)
      } else {
        // Initialize empty conversations for other business IDs
        this.businessConversations.set(businessId, new Set<string>())
      }

      console.log('✅ Sample data initialized for business:', businessId)
    })
  }

  // Agent methods
  getAgents(businessId: string): Agent[] {
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