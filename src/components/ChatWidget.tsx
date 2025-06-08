'use client'

import { useState, useEffect, useRef } from 'react'
import { MessageCircle, Send, X, Minimize2, Bot, User, AlertCircle } from 'lucide-react'
import { cn, formatRelativeTime } from '@/lib/utils'
import { generateAIResponse, shouldTransferToHuman, detectUrgency } from '@/lib/gemini'

interface Message {
  id: string
  content: string
  type: 'text'
  sender: {
    id: string
    name: string
    type: 'customer' | 'agent' | 'ai'
  }
  createdAt: Date
  confidence?: number
  suggestedActions?: string[]
}

interface ChatWidgetProps {
  businessId: string
  config?: {
    primaryColor?: string
    accentColor?: string
    welcomeMessage?: string
    position?: 'bottom-right' | 'bottom-left'
    enabled?: boolean
    aiEnabled?: boolean
  }
}

export default function ChatWidget({ 
  businessId: _businessId,
  config = {
    primaryColor: '#2563eb',
    accentColor: '#3b82f6',
    welcomeMessage: 'Hi! How can we help you today?',
    position: 'bottom-right',
    enabled: true,
    aiEnabled: true
  }
}: ChatWidgetProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [customerInfo, setCustomerInfo] = useState({ name: '', email: '' })
  const [showContactForm, setShowContactForm] = useState(true)
  const [_conversationId] = useState<string | null>(null)
  const [needsHumanAgent, setNeedsHumanAgent] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages.length])

  useEffect(() => {
    if (isOpen && messages.length === 0 && config.welcomeMessage) {
      // Add welcome message
      const welcomeMsg: Message = {
        id: 'welcome',
        content: config.welcomeMessage,
        type: 'text',
        sender: {
          id: 'system',
          name: 'Support Assistant',
          type: 'ai'
        },
        createdAt: new Date(),
        confidence: 1.0
      }
      setMessages([welcomeMsg])
    }
  }, [isOpen, config.welcomeMessage])

  const handleStartConversation = (e: React.FormEvent) => {
    e.preventDefault()
    if (!customerInfo.name || !customerInfo.email) return

    setShowContactForm(false)
    // In a real app, this would create a conversation in Firebase
    
    // Add a personalized greeting
    const greetingMsg: Message = {
      id: `greeting_${Date.now()}`,
      content: `Hi ${customerInfo.name}! I'm your AI support assistant. I'm here to help you with any questions or issues you might have. What can I assist you with today?`,
      type: 'text',
      sender: {
        id: 'ai',
        name: 'Support Assistant',
        type: 'ai'
      },
      createdAt: new Date(),
      confidence: 1.0
    }
    setMessages(prev => [...prev, greetingMsg])
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim()) return

    const userMessage: Message = {
      id: `msg_${Date.now()}`,
      content: newMessage,
      type: 'text',
      sender: {
        id: 'customer',
        name: customerInfo.name,
        type: 'customer'
      },
      createdAt: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    const currentMessage = newMessage
    setNewMessage('')
    setIsTyping(true)

    // Check if user wants to talk to human agent
    if (shouldTransferToHuman(currentMessage)) {
      setNeedsHumanAgent(true)
      setIsTyping(false)
      
      const transferMsg: Message = {
        id: `transfer_${Date.now()}`,
        content: `I understand you'd like to speak with a human agent. Let me connect you with someone from our team who can provide more personalized assistance. Please hold on for a moment.`,
        type: 'text',
        sender: {
          id: 'ai',
          name: 'Support Assistant',
          type: 'ai'
        },
        createdAt: new Date(),
        confidence: 1.0,
        suggestedActions: ['Wait for agent', 'Continue with AI', 'Leave message']
      }
      setMessages(prev => [...prev, transferMsg])
      return
    }

    // Detect urgency
    const urgency = detectUrgency(currentMessage)
    
    try {
      // Get previous messages for context
      const previousMessages = messages
        .filter(msg => msg.sender.type !== 'ai')
        .map(msg => msg.content)
        .slice(-3) // Last 3 messages for context

      // Generate AI response using Gemini
      const aiResponse = await generateAIResponse(currentMessage, {
        customerName: customerInfo.name,
        previousMessages,
        businessType: 'Customer Support Platform'
      })

      const aiMessage: Message = {
        id: `ai_${Date.now()}`,
        content: aiResponse.message,
        type: 'text',
        sender: {
          id: 'ai',
          name: 'Support Assistant',
          type: 'ai'
        },
        createdAt: new Date(),
        confidence: aiResponse.confidence,
        suggestedActions: aiResponse.suggestedActions
      }

      setMessages(prev => [...prev, aiMessage])

      // If confidence is low or urgency is high, suggest human agent
      if (aiResponse.confidence < 0.6 || urgency === 'high') {
        setTimeout(() => {
          const suggestionMsg: Message = {
            id: `suggestion_${Date.now()}`,
            content: `${urgency === 'high' ? 'I notice this seems urgent. ' : 'I want to make sure you get the best help possible. '}Would you like me to connect you with a human agent who might be able to provide more specific assistance?`,
            type: 'text',
            sender: {
              id: 'ai',
              name: 'Support Assistant',
              type: 'ai'
            },
            createdAt: new Date(),
            confidence: 1.0,
            suggestedActions: ['Connect with agent', 'Continue with AI', 'Get more info']
          }
          setMessages(prev => [...prev, suggestionMsg])
        }, 1000)
      }

    } catch (error) {
      console.error('Error getting AI response:', error)
      
      // Fallback response
      const fallbackMsg: Message = {
        id: `fallback_${Date.now()}`,
        content: `I'm sorry, I'm having trouble processing your request right now. Let me connect you with a human agent who can better assist you.`,
        type: 'text',
        sender: {
          id: 'ai',
          name: 'Support Assistant',
          type: 'ai'
        },
        createdAt: new Date(),
        confidence: 0.5,
        suggestedActions: ['Connect with agent', 'Try again', 'Leave message']
      }
      setMessages(prev => [...prev, fallbackMsg])
      setNeedsHumanAgent(true)
    } finally {
      setIsTyping(false)
    }
  }

  const handleSuggestedAction = (action: string) => {
    if (action.toLowerCase().includes('agent') || action.toLowerCase().includes('human')) {
      setNeedsHumanAgent(true)
      const transferMsg: Message = {
        id: `action_${Date.now()}`,
        content: `I'm connecting you with a human agent now. Someone from our team will be with you shortly!`,
        type: 'text',
        sender: {
          id: 'ai',
          name: 'Support Assistant',
          type: 'ai'
        },
        createdAt: new Date(),
        confidence: 1.0
      }
      setMessages(prev => [...prev, transferMsg])
    } else {
      // Handle other suggested actions
      setNewMessage(`I'd like to: ${action}`)
    }
  }

  if (!config.enabled) return null

  const positionClasses = config.position === 'bottom-left' 
    ? 'bottom-6 left-6' 
    : 'bottom-6 right-6'

  return (
    <div className={`fixed ${positionClasses} z-50`}>
      {/* Chat Widget */}
      {isOpen && (
        <div className={`mb-4 bg-white rounded-lg shadow-lg border transition-all duration-300 ${
          isMinimized ? 'w-80 h-16' : 'w-80 h-96'
        }`}>
          {/* Header */}
          <div 
            className="flex items-center justify-between p-4 rounded-t-lg text-white"
            style={{ backgroundColor: config.primaryColor }}
          >
            <div className="flex items-center space-x-2">
              <MessageCircle className="h-5 w-5" />
              <span className="font-medium">
                {needsHumanAgent ? 'Connecting to Agent...' : 'AI Support Chat'}
              </span>
              {needsHumanAgent && (
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-white rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              )}
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setIsMinimized(!isMinimized)}
                className="text-white hover:text-gray-200"
              >
                <Minimize2 className="h-4 w-4" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="text-white hover:text-gray-200"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Content */}
          {!isMinimized && (
            <div className="flex flex-col h-80">
              {showContactForm ? (
                /* Contact Form */
                <div className="p-4 flex-1">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">
                    Start a conversation
                  </h3>
                  <form onSubmit={handleStartConversation} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Name
                      </label>
                      <input
                        type="text"
                        value={customerInfo.name}
                        onChange={(e) => setCustomerInfo(prev => ({ ...prev, name: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Your name"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Email
                      </label>
                      <input
                        type="email"
                        value={customerInfo.email}
                        onChange={(e) => setCustomerInfo(prev => ({ ...prev, email: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="your.email@example.com"
                        required
                      />
                    </div>
                    <button
                      type="submit"
                      className="w-full py-2 px-4 text-white rounded-md hover:opacity-90 transition-opacity"
                      style={{ backgroundColor: config.primaryColor }}
                    >
                      Start Chat
                    </button>
                  </form>
                </div>
              ) : (
                <>
                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {messages.map((message) => (
                      <div key={message.id}>
                        <div
                          className={cn(
                            "flex",
                            message.sender.type === 'customer' ? "justify-end" : "justify-start"
                          )}
                        >
                          <div
                            className={cn(
                              "max-w-xs lg:max-w-md px-3 py-2 rounded-lg",
                              message.sender.type === 'customer'
                                ? "text-white"
                                : "bg-gray-100 text-gray-900"
                            )}
                            style={message.sender.type === 'customer' 
                              ? { backgroundColor: config.primaryColor }
                              : {}
                            }
                          >
                            <div className="flex items-center space-x-2 mb-1">
                              {message.sender.type === 'ai' && <Bot className="h-3 w-3" />}
                              {message.sender.type === 'customer' && <User className="h-3 w-3" />}
                              <span className="text-xs opacity-75">
                                {message.sender.name}
                              </span>
                              {message.confidence && message.confidence < 0.7 && (
                                <AlertCircle className="h-3 w-3 text-yellow-500" />
                              )}
                            </div>
                            <p className="text-sm">{message.content}</p>
                            <p className="text-xs opacity-75 mt-1">
                              {formatRelativeTime(message.createdAt)}
                            </p>
                          </div>
                        </div>
                        
                        {/* Suggested Actions */}
                        {message.suggestedActions && message.suggestedActions.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-2 justify-start">
                            {message.suggestedActions.map((action, index) => (
                              <button
                                key={index}
                                onClick={() => handleSuggestedAction(action)}
                                className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-full hover:bg-blue-100 transition-colors"
                              >
                                {action}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                    
                    {isTyping && (
                      <div className="flex justify-start">
                        <div className="bg-gray-100 text-gray-900 max-w-xs lg:max-w-md px-3 py-2 rounded-lg">
                          <div className="flex items-center space-x-2">
                            <Bot className="h-3 w-3" />
                            <span className="text-xs">Support Assistant</span>
                          </div>
                          <div className="flex space-x-1 mt-2">
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                          </div>
                        </div>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Message Input */}
                  <div className="border-t p-4">
                    <form onSubmit={handleSendMessage} className="flex space-x-2">
                      <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Type your message..."
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        disabled={needsHumanAgent}
                      />
                      <button
                        type="submit"
                        disabled={!newMessage.trim() || needsHumanAgent}
                        className="p-2 text-white rounded-md hover:opacity-90 transition-opacity disabled:opacity-50"
                        style={{ backgroundColor: config.primaryColor }}
                      >
                        <Send className="h-4 w-4" />
                      </button>
                    </form>
                    {needsHumanAgent && (
                      <p className="text-xs text-gray-500 mt-2 text-center">
                        Waiting for a human agent to join the conversation...
                      </p>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-14 h-14 rounded-full text-white shadow-lg hover:scale-105 transition-transform flex items-center justify-center relative"
        style={{ backgroundColor: config.primaryColor }}
      >
        {isOpen ? (
          <X className="h-6 w-6" />
        ) : (
          <>
            <MessageCircle className="h-6 w-6" />
            {needsHumanAgent && (
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></div>
            )}
          </>
        )}
      </button>
    </div>
  )
} 