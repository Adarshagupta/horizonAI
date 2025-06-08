'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { realtimeChatService } from '@/lib/realtime-chat'
import { Power, Wifi, WifiOff } from 'lucide-react'

interface AgentStatusToggleProps {
  className?: string
  showLabel?: boolean
}

export default function AgentStatusToggle({ 
  className = '', 
  showLabel = true 
}: AgentStatusToggleProps) {
  const { user } = useAuth()
  const [isOnline, setIsOnline] = useState(false)
  const [loading, setLoading] = useState(true)
  const [activeConversations, setActiveConversations] = useState(0)

  useEffect(() => {
    if (!user) return

    const initializeStatus = async () => {
      try {
        // Get current agent status
        const businessId = user.businessId || user.id
        const agentId = user.id
        
        // Check current presence
        const status = await realtimeChatService.getAgentPresence(businessId, agentId)
        
        if (status) {
          setIsOnline(status.status === 'online')
          setActiveConversations(status.activeConversations || 0)
        }
        
        setLoading(false)
      } catch (error) {
        console.error('Error getting agent status:', error)
        setLoading(false)
      }
    }

    initializeStatus()

    // Listen for status changes
    const unsubscribe = realtimeChatService.listenToAgentPresence(
      user.businessId || user.id,
      user.id,
      (presence: any) => {
        if (presence) {
          setIsOnline(presence.status === 'online')
          setActiveConversations(presence.activeConversations || 0)
        }
      }
    )

    return () => {
      if (unsubscribe) unsubscribe()
    }
  }, [user])

  const toggleStatus = async () => {
    if (!user || loading) return

    setLoading(true)
    try {
      const businessId = user.businessId || user.id
      const agentId = user.id
      const newStatus = isOnline ? 'offline' : 'online'

      await realtimeChatService.updateAgentPresence(businessId, agentId, {
        status: newStatus,
        name: user.name || user.email || 'Agent',
        email: user.email || '',
        lastSeen: Date.now(),
        activeConversations: isOnline ? 0 : activeConversations // Reset conversations when going offline
      })

      setIsOnline(!isOnline)
      
      // If going offline, reset active conversations
      if (isOnline) {
        setActiveConversations(0)
      }

    } catch (error) {
      console.error('Error toggling agent status:', error)
      alert('Failed to update status. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (!user) return null

  const statusConfig = {
    online: {
      color: 'bg-green-500',
      textColor: 'text-green-700',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      icon: Wifi,
      label: 'Online'
    },
    offline: {
      color: 'bg-gray-500',
      textColor: 'text-gray-700',
      bgColor: 'bg-gray-50',
      borderColor: 'border-gray-200',
      icon: WifiOff,
      label: 'Offline'
    }
  }

  const currentStatus = isOnline ? statusConfig.online : statusConfig.offline
  const StatusIcon = currentStatus.icon

  return (
    <div className={`flex items-center space-x-3 ${className}`}>
      {showLabel && (
        <div className="text-sm text-gray-600">
          <span className="font-medium">Status:</span>
        </div>
      )}
      
      <div className={`flex items-center space-x-2 px-3 py-2 rounded-lg border ${currentStatus.bgColor} ${currentStatus.borderColor}`}>
        <div className="flex items-center space-x-2">
          <div className="relative">
            <div className={`h-3 w-3 rounded-full ${currentStatus.color}`}>
              {isOnline && (
                <div className={`absolute inset-0 h-3 w-3 rounded-full ${currentStatus.color} animate-ping opacity-75`}></div>
              )}
            </div>
          </div>
          
          <StatusIcon className={`h-4 w-4 ${currentStatus.textColor}`} />
          
          {showLabel && (
            <span className={`text-sm font-medium ${currentStatus.textColor}`}>
              {currentStatus.label}
            </span>
          )}
        </div>

        {isOnline && activeConversations > 0 && (
          <span className="text-xs text-gray-500 bg-white px-2 py-1 rounded">
            {activeConversations} active
          </span>
        )}
      </div>

      <button
        onClick={toggleStatus}
        disabled={loading}
        className={`
          flex items-center justify-center h-10 w-10 rounded-lg border-2 transition-all duration-200
          ${isOnline 
            ? 'border-red-200 bg-red-50 hover:bg-red-100 text-red-600' 
            : 'border-green-200 bg-green-50 hover:bg-green-100 text-green-600'
          }
          ${loading ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105 cursor-pointer'}
        `}
        title={isOnline ? 'Go Offline' : 'Go Online'}
      >
        {loading ? (
          <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full"></div>
        ) : (
          <Power className="h-4 w-4" />
        )}
      </button>

      {showLabel && (
        <div className="text-xs text-gray-500">
          <div>Click to {isOnline ? 'go offline' : 'go online'}</div>
          {isOnline && (
            <div className="text-green-600">Available for new conversations</div>
          )}
        </div>
      )}
    </div>
  )
} 