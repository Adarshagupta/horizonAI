import { NextRequest, NextResponse } from 'next/server'
import { generateAIResponse, shouldTransferToHuman, detectUrgency } from '@/lib/gemini'
import { realtimeChatService } from '@/lib/realtime-chat'
import { dataStore } from '@/lib/data-store'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      message, 
      businessId, 
      conversationId, 
      customerInfo, 
      previousMessages = [] 
    } = body

    // Validate required fields
    if (!message || !businessId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    console.log('Realtime chat request:', { conversationId, businessId, customerInfo, messagePreview: message.substring(0, 30) })

    // Check if an agent is already connected to this conversation
    if (conversationId) {
      const existingConversation = dataStore.getConversation(conversationId)
      console.log('🔍 Checking existing conversation:', {
        conversationId,
        exists: !!existingConversation,
        status: existingConversation?.status,
        assignedAgent: existingConversation?.assignedAgent,
        agentName: existingConversation?.agentName
      })
      
      if (existingConversation && existingConversation.status === 'connected' && existingConversation.assignedAgent) {
        console.log('✅ Agent already connected to conversation, saving customer message only')
        
        // Just save the customer message - don't generate AI response
        try {
          dataStore.addMessage(conversationId, {
            content: message,
            type: 'customer',
            sender: customerInfo?.name || 'Customer',
            timestamp: Date.now(),
            messageType: 'text'
          })
        } catch (error) {
          console.error('Failed to save customer message:', error)
        }

        return NextResponse.json({
          success: true,
          messageDelivered: true,
          silent: true, // Don't show as a message bubble
          agentConnected: true,
          agentName: existingConversation.agentName,
          metadata: {
            responseTime: Date.now(),
            businessId,
            conversationId,
            agentConnected: true,
            messageStatus: 'delivered'
          }
        }, {
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
          }
        })
      } else {
        console.log('❌ Agent check failed - will continue with AI response')
      }
    }

    // Check if human agent is explicitly requested
    if (shouldTransferToHuman(message)) {
      await realtimeChatService.requestHumanAgent(conversationId, message)
      
      return NextResponse.json({
        message: "I understand you'd like to speak with a human agent. Let me connect you with someone from our team who can provide more personalized assistance.",
        confidence: 1.0,
        needsHuman: true,
        suggestedActions: ['Wait for agent', 'Continue with AI', 'Leave message']
      }, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        }
      })
    }

    // Create conversation if it doesn't exist
    if (conversationId && customerInfo) {
      try {
        // Check if this is the first message (new conversation)
        const isNewConversation = previousMessages.length === 0
        
        if (isNewConversation) {
          await realtimeChatService.createConversation(conversationId, {
            businessId,
            customerId: customerInfo.email,
            customerName: customerInfo.name,
            customerEmail: customerInfo.email,
            status: 'waiting',
            unreadCount: 0,
            priority: 'medium'
          })
        }

        // Send customer message to realtime database
        try {
          await realtimeChatService.sendMessage(conversationId, {
            conversationId,
            content: message,
            sender: {
              id: 'customer',
              name: customerInfo.name,
              type: 'customer'
            },
            read: false,
            messageType: 'text'
          })
          console.log('✅ Message saved to Firebase successfully')
        } catch (dbError) {
          console.error('🚨 CRITICAL: Firebase write failed:', dbError)
          // DO NOT fallback to in-memory store in production
          // This causes the conversation persistence issues
          
          // Only use fallback in development for testing
          if (process.env.NODE_ENV !== 'production') {
            console.log('Development mode: Using datastore fallback')
            try {
              // Ensure conversation exists in datastore
              let conversation = dataStore.getConversation(conversationId)
              if (!conversation) {
                conversation = dataStore.createConversation({
                  id: conversationId,
                  customerName: customerInfo.name,
                  customerEmail: customerInfo.email,
                  customerId: customerInfo.email,
                  businessId,
                  status: 'waiting',
                  priority: 'medium',
                  startedAt: Date.now(),
                  lastActivity: Date.now(),
                  unreadCount: 0
                })
              }
              
              // Add customer message to datastore
              dataStore.addMessage(conversationId, {
                content: message,
                type: 'customer',
                sender: customerInfo.name,
                timestamp: Date.now(),
                messageType: 'text'
              })
            } catch (datastoreError) {
              console.error('Failed to save to datastore as well:', datastoreError)
            }
          } else {
            // In production, we need Firebase to work
            throw new Error('Firebase database is required for production deployment')
          }
        }

      } catch (realtimeError) {
        console.error('Realtime database error:', realtimeError)
        // Continue with AI response even if realtime fails
      }
    }

    // Check again if agent is connected before generating AI response
    if (conversationId) {
      const finalCheck = dataStore.getConversation(conversationId)
      if (finalCheck && finalCheck.status === 'connected' && finalCheck.assignedAgent) {
        console.log('🛑 Final check: Agent is connected, NOT generating AI response')
        return NextResponse.json({
          success: true,
          messageDelivered: true,
          silent: true,
          agentConnected: true,
          agentName: finalCheck.agentName,
          metadata: {
            responseTime: Date.now(),
            businessId,
            conversationId,
            agentConnected: true,
            messageStatus: 'delivered'
          }
        }, {
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
          }
        })
      }
    }

    // Detect urgency
    const urgency = detectUrgency(message)

    // Generate AI response
    console.log('🤖 Generating AI response - no agent connected')
    const aiResponse = await generateAIResponse(message, {
      customerName: customerInfo?.name,
      previousMessages: previousMessages.map((msg: any) => msg.content),
      businessType: 'Customer Support Platform'
    })

    // Send AI response to realtime database
    if (conversationId) {
      try {
        try {
          await realtimeChatService.sendMessage(conversationId, {
            conversationId,
            content: aiResponse.message,
            sender: {
              id: 'ai',
              name: 'AI Assistant',
              type: 'ai'
            },
            read: false,
            messageType: 'text'
          })
        } catch (dbError) {
          console.log('AI response database write failed, saving to datastore instead:', dbError)
          // Fallback: Save AI response to in-memory datastore
          try {
            dataStore.addMessage(conversationId, {
              content: aiResponse.message,
              type: 'agent', // AI responses appear as agent messages in datastore
              sender: 'AI Assistant',
              timestamp: Date.now(),
              messageType: 'text'
            })
          } catch (datastoreError) {
            console.error('Failed to save AI response to datastore:', datastoreError)
          }
        }

        // Create notification if confidence is low or urgency is high
        if (aiResponse.confidence < 0.6 || urgency === 'high') {
          try {
            await realtimeChatService.createAgentNotification(conversationId, 'urgent_message')
          } catch (notifError) {
            console.log('Notification creation failed (continuing anyway):', notifError)
          }
        }

      } catch (realtimeError) {
        console.error('Error sending AI response to realtime:', realtimeError)
      }
    }

    // Enhanced response with additional metadata
    const response = {
      message: aiResponse.message,
      confidence: aiResponse.confidence,
      suggestedActions: aiResponse.suggestedActions,
      urgency,
      needsHuman: aiResponse.confidence < 0.6 || urgency === 'high',
      metadata: {
        responseTime: Date.now(),
        businessId,
        conversationId,
        realtime: true
      }
    }

    // Add CORS headers for cross-origin requests
    const headers = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    }

    return NextResponse.json(response, { headers })

  } catch (error) {
    console.error('Realtime chat API error:', error)
    
    return NextResponse.json(
      {
        message: "I'm sorry, I'm experiencing technical difficulties. Please try again or contact our support team directly.",
        confidence: 0.5,
        error: true,
        suggestedActions: ['Try again', 'Contact support', 'Leave message']
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