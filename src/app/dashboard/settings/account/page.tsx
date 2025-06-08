'use client'

import { useAuth } from '@/contexts/AuthContext'
import { User, Mail, Key, Shield } from 'lucide-react'

export default function AccountSettingsPage() {
  const { user } = useAuth()

  return (
    <div className="p-6 max-w-4xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center space-x-3 mb-2">
          <User className="h-8 w-8 text-gray-600" />
          <h1 className="text-2xl font-bold text-gray-900">Account Settings</h1>
        </div>
        <p className="text-gray-600">
          Manage your account information and preferences
        </p>
      </div>

      {/* Current Account Info */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Current Account</h3>
        <div className="flex items-center space-x-4 mb-6">
          <div className="h-16 w-16 bg-blue-100 rounded-full flex items-center justify-center">
            <span className="text-blue-600 font-medium text-xl">
              {user?.name?.charAt(0) || '?'}
            </span>
          </div>
          <div>
            <h4 className="text-lg font-medium text-gray-900">{user?.name || 'User'}</h4>
            <p className="text-gray-500">{user?.email}</p>
            <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full mt-1 ${
              user?.role === 'admin' 
                ? 'bg-green-100 text-green-800' 
                : 'bg-blue-100 text-blue-800'
            }`}>
              {user?.role || 'User'}
            </span>
          </div>
        </div>
      </div>

      {/* Coming Soon Notice */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <div className="flex items-start space-x-3">
          <Shield className="h-6 w-6 text-blue-600 mt-1" />
          <div>
            <h3 className="text-lg font-semibold text-blue-900 mb-2">Account Management Coming Soon</h3>
            <p className="text-blue-700 mb-4">
              Advanced account settings including profile editing, password changes, and team management are currently under development.
            </p>
            <div className="space-y-2 text-sm text-blue-600">
              <div className="flex items-center space-x-2">
                <Mail className="h-4 w-4" />
                <span>Email preferences</span>
              </div>
              <div className="flex items-center space-x-2">
                <Key className="h-4 w-4" />
                <span>Password management</span>
              </div>
              <div className="flex items-center space-x-2">
                <User className="h-4 w-4" />
                <span>Profile customization</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 