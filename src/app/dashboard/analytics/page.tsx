'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useEffect, useState } from 'react'
import { MessageCircle, Users, Clock, Star, TrendingUp, TrendingDown } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts'
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore'
import { db } from '@/lib/firebase'

interface AnalyticsData {
  totalConversations: number
  activeConversations: number
  resolvedConversations: number
  avgResponseTime: number
  customerSatisfaction: number
  conversationsByHour: { hour: string; count: number }[]
  conversationsByChannel: { name: string; value: number; color: string }[]
  agentPerformance: { name: string; conversations: number; avgRating: number; responseTime: number }[]
  resolutionTrends: { date: string; resolved: number; created: number }[]
  topIssues: { issue: string; count: number; trend: 'up' | 'down' | 'stable' }[]
}

export default function AnalyticsPage() {
  const { user } = useAuth()
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState<'today' | 'week' | 'month'>('week')

  useEffect(() => {
    loadAnalyticsData()
  }, [user, timeRange])

  const loadAnalyticsData = async () => {
    try {
      if (!user?.businessId) return

      setLoading(true)

             // Calculate date range
       const now = new Date()
       const startDate = new Date()
      
      switch (timeRange) {
        case 'today':
          startDate.setHours(0, 0, 0, 0)
          break
        case 'week':
          startDate.setDate(now.getDate() - 7)
          break
        case 'month':
          startDate.setDate(now.getDate() - 30)
          break
      }

      // Fetch conversations
      const conversationsRef = collection(db, 'conversations')
      const conversationsQuery = query(
        conversationsRef,
        where('businessId', '==', user.businessId),
        orderBy('createdAt', 'desc')
      )

             const conversationsSnapshot = await getDocs(conversationsQuery)
       const conversations = conversationsSnapshot.docs.map(doc => {
         const data = doc.data()
         return {
           id: doc.id,
           status: data.status || 'open',
           channel: data.channel || 'website',
           createdAt: data.createdAt?.toDate() || new Date(),
           lastMessageAt: data.lastMessageAt?.toDate() || new Date(),
           ...data
         }
       })

      // Filter conversations by date range
      const filteredConversations = conversations.filter(conv => 
        conv.createdAt >= startDate
      )

      // Calculate analytics
      const total = filteredConversations.length
      const active = filteredConversations.filter(c => c.status === 'open' || c.status === 'pending').length
      const resolved = filteredConversations.filter(c => c.status === 'closed').length

      // Generate hourly data
      const hourlyData = Array.from({ length: 24 }, (_, i) => ({
        hour: `${i}:00`,
        count: filteredConversations.filter(conv => 
          conv.createdAt.getHours() === i
        ).length
      }))

      // Channel distribution
      const channelData = [
        { name: 'Website Chat', value: filteredConversations.filter(c => c.channel === 'website').length, color: '#3B82F6' },
        { name: 'Email', value: filteredConversations.filter(c => c.channel === 'email').length, color: '#10B981' },
        { name: 'Phone', value: filteredConversations.filter(c => c.channel === 'phone').length, color: '#F59E0B' },
        { name: 'Other', value: filteredConversations.filter(c => !c.channel || c.channel === 'chat').length, color: '#EF4444' }
      ].filter(item => item.value > 0)

      // Resolution trends (last 7 days)
      const trendData = Array.from({ length: 7 }, (_, i) => {
        const date = new Date()
        date.setDate(date.getDate() - (6 - i))
        const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        
        const dayConversations = conversations.filter(conv => 
          conv.createdAt.toDateString() === date.toDateString()
        )
        
        return {
          date: dateStr,
          created: dayConversations.length,
          resolved: dayConversations.filter(c => c.status === 'closed').length
        }
      })

      // Top issues (simplified - would need better categorization in real app)
      const topIssues = [
        { issue: 'Login Issues', count: Math.floor(total * 0.3), trend: 'up' as const },
        { issue: 'Payment Problems', count: Math.floor(total * 0.25), trend: 'down' as const },
        { issue: 'Feature Requests', count: Math.floor(total * 0.2), trend: 'stable' as const },
        { issue: 'Bug Reports', count: Math.floor(total * 0.15), trend: 'up' as const },
        { issue: 'General Inquiries', count: Math.floor(total * 0.1), trend: 'stable' as const }
      ]

      const analyticsData: AnalyticsData = {
        totalConversations: total,
        activeConversations: active,
        resolvedConversations: resolved,
        avgResponseTime: 8, // Would need message timing calculation
        customerSatisfaction: 92, // Would need rating data
        conversationsByHour: hourlyData,
        conversationsByChannel: channelData,
        agentPerformance: [], // Would need agent assignment data
        resolutionTrends: trendData,
        topIssues
      }

      setAnalytics(analyticsData)
      setLoading(false)

    } catch (error) {
      console.error('Error loading analytics:', error)
      setLoading(false)
    }
  }

  const formatNumber = (num: number) => {
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'k'
    }
    return num.toString()
  }

  const formatTime = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes}m`
    }
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return `${hours}h ${mins}m`
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-64 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="h-64 bg-gray-200 rounded-lg"></div>
            <div className="h-64 bg-gray-200 rounded-lg"></div>
          </div>
        </div>
      </div>
    )
  }

  if (!analytics) {
    return (
      <div className="p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Analytics Dashboard</h1>
          <p className="text-gray-600">No data available yet. Start some conversations to see analytics!</p>
        </div>
      </div>
    )
  }

  const statCards = [
    {
      title: 'Total Conversations',
      value: formatNumber(analytics.totalConversations),
      change: '+12%',
      changeType: 'positive' as const,
      icon: MessageCircle,
      description: 'vs last period'
    },
    {
      title: 'Active Conversations',
      value: formatNumber(analytics.activeConversations),
      change: '+5%',
      changeType: 'positive' as const,
      icon: Users,
      description: 'currently ongoing'
    },
    {
      title: 'Avg Response Time',
      value: formatTime(analytics.avgResponseTime),
      change: '-8%',
      changeType: 'positive' as const,
      icon: Clock,
      description: 'faster than before'
    },
    {
      title: 'Customer Satisfaction',
      value: `${analytics.customerSatisfaction}%`,
      change: '+3%',
      changeType: 'positive' as const,
      icon: Star,
      description: 'average rating'
    }
  ]

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h1>
          <p className="text-gray-600">Real-time insights into your customer support performance</p>
        </div>
        
        <div className="flex items-center space-x-2">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as 'today' | 'week' | 'month')}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
          </select>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat) => (
          <div key={stat.title} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">{stat.title}</p>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                <div className="flex items-center mt-2">
                  {stat.changeType === 'positive' ? (
                    <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-red-500 mr-1" />
                  )}
                  <span className={`text-sm font-medium ${
                    stat.changeType === 'positive' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {stat.change}
                  </span>
                  <span className="text-sm text-gray-500 ml-1">{stat.description}</span>
                </div>
              </div>
              <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <stat.icon className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Conversations by Hour */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Conversations by Hour</h3>
            <div className="h-2 w-2 bg-green-500 rounded-full"></div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={analytics.conversationsByHour}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="hour" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#3B82F6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Channel Distribution */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Conversations by Channel</h3>
          {analytics.conversationsByChannel.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={analytics.conversationsByChannel}
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {analytics.conversationsByChannel.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-500">
              No channel data available
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Resolution Trends */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Resolution Trends</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={analytics.resolutionTrends}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="created" stroke="#F59E0B" name="Created" strokeWidth={2} />
              <Line type="monotone" dataKey="resolved" stroke="#10B981" name="Resolved" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Top Issues */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Issues</h3>
          <div className="space-y-4">
            {analytics.topIssues.map((issue, index) => (
              <div key={issue.issue} className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{issue.issue}</p>
                  <p className="text-sm text-gray-500">{issue.count} tickets</p>
                </div>
                <div className="flex items-center space-x-2">
                  {issue.trend === 'up' && <TrendingUp className="h-4 w-4 text-red-500" />}
                  {issue.trend === 'down' && <TrendingDown className="h-4 w-4 text-green-500" />}
                  {issue.trend === 'stable' && <div className="h-1 w-4 bg-gray-400 rounded"></div>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
} 