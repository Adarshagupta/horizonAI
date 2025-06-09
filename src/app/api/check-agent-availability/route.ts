import { NextRequest, NextResponse } from 'next/server'
import { realtimeChatService } from '@/lib/realtime-chat'

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

    console.log('🔍 Checking agent availability for business:', businessId)

    // For now, return default availability since we haven't fully implemented agent presence in Firebase
    // TODO: Implement proper agent presence tracking in Firebase
    const mockAgentAvailability = {
      available: true,
      onlineAgents: 2,
      estimatedWaitTime: '2-5 minutes',
      businessHours: '24/7 Support Available',
      source: 'firebase'
    }

    console.log('✅ Agent availability check completed')

    return NextResponse.json(mockAgentAvailability, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      }
    })

  } catch (error) {
    console.error('🚨 Agent availability API error:', error)
    
    return NextResponse.json(
      {
        error: 'Failed to check agent availability',
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