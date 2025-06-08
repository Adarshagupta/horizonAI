import { NextRequest, NextResponse } from 'next/server'
import { dataStore } from '@/lib/data-store'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const conversationId = searchParams.get('id')

    console.log('Getting conversation status for ID:', conversationId)

    if (!conversationId) {
      return NextResponse.json({ error: 'Missing conversation ID' }, { status: 400 })
    }

    const conversation = dataStore.getConversation(conversationId)
    
    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
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
      source: 'data-store'
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