'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useState, useEffect } from 'react'
import { realtimeChatService } from '@/lib/realtime-chat'

export default function DebugAgentStatus() {
  const { user } = useAuth()
  const [agentStatus, setAgentStatus] = useState<any>(null)
  const [availabilityCheck, setAvailabilityCheck] = useState<any>(null)
  const [businessId, setBusinessId] = useState<string>('')

  useEffect(() => {
    if (!user) return
    
    const currentBusinessId = user.businessId || user.id
    setBusinessId(currentBusinessId)
    
    // Get agent presence
    const loadAgentStatus = async () => {
      try {
        const status = await realtimeChatService.getAgentPresence(currentBusinessId, user.id)
        setAgentStatus(status)
        
        // Test availability API
        const response = await fetch(`/api/check-agent-availability?businessId=${currentBusinessId}`)
        const availability = await response.json()
        setAvailabilityCheck(availability)
      } catch (error) {
        console.error('Debug error:', error)
      }
    }
    
    loadAgentStatus()
  }, [user])

  const testSetOnline = async () => {
    if (!user) return
    
    try {
      await realtimeChatService.updateAgentPresence(businessId, user.id, {
        status: 'online',
        name: user.name || user.email || 'Agent',
        email: user.email || '',
        lastSeen: Date.now(),
        activeConversations: 0
      })
      
      // Refresh status
      const status = await realtimeChatService.getAgentPresence(businessId, user.id)
      setAgentStatus(status)
      
      // Test availability API again
      const response = await fetch(`/api/check-agent-availability?businessId=${businessId}`)
      const availability = await response.json()
      setAvailabilityCheck(availability)
      
      alert('Status updated! Check the data below.')
    } catch (error) {
      console.error('Error setting online:', error)
      alert('Error: ' + error)
    }
  }

  if (!user) {
    return <div className="p-6">Please log in to debug agent status</div>
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Agent Status Debug</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* User Info */}
        <div className="bg-white p-4 rounded-lg border">
          <h2 className="text-lg font-semibold mb-3">User Info</h2>
          <div className="space-y-2 text-sm">
            <div><strong>User ID:</strong> {user.id}</div>
            <div><strong>Name:</strong> {user.name}</div>
            <div><strong>Email:</strong> {user.email}</div>
            <div><strong>Business ID:</strong> {user.businessId || 'undefined'}</div>
            <div><strong>Effective Business ID:</strong> {businessId}</div>
          </div>
        </div>

        {/* Agent Presence */}
        <div className="bg-white p-4 rounded-lg border">
          <h2 className="text-lg font-semibold mb-3">Agent Presence (Realtime DB)</h2>
          {agentStatus ? (
            <div className="space-y-2 text-sm">
              <div><strong>Status:</strong> {agentStatus.status}</div>
              <div><strong>Name:</strong> {agentStatus.name}</div>
              <div><strong>Email:</strong> {agentStatus.email}</div>
              <div><strong>Active Conversations:</strong> {agentStatus.activeConversations}</div>
              <div><strong>Last Seen:</strong> {new Date(agentStatus.lastSeen).toLocaleString()}</div>
            </div>
          ) : (
            <div className="text-gray-500">No agent presence found</div>
          )}
        </div>

        {/* Availability API Response */}
        <div className="bg-white p-4 rounded-lg border">
          <h2 className="text-lg font-semibold mb-3">Availability API Response</h2>
          {availabilityCheck ? (
            <div className="space-y-2 text-sm">
              <div><strong>Available:</strong> {availabilityCheck.available ? 'Yes' : 'No'}</div>
              <div><strong>Available Agents:</strong> {availabilityCheck.availableAgents}</div>
              <div><strong>Total Agents:</strong> {availabilityCheck.totalAgents}</div>
              <div><strong>Business Hours:</strong> {availabilityCheck.isBusinessHours ? 'Yes' : 'No'}</div>
              <div><strong>Message:</strong> {availabilityCheck.message}</div>
              <div><strong>Wait Time:</strong> {availabilityCheck.estimatedWaitTime}</div>
            </div>
          ) : (
            <div className="text-gray-500">No availability data</div>
          )}
        </div>

        {/* Raw Data */}
        <div className="bg-white p-4 rounded-lg border">
          <h2 className="text-lg font-semibold mb-3">Raw Data</h2>
          <div className="space-y-4">
            <div>
              <strong>Agent Status JSON:</strong>
              <pre className="text-xs bg-gray-100 p-2 rounded mt-1 overflow-auto">
                {JSON.stringify(agentStatus, null, 2)}
              </pre>
            </div>
            <div>
              <strong>Availability JSON:</strong>
              <pre className="text-xs bg-gray-100 p-2 rounded mt-1 overflow-auto">
                {JSON.stringify(availabilityCheck, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="mt-6 space-y-3">
        <button
          onClick={testSetOnline}
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
        >
          Force Set Agent Online & Refresh Data
        </button>
        
        <div className="text-sm text-gray-600">
          <p><strong>Expected Business ID in Widget:</strong> This should match your effective business ID above</p>
          <p><strong>Widget Test URL:</strong> Add <code>?businessId={businessId}</code> to your widget script</p>
        </div>
      </div>
    </div>
  )
} 