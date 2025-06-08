import { NextRequest, NextResponse } from 'next/server'
import { realtimeChatService } from '@/lib/realtime-chat'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { conversationId } = body

    if (!conversationId) {
      return NextResponse.json({ error: 'Missing conversationId' }, { status: 400 })
    }

    console.log('Testing agent-connect Firebase lookup for:', conversationId)

    // Use the exact same logic as agent-connect
    let conversation: any = null
    try {
      console.log('🔍 Looking up conversation in Firebase:', conversationId)
      
      // Use direct read instead of listener for better reliability
      conversation = await realtimeChatService.getConversation(conversationId)
      
      if (conversation) {
        console.log('✅ Found conversation in Firebase:', conversationId, 'Status:', conversation.status)
        return NextResponse.json({
          success: true,
          found: true,
          conversation,
          message: 'Conversation found successfully'
        })
      } else {
        console.log('❌ Conversation not found in Firebase:', conversationId)
        return NextResponse.json({
          success: false,
          found: false,
          conversationId,
          message: 'Conversation not found in Firebase'
        })
      }
    } catch (firebaseError) {
      console.log('🚨 Firebase lookup failed:', firebaseError instanceof Error ? firebaseError.message : 'Unknown error')
      return NextResponse.json({
        success: false,
        error: 'Firebase lookup failed',
        details: firebaseError instanceof Error ? firebaseError.message : 'Unknown error'
      }, { status: 500 })
    }

  } catch (error) {
    console.error('Test agent Firebase API error:', error)
    return NextResponse.json({
      success: false,
      error: 'Test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
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