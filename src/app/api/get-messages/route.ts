import { NextRequest, NextResponse } from 'next/server'
import { dataStore } from '@/lib/data-store'
import { realtimeChatService } from '@/lib/realtime-chat'
import { rtdb } from '@/lib/firebase'
import { ref, get } from 'firebase/database'

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

    console.log('🔍 Getting messages for conversation:', conversationId, since ? `since ${since}` : 'all messages')

    // Try to get conversation from Firebase first (persistent), then fallback to dataStore
    let conversation: any = null
    let source = 'unknown'
    let messages: any[] = []
    
    try {
      console.log('🔥 Looking up conversation in Firebase:', conversationId)
      // Use direct Firebase access like conversation-status API
      const conversationRef = ref(rtdb, `conversations/${conversationId}`)
      const snapshot = await get(conversationRef)
      
      if (snapshot.exists()) {
        const data = snapshot.val()
        conversation = {
          id: snapshot.key!,
          ...data,
        }
        source = 'firebase-direct'
        console.log('✅ Found conversation via direct Firebase access')
        
        // Convert Firebase messages object to array
        if (conversation.messages && typeof conversation.messages === 'object') {
          messages = Object.keys(conversation.messages).map(key => ({
            id: key,
            ...conversation.messages[key]
          }))
          // Sort by timestamp
          messages.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0))
          console.log(`📨 Extracted ${messages.length} messages from Firebase`)
        } else {
          messages = []
          console.log('📨 No messages found in Firebase conversation')
        }
      } else {
        console.log('❌ Conversation not found in Firebase, trying dataStore')
        conversation = dataStore.getConversation(conversationId)
        if (conversation) {
          source = 'datastore'
          messages = conversation.messages || []
          console.log('✅ Found conversation in dataStore fallback')
        }
      }
    } catch (firebaseError) {
      console.log('🚨 Firebase lookup failed, using dataStore fallback:', firebaseError)
      conversation = dataStore.getConversation(conversationId)
      if (conversation) {
        source = 'datastore-fallback'
        messages = conversation.messages || []
      }
    }
    
    if (!conversation) {
      console.log('❌ Conversation not found in Firebase or dataStore:', conversationId)
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      )
    }

    // Firebase messages are now properly extracted above

    // Filter messages if since timestamp provided
    if (since && messages.length > 0) {
      const sinceTimestamp = parseInt(since)
      messages = messages.filter(msg => msg.timestamp > sinceTimestamp)
    }

    console.log(`✅ Found conversation via ${source}, ${messages.length} messages available`)

    const response = {
      success: true,
      conversationId,
      messages,
      totalMessages: messages.length,
      newMessages: messages.length,
      conversation: {
        id: conversation.id,
        customerName: conversation.customerName,
        status: conversation.status,
        agentConnected: !!conversation.assignedAgent,
        agentName: conversation.agentName,
        lastActivity: conversation.lastActivity
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
    console.error('🚨 Get messages API error:', error)
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