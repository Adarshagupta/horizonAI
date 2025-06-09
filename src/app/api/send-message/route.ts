import { NextRequest, NextResponse } from 'next/server'
import { realtimeChatService } from '@/lib/realtime-chat'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { conversationId, message, senderInfo, messageType = 'text' } = body

    // Validate required fields
    if (!conversationId || !message || !senderInfo) {
      return NextResponse.json(
        { error: 'Missing required fields: conversationId, message, senderInfo' },
        { status: 400 }
      )
    }

    console.log('🔄 Sending message:', { conversationId, senderInfo: senderInfo.name, messageLength: message.length })

    // Check if conversation exists in Firebase
    const conversation = await realtimeChatService.getConversation(conversationId)
    if (!conversation) {
      console.log('❌ Conversation not found in Firebase:', conversationId)
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      )
    }

    console.log('✅ Found conversation in Firebase:', conversationId)

    // Send message to Firebase
    const messageId = await realtimeChatService.sendMessage(conversationId, {
      conversationId,
      content: message,
      sender: {
        id: senderInfo.id || 'agent',
        name: senderInfo.name || 'Agent',
        type: senderInfo.type || 'agent'
      },
      read: false,
      messageType
    })

    console.log('✅ Message sent to Firebase with ID:', messageId)

    // Update conversation status if agent is connecting for first time
    if (senderInfo.type === 'agent' && conversation.status === 'waiting') {
      await realtimeChatService.connectAgent(conversationId, senderInfo.id || 'agent', senderInfo.name || 'Agent')
      console.log('✅ Agent connected to conversation:', conversationId)
    }

    const response = {
      success: true,
      message: 'Message sent successfully',
      messageId,
      conversationId,
      timestamp: Date.now(),
      metadata: {
        senderName: senderInfo.name,
        senderType: senderInfo.type,
        conversationStatus: conversation.status
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
    console.error('🚨 Send message API error:', error)
    return NextResponse.json(
      { error: 'Failed to send message', message: String(error) },
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