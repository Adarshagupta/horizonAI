'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { realtimeChatService } from '@/lib/realtime-chat'
import { Bell, MessageCircle, User, Clock, AlertTriangle } from 'lucide-react'

interface Notification {
  id: string
  conversationId: string
  type: 'human_requested' | 'new_conversation' | 'urgent_message'
  customerName: string
  customerEmail: string
  priority: 'low' | 'medium' | 'high'
  timestamp: number
  read: boolean
  message: string
}

export default function NotificationCenter() {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    if (!user) return

    const businessId = user.businessId || user.id

    // Listen to real-time notifications
    const unsubscribe = realtimeChatService.listenToAgentNotifications(
      businessId,
      (newNotifications) => {
        setNotifications(newNotifications)
        setUnreadCount(newNotifications.filter(n => !n.read).length)
      }
    )

    // Update agent presence
    realtimeChatService.updateAgentPresence(user.id, businessId, {
      id: user.id,
      name: user.name || 'Agent',
      status: 'online',
      activeConversations: 0
    })

    return () => {
      unsubscribe()
      // Set agent as offline when component unmounts
      realtimeChatService.updateAgentPresence(user.id, businessId, {
        id: user.id,
        name: user.name || 'Agent',
        status: 'offline',
        activeConversations: 0
      })
    }
  }, [user])

  const handleConnectToCustomer = async (notification: Notification) => {
    try {
      // Connect agent to conversation
      await realtimeChatService.connectAgent(
        notification.conversationId,
        user!.id,
        user!.name || 'Support Agent'
      )

      // Mark notification as read
      // This would typically be handled by the real-time service
      console.log('Connected to customer:', notification.customerName)
      
      // You could redirect to a conversation interface here
      window.open(`/dashboard/conversations/${notification.conversationId}`, '_blank')
      
    } catch (error) {
      console.error('Error connecting to customer:', error)
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'text-red-600 bg-red-100'
      case 'medium':
        return 'text-yellow-600 bg-yellow-100'
      case 'low':
        return 'text-green-600 bg-green-100'
      default:
        return 'text-gray-600 bg-gray-100'
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'human_requested':
        return <User className="h-4 w-4" />
      case 'urgent_message':
        return <AlertTriangle className="h-4 w-4" />
      case 'new_conversation':
        return <MessageCircle className="h-4 w-4" />
      default:
        return <MessageCircle className="h-4 w-4" />
    }
  }

  const formatTimestamp = (timestamp: number) => {
    const now = Date.now()
    const diff = now - timestamp
    const minutes = Math.floor(diff / (1000 * 60))
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)

    if (days > 0) return `${days}d ago`
    if (hours > 0) return `${hours}h ago`
    if (minutes > 0) return `${minutes}m ago`
    return 'Just now'
  }

  return (
    <div className="relative">
      {/* Notification Bell */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-lg"
      >
        <Bell className="h-6 w-6" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">
                Notifications
              </h3>
              {unreadCount > 0 && (
                <span className="text-sm text-gray-500">
                  {unreadCount} unread
                </span>
              )}
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-8 text-center">
                <Bell className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No notifications yet</p>
                <p className="text-sm text-gray-500 mt-2">
                  Customer requests will appear here
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-4 hover:bg-gray-50 transition-colors ${
                      !notification.read ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      <div className={`p-2 rounded-full ${getPriorityColor(notification.priority)}`}>
                        {getTypeIcon(notification.type)}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-gray-900">
                            {notification.customerName}
                          </p>
                          <div className="flex items-center space-x-2">
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(notification.priority)}`}>
                              {notification.priority}
                            </span>
                            <span className="text-xs text-gray-500">
                              {formatTimestamp(notification.timestamp)}
                            </span>
                          </div>
                        </div>
                        
                        <p className="text-sm text-gray-600 mt-1">
                          {notification.message}
                        </p>
                        
                        <p className="text-xs text-gray-500 mt-1">
                          {notification.customerEmail}
                        </p>

                        <div className="mt-3 flex space-x-2">
                          <button
                            onClick={() => handleConnectToCustomer(notification)}
                            className="px-3 py-1 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            Connect
                          </button>
                          <button
                            onClick={() => {/* Handle view conversation */}}
                            className="px-3 py-1 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500"
                          >
                            View
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {notifications.length > 0 && (
            <div className="p-3 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => {/* Handle mark all as read */}}
                className="w-full text-sm text-gray-600 hover:text-gray-900 font-medium"
              >
                Mark all as read
              </button>
            </div>
          )}
        </div>
      )}

      {/* Click outside to close */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  )
} 