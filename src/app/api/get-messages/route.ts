import { NextRequest, NextResponse } from 'next/server'
import { rtdb } from '@/lib/firebase'
import { ref, get } from 'firebase/database'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const conversationId = searchParams.get('conversationId')
    const since = searchParams.get('since')
    
    if (!conversationId) {
      return NextResponse.json({ error: 'Missing conversationId' }, { status: 400 })
    }

    console.log('🔍 Getting messages for:', conversationId)

    const conversationRef = ref(rtdb, `conversations/${conversationId}`)
    const conversationSnapshot = await get(conversationRef)
    
    if (!conversationSnapshot.exists()) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
    }

    const conversation = conversationSnapshot.val()
    
    const messagesRef = ref(rtdb, `messages/${conversationId}`)
    const messagesSnapshot = await get(messagesRef)
    
    let messages: any[] = []
    if (messagesSnapshot.exists()) {
      const messagesData = messagesSnapshot.val()
      messages = Object.keys(messagesData).map(key => ({
        id: key,
        ...messagesData[key]
      })).sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0))
    }

    if (since) {
      const sinceTimestamp = parseInt(since)
      messages = messages.filter(msg => msg.timestamp > sinceTimestamp)
    }

    return NextResponse.json({
      success: true,
      conversationId,
      messages,
      totalMessages: messages.length,
      conversation: {
        id: conversationId,
        customerName: conversation.customerName,
        status: conversation.status,
        agentConnected: !!conversation.assignedAgent,
        agentName: conversation.agentName
      },
      source: 'firebase'
    }, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      }
    })

  } catch (error) {
    console.error('🚨 Get messages error:', error)
    return NextResponse.json({ error: 'Failed to get messages' }, { status: 500 })
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
