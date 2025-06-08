import { NextRequest, NextResponse } from 'next/server'
import { dataStore } from '@/lib/data-store'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { conversationId, businessId, customerInfo, message } = body

    // Validate required fields
    if (!conversationId || !businessId || !customerInfo) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    console.log('Agent request:', { conversationId, businessId, customerInfo })

    // Check if conversation exists, create if not
    let conversation = dataStore.getConversation(conversationId)
    if (!conversation) {
      conversation = dataStore.createConversation({
        id: conversationId,
        customerName: customerInfo.name || 'Customer',
        customerEmail: customerInfo.email || 'customer@example.com',
        customerId: `customer_${Date.now()}`,
        businessId,
        status: 'waiting',
        priority: 'medium',
        startedAt: Date.now(),
        lastActivity: Date.now(),
        unreadCount: 0
      })
      console.log('Created new conversation:', conversationId)
    }

    // Check agent availability from data store and assign an agent
    const agents = dataStore.getAgents(businessId)
    
    let availableAgents = 0
    let assignedAgent = null
    
    // Find and assign the best available agent
    for (const agent of agents) {
      if (agent.status === 'online' && agent.activeConversations < 5) {
        availableAgents++
        
        // Assign the agent with the fewest active conversations
        if (!assignedAgent || agent.activeConversations < assignedAgent.activeConversations) {
          assignedAgent = agent
        }
      }
    }

    // Assign the agent to the conversation
    if (assignedAgent) {
      dataStore.assignAgent(conversationId, assignedAgent.id, assignedAgent.name)
      console.log(`✅ Assigned agent ${assignedAgent.name} (${assignedAgent.id}) to conversation ${conversationId}`)
      
      // Increment agent's active conversation count
      assignedAgent.activeConversations++
    } else {
      console.log('⏳ No agents available, conversation will remain in waiting status')
    }

    // Add message to conversation if provided
    if (message) {
      try {
        dataStore.addMessage(conversationId, {
          content: message,
          type: 'customer',
          sender: customerInfo.name || 'Customer',
          timestamp: Date.now(),
          messageType: 'text'
        })
      } catch (error) {
        console.error('Error adding message:', error)
        // Continue even if message addition fails
      }
    }

    // Don't set to waiting here - let agent assignment handle the status

    // Add system message about agent request
    try {
      dataStore.addMessage(conversationId, {
        content: 'Agent requested - connecting you to the next available agent...',
        type: 'system',
        sender: 'System',
        timestamp: Date.now(),
        messageType: 'text'
      })
    } catch (error) {
      console.error('Error adding system message:', error)
      // Continue even if system message fails
    }

    // Calculate estimated wait time based on available agents
    let estimatedWaitTime = '5-10 minutes'
    if (availableAgents >= 3) {
      estimatedWaitTime = '1-3 minutes'
    } else if (availableAgents === 2) {
      estimatedWaitTime = '2-5 minutes'
    } else if (availableAgents === 1) {
      estimatedWaitTime = '3-7 minutes'
    }

    const response = {
      success: true,
      message: 'Human agent requested successfully',
      conversationId,
      estimatedWaitTime,
      businessHours: '24/7 Support Available',
      availableAgents,
      metadata: {
        requestTime: Date.now(),
        businessId,
        customerName: customerInfo.name
      },
      source: 'data-store'
    }

    // Add CORS headers
    const headers = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    }

    return NextResponse.json(response, { headers })

  } catch (error) {
    console.error('Request agent API error:', error)
    
    return NextResponse.json(
      {
        success: false,
        error: 'system_error',
        message: 'Unable to connect to support team at this time. Please try again in a moment.',
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