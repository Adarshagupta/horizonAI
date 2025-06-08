import Link from 'next/link'
import { MessageCircle, Bot, Users, Zap, Shield, BarChart3 } from 'lucide-react'

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <MessageCircle className="h-8 w-8 text-blue-600" />
              <span className="ml-2 text-xl font-bold text-gray-900">ChatSupport AI</span>
            </div>
            <nav className="hidden md:flex space-x-8">
              <Link href="#features" className="text-gray-500 hover:text-gray-900">Features</Link>
              <Link href="#pricing" className="text-gray-500 hover:text-gray-900">Pricing</Link>
              <Link href="/auth/login" className="text-gray-500 hover:text-gray-900">Login</Link>
              <Link href="/auth/signup" className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">
                Get Started
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
              AI-Powered Customer Support
              <span className="text-blue-600"> Made Simple</span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              Transform your customer service with intelligent chat widgets, automated responses, 
              and seamless human handoffs. Just like Intercom, but with AI at its core.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link 
                href="/auth/signup"
                className="bg-blue-600 text-white px-8 py-3 rounded-lg text-lg font-semibold hover:bg-blue-700 transition-colors"
              >
                Start Free Trial
              </Link>
              <Link 
                href="/auth/signup"
                className="border border-gray-300 text-gray-700 px-8 py-3 rounded-lg text-lg font-semibold hover:bg-gray-50 transition-colors"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Everything you need for customer success
            </h2>
            <p className="text-xl text-gray-600">
              Powerful features to help you deliver exceptional customer support
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="bg-gray-50 p-6 rounded-lg">
              <Bot className="h-12 w-12 text-blue-600 mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">AI Assistant</h3>
              <p className="text-gray-600">
                Intelligent AI responses handle common queries automatically, 
                reducing response time and improving customer satisfaction.
              </p>
            </div>

            <div className="bg-gray-50 p-6 rounded-lg">
              <MessageCircle className="h-12 w-12 text-blue-600 mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Live Chat Widget</h3>
              <p className="text-gray-600">
                Beautiful, customizable chat widget that integrates seamlessly 
                with your website and matches your brand.
              </p>
            </div>

            <div className="bg-gray-50 p-6 rounded-lg">
              <Users className="h-12 w-12 text-blue-600 mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Team Collaboration</h3>
              <p className="text-gray-600">
                Multiple agents can collaborate on conversations with smart 
                assignment and handoff capabilities.
              </p>
            </div>

            <div className="bg-gray-50 p-6 rounded-lg">
              <Zap className="h-12 w-12 text-blue-600 mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Real-time Updates</h3>
              <p className="text-gray-600">
                Instant notifications and real-time message delivery ensure 
                no customer query goes unanswered.
              </p>
            </div>

            <div className="bg-gray-50 p-6 rounded-lg">
              <Shield className="h-12 w-12 text-blue-600 mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Secure & Reliable</h3>
              <p className="text-gray-600">
                Enterprise-grade security with Firebase backend ensures 
                your customer data is always protected.
              </p>
            </div>

            <div className="bg-gray-50 p-6 rounded-lg">
              <BarChart3 className="h-12 w-12 text-blue-600 mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Analytics & Insights</h3>
              <p className="text-gray-600">
                Detailed analytics help you understand customer needs and 
                optimize your support performance.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-blue-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Ready to transform your customer support?
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Join thousands of businesses already using ChatSupport AI
          </p>
          <Link 
            href="/auth/signup"
            className="bg-white text-blue-600 px-8 py-3 rounded-lg text-lg font-semibold hover:bg-gray-100 transition-colors"
          >
            Get Started Today
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center mb-4 md:mb-0">
              <MessageCircle className="h-6 w-6 text-blue-400" />
              <span className="ml-2 text-lg font-bold">ChatSupport AI</span>
            </div>
            <div className="text-gray-400">
              © 2024 ChatSupport AI. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
