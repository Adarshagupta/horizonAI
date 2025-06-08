import { NextRequest, NextResponse } from 'next/server'
import { dataStore } from '@/lib/data-store'
import { realtimeChatService } from '@/lib/realtime-chat'
import { rtdb } from '@/lib/firebase'
import { ref, get } from 'firebase/database'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params
    const conversationId = params.id

    console.log('🔍 Getting conversation status for ID:', conversationId)

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

    // Test direct Firebase access first
    let conversation = null
    let source = 'unknown'
    
    try {
      console.log('🔥 Testing direct Firebase access...')
      const conversationRef = ref(rtdb, `conversations/${conversationId}`)
      const snapshot = await get(conversationRef)
      
      if (snapshot.exists()) {
        const data = snapshot.val()
        conversation = {
          id: snapshot.key!,
          ...data,
        }
        source = 'firebase-direct'
        console.log('✅ DIRECT Firebase access successful:', {
          id: conversation.id,
          status: conversation.status,
          assignedAgent: conversation.assignedAgent,
          agentName: conversation.agentName,
          businessId: conversation.businessId
        })
      } else {
        console.log('❌ DIRECT Firebase: No data found')
      }
    } catch (directError) {
      console.error('🚨 DIRECT Firebase access failed:', directError)
    }

    // If direct access failed, try through realtimeChatService
    if (!conversation) {
      try {
        console.log('🔥 Testing via realtimeChatService...')
        conversation = await realtimeChatService.getConversation(conversationId)
        if (conversation) {
          source = 'firebase-service'
          console.log('✅ RealtimeChatService access successful:', {
            id: conversation.id,
            status: conversation.status,
            assignedAgent: conversation.assignedAgent,
            agentName: conversation.agentName
          })
        } else {
          console.log('❌ RealtimeChatService: No data found')
        }
      } catch (serviceError) {
        console.error('🚨 RealtimeChatService failed:', serviceError)
      }
    }

    // Fallback to dataStore if Firebase completely fails
    if (!conversation) {
      try {
        console.log('🔄 Trying dataStore fallback...')
        conversation = dataStore.getConversation(conversationId)
        if (conversation) {
          source = 'data-store-fallback'
          console.log('✅ DataStore fallback successful')
        } else {
          console.log('❌ DataStore: No data found')
        }
      } catch (datastoreError) {
        console.error('🚨 DataStore fallback failed:', datastoreError)
      }
    }
    
    if (!conversation) {
      console.log('❌ Conversation not found in any data source')
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
      source: source,
      debug: {
        foundIn: source,
        timestamp: new Date().toISOString()
      }
    }

    console.log('✅ Returning conversation data from:', source)
    return NextResponse.json(response, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      }
    })

  } catch (error) {
    console.error('🚨 Conversation status API error:', error)
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