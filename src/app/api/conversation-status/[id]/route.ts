import { NextRequest, NextResponse } from 'next/server'
import { dataStore } from '@/lib/data-store'
import { realtimeChatService } from '@/lib/realtime-chat'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params
    const conversationId = params.id

    console.log('Getting conversation status for ID:', conversationId)

    if (!conversationId) {
      return NextResponse.json({ error: 'Missing conversation ID' }, { 
        status: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        }
      })
    }

    // Try Firebase first (persistent), then fallback to dataStore
    let conversation = null
    let source = 'unknown'
    try {
      conversation = await realtimeChatService.getConversation(conversationId)
      if (conversation) {
        source = 'firebase'
        console.log('✅ Found conversation in Firebase:', {
          id: conversation.id,
          status: conversation.status,
          assignedAgent: conversation.assignedAgent,
          agentName: conversation.agentName
        })
      } else {
        console.log('❌ Conversation not found in Firebase, trying dataStore fallback')
        conversation = dataStore.getConversation(conversationId)
        if (conversation) {
          source = 'data-store'
          console.log('✅ Found conversation in dataStore fallback')
        }
      }
    } catch (firebaseError) {
      console.log('🚨 Firebase lookup failed, using dataStore fallback:', firebaseError)
      conversation = dataStore.getConversation(conversationId)
      if (conversation) {
        source = 'data-store-fallback'
      }
    }
    
    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { 
        status: 404,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        }
      })
    }

    const response = {
      conversationId,
      status: conversation.status,
      agentConnected: !!conversation.assignedAgent,
      agentName: conversation.agentName || null,
      assignedAgent: conversation.assignedAgent || null,
      priority: conversation.priority,
      startedAt: conversation.startedAt,
      lastActivity: conversation.lastActivity,
      estimatedWaitTime: getWaitTime(conversation.status),
      messages: conversation.messages,
      metadata: {
        businessId: conversation.businessId,
        customerName: conversation.customerName,
        customerEmail: conversation.customerEmail,
        unreadCount: conversation.unreadCount
      },
      source: source
    }

    return NextResponse.json(response, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      }
    })

  } catch (error) {
    console.error('Conversation status API error:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: String(error) },
      { status: 500 }
    )
  }
}

function getWaitTime(status: string): string {
  if (status === 'connected') return 'Connected'
  if (status === 'waiting') return '3-7 minutes'
  if (status === 'ended') return 'Conversation ended'
  return '5-10 minutes'
}

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