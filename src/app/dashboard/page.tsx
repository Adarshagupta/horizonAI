'use client'

import { useAuth } from '@/contexts/AuthContext'
import { MessageCircle, Users, Clock, TrendingUp, Settings } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { collection, query, where, orderBy, limit, onSnapshot, getDocs } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import AgentStatusToggle from '@/components/AgentStatusToggle'

interface Stats {
  totalConversations: number
  activeCustomers: number
  avgResponseTime: number
  resolutionRate: number
}

interface RecentConversation {
  id: string
  customer: string
  email: string
  subject: string
  status: string
  lastMessage: string
  priority: string
}

export default function Dashboard() {
  const { user } = useAuth()
  const [stats, setStats] = useState<Stats>({
    totalConversations: 0,
    activeCustomers: 0,
    avgResponseTime: 0,
    resolutionRate: 0
  })
  const [recentConversations, setRecentConversations] = useState<RecentConversation[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    
    // If user doesn't have a businessId, set it to their user ID as fallback
    const businessId = user.businessId || user.id
    console.log('Dashboard businessId:', businessId, 'User:', user)
    
    const loadDashboardData = async () => {
      try {
        // Load conversations for stats
        const conversationsRef = collection(db, 'conversations')
        const conversationsQuery = query(
          conversationsRef,
          where('businessId', '==', businessId),
          orderBy('lastMessageAt', 'desc')
        )

        const unsubscribe = onSnapshot(conversationsQuery, (snapshot) => {
          const conversations = snapshot.docs.map(doc => {
            const data = doc.data()
            return {
              id: doc.id,
              customerName: data.customerName || '',
              customerEmail: data.customerEmail || '',
              subject: data.subject || '',
              status: data.status || 'open',
              lastMessage: data.lastMessage || '',
              priority: data.priority || 'medium',
              ...data
            }
          })

          // Calculate stats
          const total = conversations.length
          const active = conversations.filter(c => c.status === 'open' || c.status === 'pending').length
          const closed = conversations.filter(c => c.status === 'closed').length
          
          // Calculate unique customers
          const uniqueCustomers = new Set(conversations.map(c => c.customerEmail)).size

          setStats({
            totalConversations: total,
            activeCustomers: uniqueCustomers,
            avgResponseTime: 2.4, // This would need more complex calculation
            resolutionRate: total > 0 ? Math.round((closed / total) * 100) : 0
          })

          // Set recent conversations
          setRecentConversations(
            conversations.slice(0, 5).map(conv => ({
              id: conv.id,
              customer: conv.customerName || 'Unknown',
              email: conv.customerEmail || '',
              subject: conv.subject || 'No subject',
              status: conv.status || 'open',
              lastMessage: conv.lastMessage || 'No messages',
              priority: conv.priority || 'medium'
            }))
          )

          setLoading(false)
        })

        return () => unsubscribe()
      } catch (error) {
        console.error('Error loading dashboard data:', error)
        setLoading(false)
      }
    }

    loadDashboardData()
  }, [user])

  const quickActions = [
    {
      name: 'Start New Conversation',
      description: 'Manually create a new customer conversation',
      href: '/dashboard/conversations/new',
      icon: MessageCircle,
      color: 'bg-blue-600 hover:bg-blue-700',
    },
    {
      name: 'Widget Settings',
      description: 'Customize your chat widget appearance',
      href: '/dashboard/settings/widget',
      icon: Settings,
      color: 'bg-green-600 hover:bg-green-700',
    },
    {
      name: 'View Analytics',
      description: 'Check your support performance metrics',
      href: '/dashboard/analytics',
      icon: TrendingUp,
      color: 'bg-purple-600 hover:bg-purple-700',
    },
  ]

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open':
        return 'bg-red-100 text-red-800'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'closed':
        return 'bg-green-100 text-green-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800'
      case 'medium':
        return 'bg-yellow-100 text-yellow-800'
      case 'low':
        return 'bg-green-100 text-green-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const statsData = [
    {
      name: 'Total Conversations',
      value: stats.totalConversations.toString(),
      change: '+4.75%',
      changeType: 'positive' as const,
      icon: MessageCircle,
    },
    {
      name: 'Active Customers',
      value: stats.activeCustomers.toString(),
      change: '+54.02%',
      changeType: 'positive' as const,
      icon: Users,
    },
    {
      name: 'Avg Response Time',
      value: `${stats.avgResponseTime} min`,
      change: '-1.39%',
      changeType: 'positive' as const,
      icon: Clock,
    },
    {
      name: 'Resolution Rate',
      value: `${stats.resolutionRate}%`,
      change: '+2.02%',
      changeType: 'positive' as const,
      icon: TrendingUp,
    },
  ]

  if (loading || !user) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-64 mb-6"></div>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Welcome back, {user?.name}!
            </h1>
            <p className="text-gray-600">
              Here&apos;s what&apos;s happening with your customer support today.
            </p>
          </div>
          
          {/* Agent Status Toggle */}
          <div className="flex-shrink-0">
            <AgentStatusToggle className="justify-end" />
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        {statsData.map((item) => (
          <div key={item.name} className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <item.icon className="h-6 w-6 text-gray-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      {item.name}
                    </dt>
                    <dd className="flex items-baseline">
                      <div className="text-2xl font-semibold text-gray-900">
                        {item.value}
                      </div>
                      <div className={`ml-2 flex items-baseline text-sm font-semibold ${
                        item.changeType === 'positive' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {item.change}
                      </div>
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Conversations */}
        <div className="lg:col-span-2">
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">
                  Recent Conversations
                </h3>
                <Link
                  href="/dashboard/conversations"
                  className="text-sm text-blue-600 hover:text-blue-500"
                >
                  View all
                </Link>
              </div>
            </div>
            <div className="divide-y divide-gray-200">
              {recentConversations.length > 0 ? (
                recentConversations.map((conversation) => (
                  <div key={conversation.id} className="p-6 hover:bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-3">
                          <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                            <span className="text-blue-600 font-medium text-sm">
                              {conversation.customer.charAt(0)}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {conversation.customer}
                            </p>
                            <p className="text-sm text-gray-500 truncate">
                              {conversation.email}
                            </p>
                          </div>
                        </div>
                        <div className="mt-2">
                          <p className="text-sm text-gray-900 truncate">
                            {conversation.subject}
                          </p>
                          <p className="text-sm text-gray-500 truncate">
                            {conversation.lastMessage}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end space-y-1">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded ${getStatusColor(conversation.status)}`}>
                          {conversation.status}
                        </span>
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded ${getPriorityColor(conversation.priority)}`}>
                          {conversation.priority}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-6 text-center text-gray-500">
                  No conversations yet. Your customer conversations will appear here.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div>
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Quick Actions</h3>
            </div>
            <div className="p-6 space-y-4">
              {quickActions.map((action) => (
                <Link
                  key={action.name}
                  href={action.href}
                  className="block p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start space-x-3">
                    <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${action.color}`}>
                      <action.icon className="h-5 w-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">
                        {action.name}
                      </p>
                      <p className="text-sm text-gray-500">
                        {action.description}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Widget Integration Code */}
          <div className="mt-6 bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Widget Integration</h3>
            </div>
            <div className="p-6">
              <p className="text-sm text-gray-600 mb-4">
                Add this code to your website to enable the chat widget:
              </p>
              <div className="bg-gray-100 rounded-md p-3">
                <code className="text-xs text-gray-800">
{`<script>
  (function() {
    var script = document.createElement('script');
    script.src = '${typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'}/widget.js';
    script.setAttribute('data-business-id', '${user?.businessId || user?.id || 'your-business-id'}');
    document.head.appendChild(script);
  })();
</script>`}
                </code>
              </div>
              <Link
                href="/dashboard/settings/widget"
                className="inline-flex items-center mt-4 text-sm text-blue-600 hover:text-blue-500"
              >
                <Settings className="h-4 w-4 mr-1" />
                Customize Widget
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 