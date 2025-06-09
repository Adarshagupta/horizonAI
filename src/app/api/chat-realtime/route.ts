import { NextRequest, NextResponse } from 'next/server'
import { generateAIResponse, shouldTransferToHuman, detectUrgency } from '@/lib/gemini'
import { realtimeChatService } from '@/lib/realtime-chat'

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

    console.log('🔄 Realtime chat request:', { conversationId, businessId, customerInfo, messagePreview: message.substring(0, 30) })

    // Check if an agent is already connected to this conversation via Firebase
    if (conversationId) {
      try {
        const existingConversation = await realtimeChatService.getConversation(conversationId)
        console.log('🔍 Checking existing conversation in Firebase:', {
          conversationId,
          exists: !!existingConversation,
          status: existingConversation?.status,
          assignedAgent: existingConversation?.assignedAgent,
          agentName: existingConversation?.agentName
        })
        
        if (existingConversation && existingConversation.status === 'connected' && existingConversation.assignedAgent) {
          console.log('✅ Agent already connected to conversation, saving customer message only')
          
          // Just save the customer message to Firebase - don't generate AI response
          await realtimeChatService.sendMessage(conversationId, {
            conversationId,
            content: message,
            sender: {
              id: 'customer',
              name: customerInfo?.name || 'Customer',
              type: 'customer'
            },
            read: false,
            messageType: 'text'
          })
          console.log('✅ Customer message saved to Firebase')

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
      } catch (error) {
        console.error('Error checking agent connection via Firebase:', error)
      }
    }

    // Check if human agent is explicitly requested (only if no agent is already connected)
    let agentAlreadyConnected = false
    if (conversationId) {
      try {
        const currentConversation = await realtimeChatService.getConversation(conversationId)
        agentAlreadyConnected = !!(currentConversation && (currentConversation.status === 'connected' || currentConversation.assignedAgent))
        console.log('🔍 Agent connection check before human transfer:', {
          found: !!currentConversation,
          status: currentConversation?.status,
          assignedAgent: currentConversation?.assignedAgent,
          agentAlreadyConnected
        })
      } catch (error) {
        console.error('Error checking agent connection:', error)
      }
    }
    
    if (!agentAlreadyConnected && shouldTransferToHuman(message)) {
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
        // Check if conversation already exists in Firebase
        console.log('🔍 Checking for existing conversation:', conversationId)
        const existingConversation = await realtimeChatService.getConversation(conversationId)
        console.log('🔥 Firebase lookup result:', existingConversation ? 'FOUND' : 'NOT FOUND')
        
        if (existingConversation) {
          console.log('📋 Existing conversation details:', {
            id: existingConversation.id,
            status: existingConversation.status,
            assignedAgent: existingConversation.assignedAgent,
            agentName: existingConversation.agentName,
            businessId: existingConversation.businessId
          })
        }
        
        const isNewConversation = !existingConversation
        console.log('🎯 Decision:', isNewConversation ? 'CREATE NEW' : 'USE EXISTING')
        
        if (isNewConversation) {
          console.log('🆕 Creating new conversation:', conversationId)
          await realtimeChatService.createConversation(conversationId, {
            businessId,
            customerId: customerInfo.email,
            customerName: customerInfo.name,
            customerEmail: customerInfo.email,
            status: 'waiting',
            unreadCount: 0,
            priority: 'medium'
          })
        } else {
          console.log('✅ Using existing conversation:', conversationId, 'Status:', existingConversation?.status)
        }

        // Send customer message to Firebase
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

      } catch (error) {
        console.error('🚨 CRITICAL: Firebase operation failed:', error)
        // In production, Firebase is required
        throw new Error('Firebase database is required for operation')
      }
    }

    // Check again if agent is connected before generating AI response
    if (conversationId) {
      console.log('🔄 Final agent check for conversation:', conversationId)
      try {
        const finalCheck = await realtimeChatService.getConversation(conversationId)
        if (finalCheck) {
          console.log('🔥 Final check - Found in Firebase:', {
            status: finalCheck.status,
            assignedAgent: finalCheck.assignedAgent,
            agentName: finalCheck.agentName
          })
          
          if (finalCheck.status === 'connected' || finalCheck.assignedAgent) {
            console.log('🛑 Final check: Agent is connected, NOT generating AI response', {
              status: finalCheck.status,
              agentConnected: !!finalCheck.assignedAgent,
              assignedAgent: finalCheck.assignedAgent
            })
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
          } else {
            console.log('➡️ Final check: No agent connected, proceeding with AI response')
          }
        } else {
          console.log('❌ Final check: No conversation found in Firebase')
        }
      } catch (error) {
        console.error('🚨 Error in final agent check:', error)
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

    // Send AI response to Firebase
    if (conversationId) {
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
        console.log('✅ AI response saved to Firebase')

        // Create notification if confidence is low or urgency is high
        if (aiResponse.confidence < 0.6 || urgency === 'high') {
          try {
            await realtimeChatService.createAgentNotification(conversationId, 'urgent_message')
          } catch (notifError) {
            console.log('Notification creation failed (continuing anyway):', notifError)
          }
        }

      } catch (error) {
        console.error('🚨 Error sending AI response to Firebase:', error)
        throw new Error('Failed to save AI response to database')
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
        realtime: true,
        source: 'firebase'
      }
    }

    return NextResponse.json(response, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      }
    })

  } catch (error) {
    console.error('🚨 Realtime chat API error:', error)
    
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