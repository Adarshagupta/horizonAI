'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Palette, Copy, Check, Eye, Code, Settings, Globe } from 'lucide-react'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'

interface WidgetSettings {
  primaryColor: string
  accentColor: string
  welcomeMessage: string
  position: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'
  enabled: boolean
  aiEnabled: boolean
  showAgentPhotos: boolean
  customCSS: string
}

export default function WidgetSettingsPage() {
  const { user } = useAuth()
  const [settings, setSettings] = useState<WidgetSettings>({
    primaryColor: '#2563eb',
    accentColor: '#3b82f6',
    welcomeMessage: 'Hi! How can we help you today?',
    position: 'bottom-right',
    enabled: true,
    aiEnabled: true,
    showAgentPhotos: true,
    customCSS: ''
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    loadWidgetSettings()
  }, [user])

  const loadWidgetSettings = async () => {
    if (!user) {
      setLoading(false)
      return
    }

    const businessId = user.businessId || user.id

    try {
      const settingsDoc = await getDoc(doc(db, 'businesses', businessId, 'settings', 'widget'))
      if (settingsDoc.exists()) {
        setSettings({ ...settings, ...settingsDoc.data() })
      }
    } catch (error) {
      console.error('Error loading widget settings:', error)
      // Continue with default settings if there's an error
    } finally {
      setLoading(false)
    }
  }

  const saveSettings = async () => {
    if (!user) return

    const businessId = user.businessId || user.id

    setSaving(true)
    try {
      await setDoc(doc(db, 'businesses', businessId, 'settings', 'widget'), settings)
      // Show success message - could add toast notification here
      console.log('Widget settings saved successfully')
    } catch (error) {
      console.error('Error saving widget settings:', error)
      // Could add error toast notification here
    } finally {
      setSaving(false)
    }
  }

  const generateWidgetCode = () => {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://horizon-ai-one.vercel.app'
    const businessId = user?.businessId || user?.id || 'YOUR_BUSINESS_ID'
    return `<!-- ChatSupport AI Widget -->
<script
  src="${baseUrl}/widget.js"
  data-business-id="${businessId}"
  data-api-url="${baseUrl}"
></script>`
  }

  const copyWidgetCode = async () => {
    try {
      await navigator.clipboard.writeText(generateWidgetCode())
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy:', error)
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-64 mb-6"></div>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-4xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center space-x-3 mb-2">
          <Palette className="h-8 w-8 text-gray-600" />
          <h1 className="text-2xl font-bold text-gray-900">Widget Settings</h1>
        </div>
        <p className="text-gray-600">
          Customize your chat widget appearance and behavior
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Settings Panel */}
        <div className="space-y-6">
          {/* Appearance */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Appearance</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Primary Color
                </label>
                <div className="flex items-center space-x-3">
                  <input
                    type="color"
                    value={settings.primaryColor}
                    onChange={(e) => setSettings({ ...settings, primaryColor: e.target.value })}
                    className="h-10 w-20 rounded border border-gray-300"
                  />
                  <input
                    type="text"
                    value={settings.primaryColor}
                    onChange={(e) => setSettings({ ...settings, primaryColor: e.target.value })}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Accent Color
                </label>
                <div className="flex items-center space-x-3">
                  <input
                    type="color"
                    value={settings.accentColor}
                    onChange={(e) => setSettings({ ...settings, accentColor: e.target.value })}
                    className="h-10 w-20 rounded border border-gray-300"
                  />
                  <input
                    type="text"
                    value={settings.accentColor}
                    onChange={(e) => setSettings({ ...settings, accentColor: e.target.value })}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Position
                </label>
                <select
                  value={settings.position}
                  onChange={(e) => setSettings({ ...settings, position: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="bottom-right">Bottom Right</option>
                  <option value="bottom-left">Bottom Left</option>
                  <option value="top-right">Top Right</option>
                  <option value="top-left">Top Left</option>
                </select>
              </div>
            </div>
          </div>

          {/* Behavior */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Behavior</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Welcome Message
                </label>
                <textarea
                  value={settings.welcomeMessage}
                  onChange={(e) => setSettings({ ...settings, welcomeMessage: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter your welcome message..."
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">Widget Enabled</h4>
                    <p className="text-sm text-gray-600">Show the chat widget on your website</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.enabled}
                    onChange={(e) => setSettings({ ...settings, enabled: e.target.checked })}
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">AI Responses</h4>
                    <p className="text-sm text-gray-600">Enable AI-powered automatic responses</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.aiEnabled}
                    onChange={(e) => setSettings({ ...settings, aiEnabled: e.target.checked })}
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">Show Agent Photos</h4>
                    <p className="text-sm text-gray-600">Display agent profile pictures in chat</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.showAgentPhotos}
                    onChange={(e) => setSettings({ ...settings, showAgentPhotos: e.target.checked })}
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex space-x-4">
            <button
              onClick={saveSettings}
              disabled={saving}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              <Settings className="h-4 w-4" />
              <span>{saving ? 'Saving...' : 'Save Settings'}</span>
            </button>
          </div>
        </div>

        {/* Widget Code */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Widget Code</h3>
            <button
              onClick={copyWidgetCode}
              className="flex items-center space-x-2 px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4 text-green-600" />
                  <span className="text-green-600">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>
          
          <p className="text-sm text-gray-600 mb-4">
            Copy and paste this code before the closing &lt;/body&gt; tag on your website:
          </p>
          
          <pre className="bg-gray-50 p-4 rounded-md text-sm overflow-x-auto border">
            <code>{generateWidgetCode()}</code>
          </pre>

          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
            <div className="flex items-start space-x-3">
              <Globe className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <h4 className="text-sm font-medium text-blue-900">Integration Instructions</h4>
                <p className="text-sm text-blue-700 mt-1">
                  1. Copy the code above<br/>
                  2. Paste it before the closing &lt;/body&gt; tag on your website<br/>
                  3. The widget will appear automatically on all pages
                </p>
              </div>
            </div>
          </div>

          <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-md">
            <div className="flex items-start space-x-3">
              <svg className="h-5 w-5 text-green-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              <div>
                <h4 className="text-sm font-medium text-green-900">Multi-Domain Ready</h4>
                <p className="text-sm text-green-700 mt-1">
                  ✅ Supports localhost, horizon-ai-one.vercel.app, and infin8t.net automatically<br/>
                  ✅ Works on CodePen, JSFiddle, and other external domains<br/>
                  ✅ Includes CORS support and automatic domain detection
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 