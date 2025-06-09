import { NextRequest, NextResponse } from 'next/server'
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

    console.log('🔄 Agent connection request:', { conversationId, agentId, agentName })

    // Get conversation from Firebase (required)
    const conversation = await realtimeChatService.getConversation(conversationId)
    
    if (!conversation) {
      console.log('❌ Conversation not found in Firebase:', conversationId)
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      )
    }

    console.log('✅ Found conversation in Firebase:', conversationId, 'Status:', conversation.status)

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

    // Connect agent via Firebase
    await realtimeChatService.connectAgent(conversationId, agentId, agentName)
    console.log('✅ Agent connected via Firebase')

    // Get updated conversation to return current state
    const updatedConversation = await realtimeChatService.getConversation(conversationId)

    const response = {
      success: true,
      message: 'Agent connected successfully',
      conversationId,
      agentId,
      agentName,
      status: 'connected',
      customerName: conversation.customerName,
      metadata: {
        connectionTime: Date.now(),
        previousStatus: conversation.status,
        businessId: conversation.businessId
      },
      source: 'firebase'
    }

    return NextResponse.json(response, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      }
    })

  } catch (error) {
    console.error('🚨 Agent connect API error:', error)
    
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