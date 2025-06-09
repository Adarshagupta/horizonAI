import { NextRequest, NextResponse } from 'next/server'
import { rtdb } from '@/lib/firebase'
import { ref, push, set, serverTimestamp } from 'firebase/database'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { customerName, customerEmail, customerInfo, message, businessId, priority = 'medium' } = body

    console.log('🎫 Creating offline ticket:', { customerName, customerEmail, customerInfo, businessId })

    // Extract customer details from either format
    const finalCustomerName = customerName || customerInfo?.name || 'Customer'
    const finalCustomerEmail = customerEmail || customerInfo?.email || 'customer@example.com'

    if (!message || !businessId) {
      return NextResponse.json(
        { error: 'Missing required fields (message and businessId)' },
        { status: 400 }
      )
    }

    // Create ticket in Firebase
    const ticketsRef = ref(rtdb, 'tickets')
    const newTicketRef = push(ticketsRef)
    
    const ticketData = {
      id: newTicketRef.key!,
      customerName: finalCustomerName,
      customerEmail: finalCustomerEmail,
      message,
      businessId,
      priority,
      status: 'pending',
      type: 'offline_message',
      createdAt: serverTimestamp(),
      lastActivity: serverTimestamp()
    }

    await set(newTicketRef, ticketData)
    
    console.log('✅ Offline ticket created in Firebase:', newTicketRef.key!)

    const response = {
      success: true,
      message: 'Your message has been received. We\'ll get back to you during business hours.',
      ticketId: newTicketRef.key!,
      businessHours: '9 AM - 6 PM EST, Monday - Friday',
      metadata: {
        customerName: finalCustomerName,
        customerEmail: finalCustomerEmail,
        businessId,
        priority,
        createdAt: Date.now()
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
    console.error('🚨 Create offline ticket API error:', error)
    return NextResponse.json(
      { error: 'Failed to create ticket', message: String(error) },
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