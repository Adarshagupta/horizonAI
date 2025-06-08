import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { conversationId, businessId, customerInfo, message } = body

    // Validate required fields
    if (!conversationId || !businessId || !customerInfo) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    console.log('Simple agent request:', { conversationId, businessId, customerInfo })

    // Return success immediately without Firebase operations
    const response = {
      success: true,
      message: 'Human agent requested successfully',
      conversationId,
      estimatedWaitTime: '2-5 minutes',
      businessHours: '9 AM - 6 PM EST',
      availableAgents: 1,
      metadata: {
        requestTime: Date.now(),
        businessId,
        customerName: customerInfo.name || 'Customer',
        mode: 'simplified-testing'
      }
    }

    // Add CORS headers
    const headers = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    }

    return NextResponse.json(response, { headers })

  } catch (error) {
    console.error('Simple request agent API error:', error)
    
    return NextResponse.json(
      {
        success: false,
        error: 'system_error',
        message: 'Unable to connect to support team at this time. Please try again in a moment.'
      },
      { 
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
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
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
} 