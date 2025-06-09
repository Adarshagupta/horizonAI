import { NextRequest, NextResponse } from 'next/server'
import { rtdb } from '@/lib/firebase'
import { ref, get } from 'firebase/database'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const businessId = searchParams.get('businessId')

    if (!businessId) {
      return NextResponse.json(
        { error: 'Missing business ID' },
        { status: 400 }
      )
    }

    console.log('🔍 Fetching conversations for business ID:', businessId)

    // Get all conversations from Firebase
    const conversationsRef = ref(rtdb, 'conversations')
    const snapshot = await get(conversationsRef)
    
    let businessConversations: any[] = []
    
    if (snapshot.exists()) {
      const allConversations = snapshot.val()
      
      // Filter conversations by businessId
      businessConversations = Object.values(allConversations).filter(
        (conv: any) => conv.businessId === businessId
      )
      
      console.log(`✅ Found ${businessConversations.length} conversations for business ${businessId}`)
    } else {
      console.log('📭 No conversations found in Firebase')
    }
    
    return NextResponse.json({
      conversations: businessConversations,
      source: 'firebase',
      count: businessConversations.length
    }, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS', 
        'Access-Control-Allow-Headers': 'Content-Type',
      }
    })

  } catch (error) {
    console.error('🚨 Conversations API error:', error)
    
    return NextResponse.json(
      {
        error: 'Failed to fetch conversations',
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