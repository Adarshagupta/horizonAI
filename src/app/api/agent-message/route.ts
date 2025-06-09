import { NextRequest, NextResponse } from 'next/server'
import { realtimeChatService } from '@/lib/realtime-chat'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { conversationId, message, agentInfo } = body

    // Validate required fields
    if (!conversationId || !message || !agentInfo) {
      return NextResponse.json(
        { error: 'Missing required fields: conversationId, message, agentInfo' },
        { status: 400 }
      )
    }

    console.log('🔄 Agent message request:', { conversationId, agentId: agentInfo.id, messageLength: message.length })

    // Get conversation from Firebase (required)
    const conversation = await realtimeChatService.getConversation(conversationId)
    
    if (!conversation) {
      console.log('❌ Conversation not found in Firebase:', conversationId)
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      )
    }

    console.log('✅ Found conversation in Firebase:', conversationId)

    // Connect agent first if not already connected
    if (!conversation.assignedAgent || conversation.assignedAgent !== agentInfo.id) {
      await realtimeChatService.connectAgent(conversationId, agentInfo.id, agentInfo.name)
      console.log('✅ Agent connected to conversation')
    }

    // Send agent message to Firebase
    const messageId = await realtimeChatService.sendMessage(conversationId, {
      conversationId,
      content: message,
      sender: {
        id: agentInfo.id,
        name: agentInfo.name,
        type: 'agent'
      },
      read: false,
      messageType: 'text'
    })

    console.log('✅ Agent message sent to Firebase with ID:', messageId)

    const response = {
      success: true,
      message: 'Agent message sent successfully',
      messageId,
      conversationId,
      timestamp: Date.now(),
      metadata: {
        agentId: agentInfo.id,
        agentName: agentInfo.name,
        conversationStatus: 'connected'
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
    console.error('🚨 Agent message API error:', error)
    return NextResponse.json(
      { error: 'Failed to send agent message', message: String(error) },
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