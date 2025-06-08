'use client'

import { useEffect, useState, useRef } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useParams, useRouter } from 'next/navigation'
import { realtimeChatService, RealtimeMessage, ConversationStatus } from '@/lib/realtime-chat'
import { Send, Phone, Video, MoreVertical, User, Clock, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function ConversationPage() {
  const { user } = useAuth()
  const { id: conversationId } = useParams()
  const router = useRouter()
  const [messages, setMessages] = useState<RealtimeMessage[]>([])
  const [conversation, setConversation] = useState<ConversationStatus | null>(null)
  const [messageInput, setMessageInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [connecting, setConnecting] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const [customerTyping, setCustomerTyping] = useState(false)
  const [typingTimeout, setTypingTimeout] = useState<NodeJS.Timeout | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!user || !conversationId) return

    setLoading(true)

    // Try to load messages from datastore API as fallback
    const loadMessagesFromAPI = async () => {
      try {
        const response = await fetch(`/api/get-messages?conversationId=${conversationId}`)
        if (response.ok) {
          const data = await response.json()
          console.log('Loaded messages from API:', data)
          
          // Convert datastore messages to RealtimeMessage format
          const convertedMessages: RealtimeMessage[] = data.messages.map((msg: any) => {
            const convertedMsg = {
              id: msg.id,
              conversationId: conversationId as string,
              content: msg.content,
              sender: {
                id: msg.type === 'customer' ? 'customer' : msg.type === 'agent' ? user?.id || 'agent' : 'system',
                name: msg.type === 'agent' ? msg.sender : msg.type === 'customer' ? 'Customer' : msg.sender,
                type: msg.type as 'customer' | 'agent' | 'system'
              },
              timestamp: msg.timestamp,
              read: false,
              messageType: msg.messageType
            }
            console.log('Converting message:', msg, 'to:', convertedMsg)
            return convertedMsg
          })
          
          setMessages(convertedMessages)
          
          // Set conversation data
          if (data.conversation) {
            setConversation({
              id: data.conversation.id,
              businessId: user.businessId || 'default',
              customerId: 'customer',
              customerName: data.conversation.customerName,
              customerEmail: '',
              status: data.conversation.status,
              startedAt: data.conversation.lastActivity,
              lastActivity: data.conversation.lastActivity,
              unreadCount: 0,
              priority: 'medium'
            })
          }
          
          // Auto-scroll to bottom
          setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
          }, 100)
        } else {
          console.log('Failed to load messages from API, trying realtime...')
        }
      } catch (error) {
        console.error('Error loading messages from API:', error)
      }
      setLoading(false)
    }

    // First try to load from API
    loadMessagesFromAPI()

    // Set up periodic refresh to get new messages
    const refreshInterval = setInterval(() => {
      // Reload messages every 3 seconds to catch new messages
      loadMessagesFromAPI()
    }, 3000)

    // Start typing status polling
    const typingInterval = setInterval(async () => {
      try {
        const response = await fetch(
          `/api/typing-status?conversationId=${conversationId}&excludeUserId=${user.id}`
        )
        if (response.ok) {
          const data = await response.json()
          const isCustomerTyping = data.typingUsers.some(
            (u: any) => u.userType === 'customer'
          )
          setCustomerTyping(isCustomerTyping)
        }
      } catch (error) {
        console.error('Error polling typing status:', error)
      }
    }, 1500)

    return () => {
      clearInterval(refreshInterval)
      clearInterval(typingInterval)
    }
  }, [user, conversationId])

  const handleConnectAsAgent = async () => {
    if (!user || !conversationId) return

    setConnecting(true)
    try {
      // Use the new agent connection API
      const response = await fetch('/api/agent-connect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          conversationId: conversationId,
          agentId: user.id,
          agentName: user.name || 'Support Agent',
          agentEmail: user.email
        })
      })

      if (response.ok) {
        const result = await response.json()
        console.log('Agent connected successfully:', result)
        
        // Refresh the page to load updated conversation and messages
        window.location.reload()
      } else {
        const error = await response.json()
        console.error('Failed to connect as agent:', error)
        
        if (error.error === 'Conversation already assigned') {
          alert(`This conversation is already being handled by ${error.assignedAgent}`)
        } else {
          alert('Failed to connect to conversation. Please try again.')
        }
      }
    } catch (error) {
      console.error('Error connecting as agent:', error)
      alert('Network error. Please check your connection and try again.')
    } finally {
      setConnecting(false)
    }
  }

  const handleSendMessage = async () => {
    if (!messageInput.trim() || !user || !conversationId) return

    const message = messageInput.trim()
    setMessageInput('')

    console.log('🤖 Agent sending message:', {
      conversationId,
      agentId: user.id,
      agentName: user.name,
      message
    })

    console.log('🤖 Agent sending message:', {
      conversationId,
      agentId: user.id,
      agentName: user.name,
      message
    })

    try {
      // Use the agent-message API for sending agent messages
      const response = await fetch('/api/agent-message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          conversationId: conversationId,
          agentId: user.id,
          agentName: user.name || 'Support Agent',
          message: message
        })
      })

      console.log('🤖 Agent message response:', response.status, response.ok)
      
      if (response.ok) {
        console.log('Message sent successfully')
        // Reload messages immediately to show the new message
        const loadMessagesFromAPI = async () => {
          try {
            const response = await fetch(`/api/get-messages?conversationId=${conversationId}`)
            if (response.ok) {
              const data = await response.json()
              
              // Convert datastore messages to RealtimeMessage format
              const convertedMessages: RealtimeMessage[] = data.messages.map((msg: any) => {
                const convertedMsg = {
                  id: msg.id,
                  conversationId: conversationId as string,
                  content: msg.content,
                  sender: {
                    id: msg.type === 'customer' ? 'customer' : msg.type === 'agent' ? user?.id || 'agent' : 'system',
                    name: msg.type === 'agent' ? msg.sender : msg.type === 'customer' ? 'Customer' : msg.sender,
                    type: msg.type as 'customer' | 'agent' | 'system'
                  },
                  timestamp: msg.timestamp,
                  read: false,
                  messageType: msg.messageType
                }
                console.log('Converting message in handleSendMessage:', msg, 'to:', convertedMsg)
                return convertedMsg
              })
              
              setMessages(convertedMessages)
              
              // Auto-scroll to bottom
              setTimeout(() => {
                messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
              }, 100)
            }
          } catch (error) {
            console.error('Error reloading messages:', error)
          }
        }
        loadMessagesFromAPI()
      } else {
        console.error('Failed to send message')
        // Restore the message input on failure
        setMessageInput(message)
      }
    } catch (error) {
      console.error('Error sending message:', error)
      // Restore the message input on failure
      setMessageInput(message)
    }
  }

  const handleEndConversation = async () => {
    if (!conversationId) return

    if (confirm('Are you sure you want to end this conversation?')) {
      try {
        await realtimeChatService.endConversation(conversationId as string)
        router.push('/dashboard/conversations')
      } catch (error) {
        console.error('Error ending conversation:', error)
      }
    }
  }

  const handleTyping = () => {
    if (!user || !conversationId) return

    // Send typing start
    sendTypingStatus(true)

    // Clear existing timeout
    if (typingTimeout) {
      clearTimeout(typingTimeout)
    }

    // Set new timeout to stop typing after 2 seconds of inactivity
    const timeout = setTimeout(() => {
      sendTypingStatus(false)
    }, 2000)
    setTypingTimeout(timeout)
  }

  const sendTypingStatus = async (isTyping: boolean) => {
    if (!user || !conversationId) return

    const wasTyping = isTyping
    setIsTyping(isTyping)

    try {
      await fetch('/api/typing-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          conversationId: conversationId,
          userId: user.id,
          userType: 'agent',
          userName: user.name || 'Support Agent',
          isTyping: isTyping
        })
      })
    } catch (error) {
      console.error('Error sending typing status:', error)
    }
  }

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  }

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'connected':
        return 'bg-green-100 text-green-800'
      case 'waiting':
        return 'bg-yellow-100 text-yellow-800'
      case 'ended':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-blue-100 text-blue-800'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!conversation) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Conversation not found</h2>
          <p className="text-gray-600 mb-4">This conversation may have been deleted or doesn't exist.</p>
          <Link 
            href="/dashboard/conversations"
            className="text-blue-600 hover:text-blue-500"
          >
            Back to conversations
          </Link>
        </div>
      </div>
    )
  }

  const isAgentConnected = conversation.status === 'connected' && conversation.assignedAgent === user?.id
  const isWaitingForAgent = conversation.status === 'waiting' && !conversation.assignedAgent

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link 
              href="/dashboard/conversations"
              className="text-gray-500 hover:text-gray-700"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            
            <div className="flex items-center space-x-3">
              <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                <User className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-gray-900">
                  {conversation.customerName}
                </h1>
                <p className="text-sm text-gray-500">{conversation.customerEmail}</p>
              </div>
            </div>

            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(conversation.status)}`}>
              {conversation.status}
            </span>
          </div>

          <div className="flex items-center space-x-3">
            {conversation.status !== 'ended' && (
              <>
                <button className="p-2 text-gray-500 hover:text-gray-700 rounded-lg">
                  <Phone className="h-5 w-5" />
                </button>
                <button className="p-2 text-gray-500 hover:text-gray-700 rounded-lg">
                  <Video className="h-5 w-5" />
                </button>
                <button 
                  onClick={handleEndConversation}
                  className="px-3 py-1 text-sm text-red-600 hover:text-red-700 border border-red-300 rounded-lg"
                >
                  End Conversation
                </button>
              </>
            )}
            <button className="p-2 text-gray-500 hover:text-gray-700 rounded-lg">
              <MoreVertical className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Connection Banner */}
      {isWaitingForAgent && (
        <div className="bg-yellow-50 border-b border-yellow-200 px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Clock className="h-5 w-5 text-yellow-600 mr-2" />
              <span className="text-sm font-medium text-yellow-800">
                Customer is waiting for an agent to join
              </span>
            </div>
            <button
              onClick={handleConnectAsAgent}
              disabled={connecting}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {connecting ? 'Connecting...' : 'Join Conversation'}
            </button>
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.sender.type === 'customer' ? 'justify-start' : 'justify-end'}`}
          >
            <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
              message.sender.type === 'customer'
                ? 'bg-white border border-gray-200'
                : message.sender.type === 'agent'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 border border-gray-200'
            }`}>
              <div className="flex items-center justify-between mb-1">
                <span className={`text-xs font-medium ${
                  message.sender.type === 'agent' ? 'text-blue-100' : 'text-gray-600'
                }`}>
                  {message.sender.name}
                </span>
                <span className={`text-xs ${
                  message.sender.type === 'agent' ? 'text-blue-100' : 'text-gray-500'
                }`}>
                  {formatTimestamp(message.timestamp)}
                </span>
              </div>
              
              {message.messageType === 'system' ? (
                <p className={`text-sm italic ${
                  message.sender.type === 'agent' ? 'text-blue-100' : 'text-gray-600'
                }`}>
                  {message.content}
                </p>
              ) : (
                <p className="text-sm">{message.content}</p>
              )}
            </div>
          </div>
        ))}
        
        {/* Customer typing indicator */}
        {customerTyping && (
          <div className="flex justify-start">
            <div className="bg-white border border-gray-200 px-4 py-2 rounded-lg max-w-xs">
              <div className="flex items-center space-x-2">
                <span className="text-xs text-gray-600">Customer is typing</span>
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      {isAgentConnected && conversation.status !== 'ended' && (
        <div className="bg-white border-t border-gray-200 px-6 py-4">
          <div className="flex items-center space-x-3">
            <input
              type="text"
              value={messageInput}
              onChange={(e) => {
                setMessageInput(e.target.value)
                handleTyping()
              }}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="Type your message..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <button
              onClick={handleSendMessage}
              disabled={!messageInput.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}

      {/* Not Connected Message */}
      {!isAgentConnected && !isWaitingForAgent && conversation.status !== 'ended' && (
        <div className="bg-gray-50 border-t border-gray-200 px-6 py-4">
          <p className="text-center text-gray-600">
            {conversation.assignedAgent && conversation.assignedAgent !== user?.id
              ? `This conversation is handled by ${conversation.agentName || 'another agent'}`
              : 'You are not connected to this conversation'
            }
          </p>
        </div>
      )}
    </div>
  )
} 