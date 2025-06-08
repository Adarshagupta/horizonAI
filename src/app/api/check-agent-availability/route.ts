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

    console.log('Checking agent availability for business:', businessId)

    // Get agents from data store
    const agents = dataStore.getAgents(businessId)
    
    let availableAgents = 0
    let totalAgents = agents.length
    const agentList: any[] = []

    agents.forEach(agent => {
      const isAvailable = agent.status === 'online' && agent.activeConversations < 5
      
      if (isAvailable) {
        availableAgents++
      }

      agentList.push({
        id: agent.id,
        name: agent.name,
        status: agent.status,
        activeConversations: agent.activeConversations,
        available: isAvailable
      })
    })

    // Calculate estimated wait time (24/7 support)
    let estimatedWaitTime = 'Not available'
    let message = 'No agents are currently available.'
    
    if (availableAgents > 0) {
      if (availableAgents >= 3) {
        estimatedWaitTime = '1-2 minutes'
        message = `Great news! We have ${availableAgents} agents available to help you right now.`
      } else if (availableAgents === 2) {
        estimatedWaitTime = '2-5 minutes'
        message = `We have ${availableAgents} agents available to help you.`
      } else {
        estimatedWaitTime = '2-5 minutes'
        message = `We have ${availableAgents} agent available to help you right now.`
      }
    } else {
      estimatedWaitTime = '10-15 minutes'
      message = 'All our agents are currently busy. You\'ll be connected to the next available agent.'
    }

    const now = new Date()
    
    const response = {
      available: availableAgents > 0,
      availableAgents,
      totalAgents,
      isBusinessHours: true, // Always available (24/7)
      estimatedWaitTime,
      businessHours: '24/7 Support Available',
      currentTime: now.toISOString(),
      agents: agentList,
      message,
      source: 'data-store'
    }

    // Add CORS headers
    const headers = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    }

    return NextResponse.json(response, { headers })

  } catch (error) {
    console.error('Agent availability API error:', error)
    
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