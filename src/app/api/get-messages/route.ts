import { NextRequest, NextResponse } from 'next/server'
import { dataStore } from '@/lib/data-store'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const conversationId = searchParams.get('conversationId')
    const since = searchParams.get('since') // timestamp to get messages after
    
    if (!conversationId) {
      return NextResponse.json(
        { error: 'Missing conversationId parameter' },
        { status: 400 }
      )
    }

    console.log('Getting messages for conversation:', conversationId, since ? `since ${since}` : 'all messages')

    // Get conversation
    const conversation = dataStore.getConversation(conversationId)
    if (!conversation) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      )
    }

    // Filter messages if since timestamp provided
    let messages = conversation.messages
    if (since) {
      const sinceTimestamp = parseInt(since)
      messages = messages.filter(msg => msg.timestamp > sinceTimestamp)
    }

    const response = {
      success: true,
      conversationId,
      messages,
      totalMessages: conversation.messages.length,
      newMessages: messages.length,
      conversation: {
        id: conversation.id,
        customerName: conversation.customerName,
        status: conversation.status,
        agentConnected: !!conversation.assignedAgent,
        agentName: conversation.agentName,
        lastActivity: conversation.lastActivity
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
    console.error('Get messages API error:', error)
    return NextResponse.json(
      { error: 'Failed to get messages', message: String(error) },
      { status: 500 }
    )
  }
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