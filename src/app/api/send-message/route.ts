import { NextRequest, NextResponse } from 'next/server'
import { dataStore } from '@/lib/data-store'

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

    console.log('Sending message:', { conversationId, senderInfo: senderInfo.name, messageLength: message.length })

    // Check if conversation exists
    const conversation = dataStore.getConversation(conversationId)
    if (!conversation) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      )
    }

    // Add message to conversation
    const newMessage = dataStore.addMessage(conversationId, {
      content: message,
      type: senderInfo.type || 'agent',
      sender: senderInfo.name || 'Agent',
      timestamp: Date.now(),
      messageType
    })

    // Update conversation status if agent is connecting for first time
    if (senderInfo.type === 'agent' && conversation.status === 'waiting') {
      dataStore.updateConversationStatus(conversationId, 'connected')
      dataStore.assignAgent(conversationId, senderInfo.id || 'agent', senderInfo.name || 'Agent')
      
      console.log('Agent connected to conversation:', conversationId)
    }

    const response = {
      success: true,
      message: 'Message sent successfully',
      messageId: newMessage.id,
      conversationId,
      timestamp: newMessage.timestamp,
      metadata: {
        senderName: senderInfo.name,
        senderType: senderInfo.type,
        conversationStatus: conversation.status
      },
      source: 'data-store'
    }

    return NextResponse.json(response, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      }
    })

  } catch (error) {
    console.error('Send message API error:', error)
    return NextResponse.json(
      { error: 'Failed to send message', message: String(error) },
      { status: 500 }
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