import { NextRequest, NextResponse } from 'next/server'
import { dataStore } from '@/lib/data-store'

export async function GET(
  request: NextRequest,
  { params }: { params: { conversationId: string } }
) {
  try {
    const { conversationId } = params

    if (!conversationId) {
      return NextResponse.json(
        { error: 'Missing conversation ID' },
        { status: 400 }
      )
    }

    console.log('Fetching messages for conversation:', conversationId)

    // Get conversation from data store
    const conversation = dataStore.getConversation(conversationId)
    
    if (!conversation) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      )
    }

    console.log(`Found ${conversation.messages.length} messages for conversation ${conversationId}`)
    
    return NextResponse.json({
      messages: conversation.messages,
      conversation: {
        id: conversation.id,
        customerName: conversation.customerName,
        status: conversation.status,
        lastActivity: conversation.lastActivity
      },
      source: 'data-store',
      count: conversation.messages.length
    })

  } catch (error) {
    console.error('Messages API error:', error)
    
    return NextResponse.json(
      {
        error: 'Failed to fetch messages',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// Handle preflight requests
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
} 