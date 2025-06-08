import { NextRequest, NextResponse } from 'next/server'
import { realtimeChatService } from '@/lib/realtime-chat'

export async function GET(request: NextRequest) {
  try {
    console.log('Testing Firebase connectivity...')
    
    // Test 1: Try to create a test conversation
    const testConversationId = `test_${Date.now()}`
    
    try {
      await realtimeChatService.createConversation(testConversationId, {
        businessId: 'test_business',
        customerId: 'test_customer',
        customerName: 'Test Customer',
        customerEmail: 'test@example.com',
        status: 'waiting',
        unreadCount: 0,
        priority: 'medium'
      })
      
      console.log('✅ Firebase conversation creation successful')
      
      // Test 2: Try to read the conversation back
      const conversation = await new Promise((resolve, reject) => {
        const unsubscribe = realtimeChatService.listenToConversation(testConversationId, (conv) => {
          unsubscribe()
          resolve(conv)
        })
        setTimeout(() => {
          unsubscribe()
          reject(new Error('Timeout'))
        }, 5000)
      })
      
      if (conversation) {
        console.log('✅ Firebase conversation read successful')
        return NextResponse.json({
          success: true,
          message: 'Firebase is working correctly',
          testConversationId,
          conversation
        })
      } else {
        console.log('❌ Firebase conversation read failed - no data')
        return NextResponse.json({
          success: false,
          error: 'Firebase read failed - no data returned',
          testConversationId
        }, { status: 500 })
      }
      
    } catch (createError) {
      console.error('❌ Firebase conversation creation failed:', createError)
      return NextResponse.json({
        success: false,
        error: 'Firebase conversation creation failed',
        details: createError instanceof Error ? createError.message : 'Unknown error'
      }, { status: 500 })
    }
    
  } catch (error) {
    console.error('❌ Firebase test failed:', error)
    return NextResponse.json({
      success: false,
      error: 'Firebase test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
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