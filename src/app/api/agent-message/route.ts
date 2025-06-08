import { NextRequest, NextResponse } from 'next/server'
import { dataStore } from '@/lib/data-store'
import { realtimeChatService } from '@/lib/realtime-chat'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { conversationId, agentId, agentName, message, messageType = 'text' } = body

    // Validate required fields
    if (!conversationId || !agentId || !agentName || !message) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    console.log('Agent message request:', { conversationId, agentId, agentName, message })

    // Get conversation from datastore
    const conversation = dataStore.getConversation(conversationId)
    
    if (!conversation) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      )
    }

    console.log('Current conversation state:', { 
      assignedAgent: conversation.assignedAgent, 
      status: conversation.status,
      agentName: conversation.agentName 
    })

    // Allow any agent to send messages - no assignment restrictions
    console.log(`💬 Agent ${agentName} (${agentId}) sending message to conversation ${conversationId}`)
    
    // Update conversation status to connected if not already
    if (conversation.status !== 'connected') {
      dataStore.updateConversationStatus(conversationId, 'connected')
    }

    try {
      // Try to send via Firebase Realtime Database
      await realtimeChatService.sendMessage(conversationId, {
        conversationId,
        content: message,
        sender: {
          id: agentId,
          name: agentName,
          type: 'agent'
        },
        read: false,
        messageType
      })
      console.log('✅ Message sent via Firebase Realtime Database')
    } catch (realtimeError) {
      console.log('Firebase send failed, using datastore fallback:', realtimeError)
    }

    // Always save to datastore as backup
    const savedMessage = dataStore.addMessage(conversationId, {
      content: message,
      type: 'agent',
      sender: agentName,
      timestamp: Date.now(),
      messageType
    })

    // Update conversation last activity
    dataStore.updateConversationActivity(conversationId)

    console.log('✅ Agent message saved successfully:', savedMessage.id)

    const response = {
      success: true,
      message: 'Message sent successfully',
      messageId: savedMessage.id,
      conversationId,
      agentId,
      agentName,
      timestamp: savedMessage.timestamp,
      metadata: {
        sendTime: Date.now(),
        messageType,
        source: 'agent'
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
    console.error('Agent message API error:', error)
    
    return NextResponse.json(
      {
        success: false,
        error: 'send_failed',
        message: 'Failed to send message',
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