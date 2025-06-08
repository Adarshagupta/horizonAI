import { NextRequest, NextResponse } from 'next/server'
import { dataStore } from '@/lib/data-store'
import { realtimeChatService } from '@/lib/realtime-chat'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { conversationId, agentId, agentName, agentEmail } = body

    // Validate required fields
    if (!conversationId || !agentId || !agentName) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    console.log('Agent connection request:', { conversationId, agentId, agentName })

    // Try to get conversation from Firebase first (persistent)
    let conversation: any = null
    try {
      // Check Firebase Realtime Database
      conversation = await new Promise((resolve, reject) => {
        const unsubscribe = realtimeChatService.listenToConversation(conversationId, (conv) => {
          unsubscribe() // Stop listening immediately
          resolve(conv)
        })
        // Timeout after 5 seconds
        setTimeout(() => {
          unsubscribe()
          reject(new Error('Firebase timeout'))
        }, 5000)
      })
      
      if (conversation) {
        console.log('✅ Found conversation in Firebase:', conversationId)
      }
    } catch (firebaseError) {
      console.log('Firebase lookup failed, trying datastore fallback:', firebaseError)
      
      // Fallback to in-memory datastore (for development)
      conversation = dataStore.getConversation(conversationId)
      if (conversation) {
        console.log('✅ Found conversation in datastore fallback:', conversationId)
      }
    }
    
    if (!conversation) {
      console.log('❌ Conversation not found in Firebase or datastore:', conversationId)
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      )
    }

    // Check if conversation is already assigned to another agent
    if (conversation.assignedAgent && conversation.assignedAgent !== agentId) {
      return NextResponse.json(
        { 
          error: 'Conversation already assigned',
          message: `This conversation is already being handled by ${conversation.agentName}`,
          assignedAgent: conversation.agentName
        },
        { status: 409 }
      )
    }

    try {
      // Try to connect via Firebase Realtime Database
      await realtimeChatService.connectAgent(conversationId, agentId, agentName)
      console.log('✅ Agent connected via Firebase Realtime Database')
    } catch (realtimeError) {
      console.log('Firebase connection failed, using datastore fallback:', realtimeError)
    }

    // Always update datastore as fallback/backup
    dataStore.assignAgent(conversationId, agentId, agentName)
    dataStore.updateConversationStatus(conversationId, 'connected')
    
    // Debug: Check conversation state after assignment
    const updatedConversation = dataStore.getConversation(conversationId)
    console.log('🔧 Conversation state after agent assignment:', {
      conversationId,
      status: updatedConversation?.status,
      assignedAgent: updatedConversation?.assignedAgent,
      agentName: updatedConversation?.agentName
    })

    // Add system message about agent joining
    const systemMessage = dataStore.addMessage(conversationId, {
      content: `${agentName} has joined the conversation`,
      type: 'system',
      sender: 'System',
      timestamp: Date.now(),
      messageType: 'text'
    })

    // Add agent greeting message
    const greetingMessage = dataStore.addMessage(conversationId, {
      content: `Hi ${conversation.customerName}! I'm ${agentName}, and I'm here to help you. I can see you were chatting with our AI assistant. How can I assist you further?`,
      type: 'agent',
      sender: agentName,
      timestamp: Date.now() + 1000, // 1 second later
      messageType: 'text'
    })

    // Update agent status to show they have an active conversation
    const businessId = conversation.businessId
    const agents = dataStore.getAgents(businessId)
    const agent = agents.find(a => a.id === agentId)
    if (agent) {
      agent.activeConversations++
    }

    const response = {
      success: true,
      message: 'Agent connected successfully',
      conversationId,
      agentId,
      agentName,
      status: 'connected',
      customerName: conversation.customerName,
      systemMessage: systemMessage,
      greetingMessage: greetingMessage,
      metadata: {
        connectionTime: Date.now(),
        previousStatus: conversation.status,
        businessId: conversation.businessId
      }
    }

    // Add CORS headers
    const headers = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    }

    return NextResponse.json(response, { headers })

  } catch (error) {
    console.error('Agent connect API error:', error)
    
    return NextResponse.json(
      {
        success: false,
        error: 'connection_failed',
        message: 'Failed to connect agent to conversation',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { 
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        }
      }
    )
  }
}

// Handle preflight requests
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
} 