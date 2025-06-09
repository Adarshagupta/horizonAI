import { NextRequest, NextResponse } from 'next/server'
import { realtimeChatService } from '@/lib/realtime-chat'

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

    console.log('🔄 Agent request for conversation:', conversationId, 'Business:', businessId)

    // Check if conversation exists in Firebase, create if not
    let conversation = await realtimeChatService.getConversation(conversationId)
    
    if (!conversation) {
      console.log('🆕 Creating new conversation in Firebase:', conversationId)
      await realtimeChatService.createConversation(conversationId, {
        businessId,
        customerId: customerInfo.email || `customer_${Date.now()}`,
        customerName: customerInfo.name || 'Customer',
        customerEmail: customerInfo.email || 'customer@example.com',
        status: 'waiting',
        unreadCount: 0,
        priority: 'medium'
      })
      
      conversation = await realtimeChatService.getConversation(conversationId)
      console.log('✅ Conversation created in Firebase successfully')
    } else {
      console.log('✅ Found existing conversation in Firebase:', conversationId)
    }

    // Add customer message to Firebase if provided
    if (message && message.trim()) {
      await realtimeChatService.sendMessage(conversationId, {
        conversationId,
        content: message,
        sender: {
          id: 'customer',
          name: customerInfo.name || 'Customer',
          type: 'customer'
        },
        read: false,
        messageType: 'text'
      })
      console.log('✅ Customer message saved to Firebase')
    }

    // Add system message about agent request to Firebase
    await realtimeChatService.sendMessage(conversationId, {
      conversationId,
      content: 'Agent requested - connecting you to the next available agent...',
      sender: {
        id: 'system',
        name: 'System',
        type: 'ai'
      },
      read: false,
      messageType: 'system'
    })
    console.log('✅ System message saved to Firebase')

    // Use Firebase to create agent notification
    await realtimeChatService.createAgentNotification(conversationId, 'human_requested')
    console.log('✅ Agent notification created in Firebase')

    const response = {
      success: true,
      message: 'Human agent requested successfully',
      conversationId,
      estimatedWaitTime: '2-5 minutes',
      businessHours: '24/7 Support Available',
      metadata: {
        requestTime: Date.now(),
        businessId,
        customerName: customerInfo.name
      },
      source: 'firebase'
    }

    return NextResponse.json(response, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      }
    })

  } catch (error) {
    console.error('🚨 Request agent API error:', error)
    
    return NextResponse.json(
      {
        success: false,
        error: 'system_error',
        message: 'Unable to connect to support team at this time. Please try again in a moment.',
        details: error instanceof Error ? error.message : 'Unknown error'
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