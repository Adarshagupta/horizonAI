'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useEffect, useState } from 'react'

export default function TestWidget() {
  const { user } = useAuth()
  const [debugInfo, setDebugInfo] = useState('')

  useEffect(() => {
    if (!user) return

    // Remove any existing widget
    const existingWidget = document.getElementById('chat-support-widget')
    if (existingWidget) {
      existingWidget.remove()
    }

    // Remove existing script
    const existingScript = document.querySelector('script[src*="widget.js"]')
    if (existingScript) {
      existingScript.remove()
    }

    // Clear any existing widget state
    if (window.ChatSupportWidget) {
      delete window.ChatSupportWidget
    }

    // Add the widget script with correct business ID
    const script = document.createElement('script')
    script.src = `${window.location.origin}/widget.js`
    script.setAttribute('data-business-id', user.businessId || user.id)
    script.setAttribute('data-primary-color', '#2563eb')
    script.setAttribute('data-welcome-message', 'Hi! Testing the widget with agent availability.')
    
    // Add script to head
    document.head.appendChild(script)

    return () => {
      // Cleanup on unmount
      const scriptToRemove = document.querySelector('script[src*="widget.js"]')
      if (scriptToRemove) {
        scriptToRemove.remove()
      }
      const widgetToRemove = document.getElementById('chat-support-widget')
      if (widgetToRemove) {
        widgetToRemove.remove()
      }
    }
  }, [user])

  const handleDebugCheck = async () => {
    try {
      // Test basic API connectivity
      const response = await fetch('/api/conversations?businessId=test')
      const data = await response.json()
      setDebugInfo(`API Test: ${response.status} - ${JSON.stringify(data, null, 2)}`)
    } catch (error) {
      setDebugInfo(`Error: ${error}`)
    }
  }

  if (!user) {
    return <div className="p-6">Please log in to test the widget</div>
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Widget Test Page</h1>
      
      <button 
        onClick={handleDebugCheck}
        className="mb-4 px-4 py-2 bg-blue-500 text-white rounded"
      >
        Test API Connection
      </button>
      
      {debugInfo && (
        <pre className="bg-gray-100 p-4 rounded mb-4 text-sm">
          {debugInfo}
        </pre>
      )}

      <div className="bg-white rounded-lg border p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Test Configuration</h2>
        <div className="space-y-2 text-sm">
          <div><strong>User ID:</strong> {user.id}</div>
          <div><strong>Business ID:</strong> {user.businessId || 'undefined'}</div>
          <div><strong>Effective Business ID:</strong> {user.businessId || user.id}</div>
          <div><strong>Current Time:</strong> {new Date().toLocaleString()}</div>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
        <h3 className="text-blue-800 font-medium mb-2">Instructions:</h3>
        <ol className="text-blue-700 space-y-1 list-decimal list-inside">
          <li>The chat widget should appear in the bottom-right corner</li>
          <li>Click on it to open the chat</li>
          <li>Try asking for a human agent by typing "I need to speak to a human"</li>
          <li>Check if agent availability is detected correctly</li>
          <li>Go back to the dashboard to set your status to online if needed</li>
        </ol>
      </div>

      <div className="bg-gray-50 rounded-lg p-6">
        <h3 className="text-gray-800 font-medium mb-3">Debugging Tips:</h3>
        <ul className="text-gray-600 space-y-1 list-disc list-inside">
          <li>Open browser dev console to see any JavaScript errors</li>
          <li>Check Network tab to see API calls to availability endpoints</li>
          <li>Go to <a href="/debug-agent-status" className="text-blue-600 underline">Debug Agent Status</a> page to verify your status</li>
          <li>Ensure you're set to "Online" in the dashboard</li>
        </ul>
      </div>

      <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <p className="text-yellow-800 text-sm">
          <strong>Note:</strong> The chat widget will load automatically when you visit this page. 
          It uses your actual business ID: <code className="bg-yellow-200 px-1 rounded">{user.businessId || user.id}</code>
        </p>
      </div>

      <div 
        id="newchat-widget"
        data-business-id="test-business" 
        data-api-url="http://localhost:3000"
      ></div>
      
      <script 
        src="/widget.js" 
        defer
      ></script>
    </div>
  )
}

// Add type declaration for window.ChatSupportWidget
declare global {
  interface Window {
    ChatSupportWidget?: any
  }
} 