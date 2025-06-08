import { NextRequest, NextResponse } from 'next/server'
import { generateAIResponse, shouldTransferToHuman, detectUrgency } from '@/lib/gemini'
import { collection, addDoc, doc, updateDoc, getDoc, setDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'

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

    // Check if human agent is explicitly requested
    if (shouldTransferToHuman(message)) {
      // Save message to Firestore
      if (conversationId && customerInfo) {
        await ensureConversationExists(conversationId, customerInfo, message, businessId)
        await saveMessageToFirestore(conversationId, message, customerInfo, 'customer', businessId)
      }

      return NextResponse.json({
        message: "I understand you'd like to speak with a human agent. Let me connect you with someone from our team who can provide more personalized assistance. Please hold on for a moment.",
        confidence: 1.0,
        needsHuman: true,
        suggestedActions: ['Wait for agent', 'Continue with AI', 'Leave message']
      })
    }

    // Detect urgency
    const urgency = detectUrgency(message)

    // Generate AI response
    const aiResponse = await generateAIResponse(message, {
      customerName: customerInfo?.name,
      previousMessages: previousMessages.map((msg: any) => msg.content),
      businessType: 'Customer Support Platform'
    })

    // Save messages to Firestore if conversation exists
    if (conversationId && customerInfo) {
      try {
        console.log('Saving conversation:', { conversationId, businessId, customerInfo })
        
        // First, ensure conversation exists
        await ensureConversationExists(conversationId, customerInfo, message, businessId)
        
        // Save customer message
        await saveMessageToFirestore(conversationId, message, customerInfo, 'customer', businessId)
        
        // Save AI response
        await saveMessageToFirestore(conversationId, aiResponse.message, {
          name: 'AI Assistant',
          email: 'ai@chatsupport.ai'
        }, 'ai', businessId, {
          confidence: aiResponse.confidence,
          suggestedActions: aiResponse.suggestedActions,
          urgency
        })

        // Update conversation status
        await updateConversationStatus(conversationId, urgency, aiResponse.confidence)
        console.log('Successfully saved conversation to Firestore')
      } catch (firestoreError) {
        console.error('Firestore error:', firestoreError)
        // Continue with response even if Firestore fails
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
        conversationId
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
    console.error('Chat API error:', error)
    
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

async function saveMessageToFirestore(
  conversationId: string, 
  content: string, 
  senderInfo: any, 
  senderType: 'customer' | 'agent' | 'ai',
  businessId: string,
  metadata: any = {}
) {
  try {
    const messageData = {
      content,
      type: 'text',
      sender: {
        id: senderType === 'customer' ? 'customer' : senderType === 'ai' ? 'ai' : senderInfo.id,
        name: senderInfo.name,
        type: senderType
      },
      createdAt: new Date(),
      ...metadata
    }

    // Try to add to subcollection first
    await addDoc(collection(db, 'conversations', conversationId, 'messages'), messageData)

    // Update conversation's last message
    await updateDoc(doc(db, 'conversations', conversationId), {
      lastMessage: content,
      lastMessageAt: new Date(),
      status: senderType === 'customer' ? 'open' : 'pending'
    })

  } catch (error) {
    console.error('Error saving message to Firestore:', error)
    throw error
  }
}

async function ensureConversationExists(conversationId: string, customerInfo: any, firstMessage: string, businessId: string) {
  try {
    // Check if conversation already exists
    const conversationRef = doc(db, 'conversations', conversationId)
    const conversationSnap = await getDoc(conversationRef)
    
    if (!conversationSnap.exists()) {
      // Create new conversation
      await createConversation(conversationId, customerInfo, firstMessage, businessId)
    }
  } catch (error) {
    console.error('Error ensuring conversation exists:', error)
  }
}

async function createConversation(conversationId: string, customerInfo: any, firstMessage: string, businessId: string) {
  try {
    const conversationData = {
      customerName: customerInfo.name,
      customerEmail: customerInfo.email,
      customerId: customerInfo.email, // Use email as customer ID
      subject: 'Chat from website',
      status: 'open',
      priority: 'medium',
      lastMessage: firstMessage,
      lastMessageAt: new Date(),
      createdAt: new Date(),
      businessId: businessId,
      tags: ['website', 'chat'],
      channel: 'website'
    }

    // Use setDoc with the conversationId to ensure consistent ID
    await setDoc(doc(db, 'conversations', conversationId), conversationData)
  } catch (error) {
    console.error('Error creating conversation:', error)
  }
}

async function updateConversationStatus(conversationId: string, urgency: string, confidence: number) {
  try {
    const updates: any = {}

    // Update priority based on urgency
    if (urgency === 'high') {
      updates.priority = 'high'
    } else if (urgency === 'medium' && confidence < 0.7) {
      updates.priority = 'medium'
    }

    // Update status based on confidence
    if (confidence < 0.6) {
      updates.status = 'escalated'
      updates.needsHumanAgent = true
    }

    if (Object.keys(updates).length > 0) {
      await updateDoc(doc(db, 'conversations', conversationId), updates)
    }
  } catch (error) {
    console.error('Error updating conversation status:', error)
  }
} 