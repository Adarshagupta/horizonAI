import { NextRequest, NextResponse } from 'next/server'
import { dataStore } from '@/lib/data-store'

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

    console.log('Fetching conversations for business ID:', businessId)

    // Get conversations from data store
    const conversations = dataStore.getConversations(businessId)
    
    console.log(`Found ${conversations.length} conversations for business ${businessId}`)
    
    return NextResponse.json({
      conversations,
      source: 'data-store',
      count: conversations.length
    })

  } catch (error) {
    console.error('Conversations API error:', error)
    
    return NextResponse.json(
      {
        error: 'Failed to fetch conversations',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
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