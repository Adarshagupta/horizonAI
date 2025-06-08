'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { rtdb } from '@/lib/firebase'
import { ref, onValue, off, push, set, serverTimestamp, update, query, orderByChild } from 'firebase/database'
import { doc, updateDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { MessageCircle, Clock, User, AlertCircle, Send, Phone, Video, MoreHorizontal, Search, Filter } from 'lucide-react'
import AgentStatusToggle from '@/components/AgentStatusToggle'

interface Message {
  id: string
  content: string
  messageType: 'text' | 'notification' | 'system'
  sender: {
    id: string
    name: string
    type: 'customer' | 'agent' | 'ai'
  }
  timestamp: number
  read: boolean
}

interface Conversation {
  id: string
  customerName: string
  customerEmail: string
  customerId: string
  businessId: string
  status: 'waiting' | 'connected' | 'ended'
  priority: 'low' | 'medium' | 'high'
  assignedAgent?: string
  agentName?: string
  startedAt: number
  lastActivity: number
  unreadCount: number
  messages?: { [key: string]: Message }
}

export default function ConversationsPage() {
  const { user } = useAuth()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null)
  const [selectedMessages, setSelectedMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [filter, setFilter] = useState<'all' | 'waiting' | 'connected' | 'ended'>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)

  // Function to update user's business ID
  const updateUserBusinessId = async (newBusinessId: string) => {
    if (!user) return false
    
    try {
      const userRef = doc(db, 'users', user.id)
      await updateDoc(userRef, {
        businessId: newBusinessId,
        updatedAt: new Date()
      })
      
      console.log('✅ Updated user business ID to:', newBusinessId)
      // Refresh the page to reload with new business ID
      window.location.reload()
      return true
    } catch (error) {
      console.error('❌ Error updating business ID:', error)
      return false
    }
  }

  // Expose updateUserBusinessId function globally for debugging
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).updateUserBusinessId = updateUserBusinessId
      console.log('🔧 Debug function available: window.updateUserBusinessId("YOUR_BUSINESS_ID")')
    }
  }, [user])

  // Real-time conversation updates from Firebase Realtime Database
  useEffect(() => {
    if (!user) return

    console.log('Setting up conversations listener for user:', user.id, 'businessId:', user.businessId || user.id)
    
    // Use API instead of direct Firebase access to avoid permission issues
    const fetchConversations = async () => {
      try {
        setLoading(true)
        const userBusinessId = user.businessId || user.id
        
        console.log('Fetching conversations via API for business ID:', userBusinessId)
        
        const response = await fetch(`/api/conversations/?businessId=${encodeURIComponent(userBusinessId)}`)
        
        if (response.ok) {
          const data = await response.json()
          console.log('✅ Conversations API response:', data)
          
          if (data.conversations && Array.isArray(data.conversations)) {
            const conversations: Conversation[] = data.conversations.map((conv: any) => ({
              id: conv.id,
              customerName: conv.customerName || 'Unknown Customer',
              customerEmail: conv.customerEmail || '',
              customerId: conv.customerId || '',
              businessId: conv.businessId,
              status: conv.status || 'waiting',
              priority: conv.priority || 'medium',
              assignedAgent: conv.assignedAgent,
              agentName: conv.agentName,
              startedAt: conv.startedAt || Date.now(),
              lastActivity: conv.lastActivity || Date.now(),
              unreadCount: conv.unreadCount || 0,
              messages: {}
            }))
            
            console.log(`✅ Loaded ${conversations.length} conversations from ${data.source}`)
            setConversations(conversations)
          } else {
            console.log('No conversations in API response')
            setConversations([])
          }
        } else {
          console.error('❌ Failed to fetch conversations:', response.status)
          setConversations([])
        }
        
      } catch (error) {
        console.error('Error fetching conversations via API:', error)
        setConversations([])
      } finally {
        setLoading(false)
      }
    }

    fetchConversations()

    // Set up periodic refresh every 30 seconds
    const interval = setInterval(fetchConversations, 30000)
    
    return () => {
      clearInterval(interval)
    }
  }, [user])

  // Real-time message updates for selected conversation
  useEffect(() => {
    if (!selectedConversation) {
      setSelectedMessages([])
      return
    }

    console.log('Setting up messages listener for conversation:', selectedConversation.id)
    
    const fetchMessages = async () => {
      try {
        const response = await fetch(`/api/conversation-status/${selectedConversation.id}/`)
        if (response.ok) {
          const data = await response.json()
          
          // Convert the messages from the API response
          const messages: Message[] = []
          if (data.messages && Array.isArray(data.messages)) {
            data.messages.forEach((msg: any, index: number) => {
              messages.push({
                id: `msg_${index}`,
                content: msg.content || msg.message || '',
                messageType: msg.type === 'customer' ? 'text' : 'text',
                sender: {
                  id: msg.type === 'customer' ? 'customer' : msg.type === 'agent' ? 'agent' : 'ai',
                  name: msg.type === 'customer' ? 'Customer' : msg.type === 'agent' ? msg.sender : 'AI Assistant',
                  type: msg.type === 'customer' ? 'customer' : msg.type === 'agent' ? 'agent' : 'ai'
                },
                timestamp: msg.timestamp || Date.now(),
                read: false
              })
            })
          }
          
          console.log('Messages fetched for conversation:', selectedConversation.id, messages.length, 'messages')
          setSelectedMessages(messages)
        } else {
          console.log('No messages found for conversation:', selectedConversation.id)
          setSelectedMessages([])
        }
      } catch (error) {
        console.error('Error fetching messages:', error)
        setSelectedMessages([])
      }
    }

    fetchMessages()
    
    // Set up periodic refresh every 10 seconds for messages
    const interval = setInterval(fetchMessages, 10000)
    
    return () => {
      clearInterval(interval)
    }
  }, [selectedConversation?.id])

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || !selectedConversation || !user) return

    try {
      // Add message via API call to agent-message endpoint
      const response = await fetch('/api/agent-message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          conversationId: selectedConversation.id,
          agentId: user.id,
          agentName: user.name || 'Support Agent',
          message: newMessage
        })
      })

      if (response.ok) {
        console.log('✅ Message sent successfully')
        
        // Add the agent message to local state immediately for better UX
        const tempMessage: Message = {
          id: `temp_agent_${Date.now()}`,
          content: newMessage,
          messageType: 'text',
          sender: {
            id: user.id || 'agent',
            name: user.name || 'Agent',
            type: 'agent'
          },
          timestamp: Date.now(),
          read: false
        }
        
        setSelectedMessages(prev => [...prev, tempMessage])
        setNewMessage('')
        
        // Update conversation status to connected
        if (selectedConversation.status !== 'connected') {
          await updateConversationStatus(selectedConversation.id, 'connected')
        }
      } else {
        console.error('❌ Failed to send message:', response.status)
        throw new Error('Failed to send message')
      }
      
    } catch (error) {
      console.error('Error sending message:', error)
      
      // Fallback: update local state anyway
      const tempMessage: Message = {
        id: `temp_${Date.now()}`,
        content: newMessage,
        messageType: 'text',
        sender: {
          id: user.id || 'agent',
          name: user.name || 'Agent',
          type: 'agent'
        },
        timestamp: Date.now(),
        read: false
      }
      
      setSelectedMessages(prev => [...prev, tempMessage])
      setNewMessage('')
    }
  }

  const updateConversationStatus = async (conversationId: string, status: 'waiting' | 'connected' | 'ended') => {
    try {
      console.log(`Updating conversation ${conversationId} status to: ${status}`)
      
      // Update local state immediately for better UX
      setConversations(prev => prev.map(conv => 
        conv.id === conversationId ? { ...conv, status, lastActivity: Date.now() } : conv
      ))
      if (selectedConversation?.id === conversationId) {
        setSelectedConversation(prev => prev ? { ...prev, status, lastActivity: Date.now() } : null)
      }
      
      // In a real implementation, you'd call an API to update the conversation status
      console.log('✅ Conversation status updated locally')
      
    } catch (error) {
      console.error('Error updating conversation status:', error)
    }
  }

  const filteredConversations = conversations.filter(conv => {
    const matchesFilter = filter === 'all' || conv.status === filter
    const matchesSearch = conv.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         conv.customerEmail.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesFilter && matchesSearch
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected': return 'bg-green-100 text-green-800 border-green-200'
      case 'waiting': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'ended': return 'bg-gray-100 text-gray-800 border-gray-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200'
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'low': return 'bg-green-100 text-green-800 border-green-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const formatTimestamp = (timestamp: number) => {
    if (!timestamp) return 'Unknown'
    
    const date = new Date(timestamp)
    const now = new Date()
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)
    
    if (diffInHours < 24) {
      return date.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      })
    } else {
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
      })
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-2xl font-bold text-gray-900">Conversations</h1>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-sm text-gray-600">
                {filteredConversations.length} active
              </span>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <AgentStatusToggle />
          </div>
        </div>
        
        {/* Debug Info - Show if no conversations found */}
        {!loading && conversations.length === 0 && (
          <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-start space-x-2">
              <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
              <div className="flex-1">
                <h3 className="text-sm font-medium text-yellow-800">No conversations found</h3>
                <div className="mt-2 text-sm text-yellow-700">
                  <p><strong>Your Business ID:</strong> <code className="bg-yellow-100 px-1 rounded">{user?.businessId || user?.id}</code></p>
                  <p className="mt-1">If you have existing conversations, they might be stored under a different business ID.</p>
                  <p className="mt-1">Check the browser console for detailed logging about conversation business IDs.</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Conversations List */}
        <div className="w-1/3 bg-white border-r border-gray-200 flex flex-col">
          {/* Search and Filter */}
          <div className="p-4 border-b border-gray-200">
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search conversations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <div className="flex space-x-1">
              {(['all', 'waiting', 'connected', 'ended'] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => setFilter(status)}
                  className={`px-3 py-1 text-sm rounded-md capitalize ${
                    filter === status
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>

          {/* Conversations List */}
          <div className="flex-1 overflow-y-auto">
            {filteredConversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                <MessageCircle className="w-12 h-12 mb-4" />
                <p className="text-center">
                  {conversations.length === 0 ? 'No conversations yet' : 'No conversations match your filters'}
                </p>
                <p className="text-sm text-center mt-2">
                  {conversations.length === 0 ? 'Conversations will appear here when customers start chatting' : 'Try adjusting your search or filters'}
                </p>
              </div>
            ) : (
              filteredConversations.map((conversation) => (
                <div
                  key={conversation.id}
                  onClick={() => setSelectedConversation(conversation)}
                  className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 ${
                    selectedConversation?.id === conversation.id ? 'bg-blue-50 border-blue-200' : ''
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <h3 className="text-sm font-medium text-gray-900 truncate">
                          {conversation.customerName}
                        </h3>
                        <span className={`px-2 py-1 text-xs rounded-full border ${getStatusColor(conversation.status)}`}>
                          {conversation.status}
                        </span>
                      </div>
                      
                      <p className="text-xs text-gray-500 mb-1">{conversation.customerEmail}</p>
                      
                      <div className="flex items-center justify-between">
                        <span className={`px-2 py-1 text-xs rounded-full border ${getPriorityColor(conversation.priority)}`}>
                          {conversation.priority}
                        </span>
                        <span className="text-xs text-gray-400">
                          {formatTimestamp(conversation.lastActivity)}
                        </span>
                      </div>
                    </div>
                    
                    {conversation.unreadCount > 0 && (
                      <div className="ml-2 bg-blue-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                        {conversation.unreadCount}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col">
          {selectedConversation ? (
            <>
              {/* Chat Header */}
              <div className="bg-white border-b border-gray-200 px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <User className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900">
                        {selectedConversation.customerName}
                      </h2>
                      <p className="text-sm text-gray-500">{selectedConversation.customerEmail}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => updateConversationStatus(selectedConversation.id, 'connected')}
                      className="px-3 py-1 text-sm bg-green-100 text-green-700 rounded-md hover:bg-green-200"
                    >
                      Connect
                    </button>
                    <button
                      onClick={() => updateConversationStatus(selectedConversation.id, 'ended')}
                      className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
                    >
                      End Chat
                    </button>
                    <button className="p-2 text-gray-400 hover:text-gray-600">
                      <MoreHorizontal className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {selectedMessages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${
                      message.sender.type === 'agent' ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    <div
                      className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                        message.sender.type === 'agent'
                          ? 'bg-blue-600 text-white'
                          : message.sender.type === 'ai'
                          ? 'bg-gray-100 text-gray-900'
                          : 'bg-gray-200 text-gray-900'
                      }`}
                    >
                      <p className="text-sm">{message.content}</p>
                      <p className={`text-xs mt-1 ${
                        message.sender.type === 'agent' ? 'text-blue-100' : 'text-gray-500'
                      }`}>
                        {message.sender.name} • {formatTimestamp(message.timestamp)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Message Input */}
              <div className="bg-white border-t border-gray-200 px-6 py-4">
                <form onSubmit={handleSendMessage} className="flex space-x-3">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type your message..."
                    className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <button
                    type="submit"
                    disabled={!newMessage.trim()}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center bg-gray-50">
              <div className="text-center">
                <MessageCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No conversation selected</h3>
                <p className="text-gray-500">Choose a conversation to start messaging</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

 