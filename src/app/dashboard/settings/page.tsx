'use client'

import { useAuth } from '@/contexts/AuthContext'
import { Settings, User, Bell, Shield, Palette, Code, Globe } from 'lucide-react'
import Link from 'next/link'

export default function SettingsPage() {
  const { user } = useAuth()

  const settingsCategories = [
    {
      title: 'Account Settings',
      description: 'Manage your account information and preferences',
      icon: User,
      href: '/dashboard/settings/account',
      color: 'bg-blue-100 text-blue-600'
    },
    {
      title: 'Widget Settings',
      description: 'Customize your chat widget appearance and behavior',
      icon: Palette,
      href: '/dashboard/settings/widget',
      color: 'bg-purple-100 text-purple-600'
    },
    {
      title: 'Notifications',
      description: 'Configure email and in-app notification preferences',
      icon: Bell,
      href: '/dashboard/settings/notifications',
      color: 'bg-yellow-100 text-yellow-600'
    },
    {
      title: 'Security',
      description: 'Manage password, 2FA, and security settings',
      icon: Shield,
      href: '/dashboard/settings/security',
      color: 'bg-green-100 text-green-600'
    },
    {
      title: 'API & Integrations',
      description: 'Manage API keys and third-party integrations',
      icon: Code,
      href: '/dashboard/settings/api',
      color: 'bg-indigo-100 text-indigo-600'
    },
    {
      title: 'Business Settings',
      description: 'Configure business information and team settings',
      icon: Globe,
      href: '/dashboard/settings/business',
      color: 'bg-pink-100 text-pink-600'
    }
  ]

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center space-x-3 mb-2">
          <Settings className="h-8 w-8 text-gray-600" />
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        </div>
        <p className="text-gray-600">
          Manage your account, customize your chat widget, and configure your platform
        </p>
      </div>

      {/* Settings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {settingsCategories.map((category) => (
          <Link
            key={category.title}
            href={category.href}
            className="block p-6 bg-white rounded-lg border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all duration-200 group"
          >
            <div className="flex items-start space-x-4">
              <div className={`p-3 rounded-lg ${category.color} group-hover:scale-110 transition-transform duration-200`}>
                <category.icon className="h-6 w-6" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                  {category.title}
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  {category.description}
                </p>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="mt-12">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="font-medium text-blue-900 mb-2">Widget Integration</h3>
            <p className="text-sm text-blue-700 mb-3">
              Get your widget code to embed on your website
            </p>
            <Link
              href="/dashboard/settings/widget"
              className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-500"
            >
              Get Widget Code →
            </Link>
          </div>
          
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <h3 className="font-medium text-green-900 mb-2">Business Profile</h3>
            <p className="text-sm text-green-700 mb-3">
              Complete your business profile for better service
            </p>
            <Link
              href="/dashboard/settings/business"
              className="inline-flex items-center text-sm font-medium text-green-600 hover:text-green-500"
            >
              Update Profile →
            </Link>
          </div>
        </div>
      </div>

      {/* Account Info */}
      <div className="mt-8 p-4 bg-gray-50 rounded-lg">
        <h3 className="text-sm font-medium text-gray-900 mb-2">Current Account</h3>
        <div className="flex items-center space-x-3">
          <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
            <span className="text-blue-600 font-medium text-sm">
              {user?.name?.charAt(0) || '?'}
            </span>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">{user?.name || 'User'}</p>
            <p className="text-sm text-gray-500">{user?.email}</p>
          </div>
          <div className="ml-auto">
            <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
              user?.role === 'admin' 
                ? 'bg-green-100 text-green-800' 
                : 'bg-blue-100 text-blue-800'
            }`}>
              {user?.role || 'User'}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
} 