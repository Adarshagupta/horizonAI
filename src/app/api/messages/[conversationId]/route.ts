import { NextRequest, NextResponse } from 'next/server'
import { rtdb } from '@/lib/firebase'
import { ref, get } from 'firebase/database'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ conversationId: string }> }
) {
  try {
    const params = await context.params
    const { conversationId } = params

    if (!conversationId) {
      return NextResponse.json(
        { error: 'Missing conversation ID' },
        { status: 400 }
      )
    }

    console.log('🔍 Fetching messages for conversation:', conversationId)

    // Get conversation from Firebase
    const conversationRef = ref(rtdb, `conversations/${conversationId}`)
    const conversationSnapshot = await get(conversationRef)
    
    if (!conversationSnapshot.exists()) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      )
    }

    const conversation = conversationSnapshot.val()

    // Get messages from Firebase
    const messagesRef = ref(rtdb, `messages/${conversationId}`)
    const messagesSnapshot = await get(messagesRef)
    
    let messages: any[] = []
    if (messagesSnapshot.exists()) {
      const messagesData = messagesSnapshot.val()
      messages = Object.values(messagesData).sort((a: any, b: any) => a.timestamp - b.timestamp)
    }

    console.log(`✅ Found ${messages.length} messages for conversation ${conversationId}`)
    
    return NextResponse.json({
      messages: messages,
      conversation: {
        id: conversationId,
        customerName: conversation.customerName,
        status: conversation.status,
        lastActivity: conversation.lastActivity
      },
      source: 'firebase',
      count: messages.length
    }, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      }
    })

  } catch (error) {
    console.error('🚨 Messages API error:', error)
    
    return NextResponse.json(
      {
        error: 'Failed to fetch messages',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { 
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
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
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
} 