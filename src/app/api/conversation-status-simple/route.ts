import { NextRequest, NextResponse } from 'next/server'
import { rtdb } from '@/lib/firebase'
import { ref, get } from 'firebase/database'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const conversationId = searchParams.get('conversationId')

    if (!conversationId) {
      return NextResponse.json({ error: 'Missing conversation ID' }, { status: 400 })
    }

    console.log('🔍 Getting simple conversation status for:', conversationId)

    // Get conversation from Firebase
    const conversationRef = ref(rtdb, `conversations/${conversationId}`)
    const snapshot = await get(conversationRef)
    
    if (!snapshot.exists()) {
      console.log('❌ Conversation not found in Firebase')
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
    }

    const conversation = snapshot.val()
    console.log('✅ Found conversation in Firebase:', conversationId)

    return NextResponse.json({
      conversationId,
      status: conversation.status,
      agentConnected: !!conversation.assignedAgent,
      agentName: conversation.agentName || null,
      source: 'firebase'
    }, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      }
    })

  } catch (error) {
    console.error('🚨 Simple conversation status API error:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: String(error) },
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