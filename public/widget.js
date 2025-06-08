(function() {
  'use strict';

  // Get business ID from script tag
  const currentScript = document.currentScript;

  // Configuration with multi-domain support
  const getApiUrl = () => {
    // If data-api-url is explicitly provided, use it
    if (currentScript?.getAttribute('data-api-url')) {
      return currentScript.getAttribute('data-api-url');
    }
    
    // Auto-detect based on current domain
    const currentOrigin = window.location.origin;
    
    // Support for known domains
    if (currentOrigin.includes('horizon-ai-one.vercel.app')) {
      return 'https://horizon-ai-one.vercel.app';
    }
    if (currentOrigin.includes('infin8t.net')) {
      return 'https://infin8t.net';
    }
    if (currentOrigin.includes('localhost')) {
      return 'http://localhost:3000';
    }
    
    // Default fallback to current origin
    return currentOrigin;
  };
  
  const WIDGET_CONFIG = {
    apiUrl: getApiUrl(),
    version: '2.2.0' // Added multi-domain support
  };
  
  // Log the API URL being used for debugging
  console.log('🌐 ChatSupport Widget - Using API URL:', WIDGET_CONFIG.apiUrl);
  const businessId = currentScript ? currentScript.getAttribute('data-business-id') : null;
  
  if (!businessId) {
    console.error('ChatSupport Widget: Missing data-business-id attribute. Please add data-business-id to the script tag.');
    return;
  }
  
  const config = {
    primaryColor: currentScript?.getAttribute('data-primary-color') || '#2563eb',
    accentColor: currentScript?.getAttribute('data-accent-color') || '#3b82f6',
    welcomeMessage: currentScript?.getAttribute('data-welcome-message') || 'Hi! How can we help you today?',
    position: currentScript?.getAttribute('data-position') || 'bottom-right',
    enabled: currentScript?.getAttribute('data-enabled') !== 'false',
    aiEnabled: currentScript?.getAttribute('data-ai-enabled') !== 'false'
  };

  // Don't load if already loaded
  if (window.ChatSupportWidget) {
    return;
  }

  // Widget state
  let isOpen = false;
  let isMinimized = false;
  let messages = [];
  let conversationId = null;
  let customerInfo = null;
  let socket = null;
  let widgetState = {
    agentConnected: false,
    agentName: null,
    agentId: null,
    isPolling: false,
    isTypingPolling: false,
    typingTimeout: null,
    isUserTyping: false
  };

  // Create widget HTML
  function createWidget() {
    const widgetContainer = document.createElement('div');
    widgetContainer.id = 'chat-support-widget';
    widgetContainer.innerHTML = `
      <style>
        #chat-support-widget {
          position: fixed;
          ${config.position.includes('right') ? 'right: 20px;' : 'left: 20px;'}
          bottom: 20px;
          z-index: 9999;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        .chat-widget-button {
          width: 60px;
          height: 60px;
          border-radius: 50%;
          background: ${config.primaryColor};
          border: none;
          cursor: pointer;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.3s ease;
        }
        .chat-widget-button:hover {
          transform: scale(1.1);
          box-shadow: 0 6px 20px rgba(0, 0, 0, 0.2);
        }
        .chat-widget-button svg {
          width: 24px;
          height: 24px;
          fill: white;
        }
        .chat-widget-window {
          position: absolute;
          bottom: 80px;
          ${config.position.includes('right') ? 'right: 0;' : 'left: 0;'}
          width: 350px;
          height: 500px;
          background: white;
          border-radius: 16px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
          display: none;
          flex-direction: column;
          overflow: hidden;
          border: 1px solid #e5e7eb;
        }
        .chat-widget-window.open {
          display: flex;
          animation: slideUp 0.3s ease-out;
        }
        .chat-widget-window.minimized {
          height: 60px;
        }
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .chat-header {
          background: ${config.primaryColor};
          color: white;
          padding: 16px;
          display: flex;
          align-items: center;
          justify-content: between;
        }
        .chat-header h3 {
          margin: 0;
          font-size: 16px;
          font-weight: 600;
          flex: 1;
        }
        .chat-header-actions {
          display: flex;
          gap: 8px;
        }
        .chat-header button {
          background: none;
          border: none;
          color: white;
          cursor: pointer;
          padding: 4px;
          border-radius: 4px;
          opacity: 0.8;
          transition: opacity 0.2s;
        }
        .chat-header button:hover {
          opacity: 1;
          background: rgba(255, 255, 255, 0.1);
        }
        .chat-messages {
          flex: 1;
          padding: 16px;
          overflow-y: auto;
          background: #f9fafb;
        }
        .chat-input-container {
          padding: 16px;
          border-top: 1px solid #e5e7eb;
          background: white;
        }
        .contact-form {
          padding: 16px;
        }
        .contact-form h4 {
          margin: 0 0 16px 0;
          font-size: 16px;
          color: #1f2937;
        }
        .contact-form input {
          width: 100%;
          padding: 8px 12px;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          margin-bottom: 12px;
          font-size: 14px;
          box-sizing: border-box;
        }
        .contact-form button {
          width: 100%;
          padding: 10px;
          background: ${config.primaryColor};
          color: white;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
        }
        .message {
          margin-bottom: 16px;
          display: flex;
          gap: 8px;
        }
        .message.user {
          flex-direction: row-reverse;
        }
        .message-content {
          max-width: 80%;
          padding: 10px 12px;
          border-radius: 12px;
          font-size: 14px;
          line-height: 1.4;
        }
        .message.user .message-content {
          background: ${config.primaryColor};
          color: white;
          border-bottom-right-radius: 4px;
        }
        .message.agent .message-content,
        .message.ai .message-content {
          background: white;
          color: #1f2937;
          border: 1px solid #e5e7eb;
          border-bottom-left-radius: 4px;
        }
        .message.ai .message-content {
          background: #f3f4f6;
          border-left: 3px solid ${config.accentColor};
        }
        .message-time {
          font-size: 11px;
          color: #6b7280;
          margin-top: 4px;
          text-align: ${config.position.includes('right') ? 'right' : 'left'};
        }
        .message.user .message-time {
          text-align: ${config.position.includes('right') ? 'left' : 'right'};
        }
        .chat-input {
          display: flex;
          gap: 8px;
        }
        .chat-input input {
          flex: 1;
          padding: 10px 12px;
          border: 1px solid #d1d5db;
          border-radius: 20px;
          font-size: 14px;
          outline: none;
        }
        .chat-input input:focus {
          border-color: ${config.primaryColor};
        }
        .chat-input button {
          padding: 10px;
          background: ${config.primaryColor};
          color: white;
          border: none;
          border-radius: 50%;
          cursor: pointer;
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .chat-input button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .typing-indicator {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px;
          background: white;
          border-radius: 12px;
          border: 1px solid #e5e7eb;
          margin-bottom: 16px;
          max-width: 200px;
          border-bottom-left-radius: 4px;
        }
        .typing-text {
          font-size: 12px;
          color: #6b7280;
        }
        .typing-dots {
          display: flex;
          gap: 2px;
        }
        .typing-dot {
          width: 6px;
          height: 6px;
          background: #9ca3af;
          border-radius: 50%;
          animation: typing 1.4s infinite;
        }
        .typing-dot:nth-child(1) {
          animation-delay: 0s;
        }
        .typing-dot:nth-child(2) {
          animation-delay: 0.2s;
        }
        .typing-dot:nth-child(3) {
          animation-delay: 0.4s;
        }
        @keyframes typing {
          0%, 60%, 100% {
            transform: translateY(0);
            opacity: 0.3;
          }
          30% {
            transform: translateY(-8px);
            opacity: 1;
          }
        }
        .suggested-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin-top: 8px;
        }
        .suggested-action {
          padding: 4px 8px;
          background: #f3f4f6;
          border: 1px solid #d1d5db;
          border-radius: 12px;
          font-size: 12px;
          cursor: pointer;
          transition: background 0.2s;
        }
        .suggested-action:hover {
          background: #e5e7eb;
        }
        .ai-confidence {
          display: flex;
          align-items: center;
          gap: 4px;
          margin-top: 4px;
          font-size: 11px;
          color: #6b7280;
        }
        .confidence-bar {
          width: 30px;
          height: 3px;
          background: #e5e7eb;
          border-radius: 2px;
          overflow: hidden;
        }
        .confidence-fill {
          height: 100%;
          background: ${config.accentColor};
          transition: width 0.3s;
        }
        .unread-badge {
          position: absolute;
          top: -8px;
          right: -8px;
          background: #ef4444;
          color: white;
          border-radius: 50%;
          width: 20px;
          height: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: 600;
        }
        .message-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 4px;
        }
        .message-ticks {
          font-size: 11px;
          margin-left: 8px;
          font-weight: bold;
        }
        .ticks-pending {
          color: #9ca3af;
        }
        .ticks-delivered {
          color: #9ca3af;
        }
        .ticks-read {
          color: #3b82f6;
        }
        @media (max-width: 480px) {
          .chat-widget-window {
            width: calc(100vw - 40px);
            height: calc(100vh - 120px);
            bottom: 80px;
            left: 20px !important;
            right: 20px !important;
          }
        }
      </style>
      
      <button class="chat-widget-button" onclick="ChatSupportWidget.toggle()">
        <svg viewBox="0 0 24 24">
          <path d="M12 2C6.48 2 2 6.48 2 12c0 1.54.36 2.98.97 4.29L1 23l6.71-1.97C9.02 21.64 10.46 22 12 22c5.52 0 10-4.48 10-10S17.52 2 12 2zm0 18c-1.45 0-2.84-.35-4.05-.98l-.29-.16-3.23.95.95-3.23-.16-.29C4.35 14.84 4 13.45 4 12c0-4.41 3.59-8 8-8s8 3.59 8 8-3.59 8-8 8z"/>
          <path d="M8.5 11.5h7v1h-7z"/>
          <path d="M8.5 14h5v1h-5z"/>
        </svg>
        <div class="unread-badge" id="unread-badge" style="display: none;">0</div>
      </button>
      
      <div class="chat-widget-window" id="chat-window">
        <div class="chat-header">
          <h3>Customer Support</h3>
          <div class="chat-header-actions">
            <button onclick="ChatSupportWidget.minimize()" title="Minimize">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 13H5v-2h14v2z"/>
              </svg>
            </button>
            <button onclick="ChatSupportWidget.close()" title="Close">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
              </svg>
            </button>
          </div>
        </div>
        
        <div id="contact-form-container">
          <div class="contact-form">
            <h4>Start a conversation</h4>
            <input type="text" id="customer-name" placeholder="Your name" required>
            <input type="email" id="customer-email" placeholder="Your email" required>
            <button onclick="ChatSupportWidget.startConversation()">Start Chat</button>
          </div>
        </div>
        
        <div class="chat-messages" id="chat-messages" style="display: none;">
          <!-- Messages will be inserted here -->
        </div>
        
        <div class="chat-input-container" id="chat-input-container" style="display: none;">
          <div class="chat-input">
                            <input type="text" id="message-input" placeholder="Type your message..." onkeypress="ChatSupportWidget.handleKeyPress(event)" oninput="ChatSupportWidget.handleTyping()">
            <button onclick="ChatSupportWidget.sendMessage()" id="send-button" disabled>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(widgetContainer);
    
    // Setup message input handler
    const messageInput = document.getElementById('message-input');
    messageInput.addEventListener('input', function() {
      const sendButton = document.getElementById('send-button');
      sendButton.disabled = !this.value.trim();
      
      // Handle typing indicator
      ChatSupportWidget.handleTyping();
    });
  }

  // CORS test helper
  async function testCORS() {
    try {
      console.log('🧪 Testing CORS with:', `${WIDGET_CONFIG.apiUrl}/api/test-cors`);
      const response = await fetch(`${WIDGET_CONFIG.apiUrl}/api/test-cors`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ test: 'CORS test from widget', timestamp: Date.now() })
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log('✅ CORS test successful:', result);
        return true;
      } else {
        console.error('❌ CORS test failed:', response.status, response.statusText);
        return false;
      }
    } catch (error) {
      console.error('❌ CORS test error:', error);
      return false;
    }
  }

  // API functions
  async function callAPI(endpoint, data = {}) {
    try {
      const response = await fetch(`${WIDGET_CONFIG.apiUrl}/api/${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ businessId, ...data })
      });
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('API call failed:', error);
      return null;
    }
  }

  // Message functions
  function addMessage(content, sender = 'user', timestamp = new Date(), confidence = null, suggestedActions = [], messageStatus = 'pending') {
    // Debug: check if this message already exists by content and timestamp
    const existingMessage = messages.find(m => 
      m.content === content && 
      m.sender === sender && 
      Math.abs(new Date(m.timestamp) - new Date(timestamp)) < 2000 // within 2 seconds
    );
    
    if (existingMessage) {
      console.log('🚨 Duplicate message detected, skipping:', {
        content: content.substring(0, 30),
        sender,
        existingId: existingMessage.id
      });
      return existingMessage;
    }
    
    console.log('✅ Adding new message:', {
      content: content.substring(0, 30),
      sender,
      totalMessages: messages.length + 1
    });
    
    const messagesContainer = document.getElementById('chat-messages');
    const messageEl = document.createElement('div');
    messageEl.className = `message ${sender}`;
    
    // Generate unique message ID for status tracking
    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    messageEl.setAttribute('data-message-id', messageId);
    
    const timeStr = timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    let actionsHtml = '';
    if (suggestedActions.length > 0) {
      actionsHtml = `
        <div class="suggested-actions">
          ${suggestedActions.map(action => 
            `<span class="suggested-action" onclick="ChatSupportWidget.sendMessage('${action}')">${action}</span>`
          ).join('')}
        </div>
      `;
    }
    
    let confidenceHtml = '';
    if (confidence !== null && sender === 'ai') {
      confidenceHtml = `
        <div class="ai-confidence">
          <span>AI Confidence:</span>
          <div class="confidence-bar">
            <div class="confidence-fill" style="width: ${confidence * 100}%"></div>
          </div>
          <span>${Math.round(confidence * 100)}%</span>
        </div>
      `;
    }
    
    // Add tick status for user messages
    let ticksHtml = '';
    if (sender === 'user') {
      const tickClass = messageStatus === 'read' ? 'ticks-read' : 
                       messageStatus === 'delivered' ? 'ticks-delivered' : 'ticks-pending';
      ticksHtml = `<span class="message-ticks ${tickClass}">✓✓</span>`;
    }
    
    messageEl.innerHTML = `
      <div class="message-content">
        ${content}
        ${actionsHtml}
        ${confidenceHtml}
      </div>
      <div class="message-footer">
        <div class="message-time">${timeStr}</div>
        ${ticksHtml}
      </div>
    `;
    
    messagesContainer.appendChild(messageEl);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    
    // Update unread badge if window is closed
    if (!isOpen) {
      updateUnreadBadge();
    }
    
    const messageData = { 
      id: messageId,
      content, 
      sender, 
      timestamp, 
      confidence, 
      suggestedActions, 
      status: messageStatus 
    };
    messages.push(messageData);
    
    return messageData;
  }

  function showTypingIndicator(userName = 'Someone') {
    // Don't show if already exists
    if (document.getElementById('typing-indicator')) {
      return;
    }
    
    const messagesContainer = document.getElementById('chat-messages');
    const typingEl = document.createElement('div');
    typingEl.id = 'typing-indicator';
    typingEl.className = 'typing-indicator';
    typingEl.innerHTML = `
      <span class="typing-text">${userName} is typing</span>
      <div class="typing-dots">
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
      </div>
    `;
    messagesContainer.appendChild(typingEl);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  function hideTypingIndicator() {
    const typingEl = document.getElementById('typing-indicator');
    if (typingEl) {
      typingEl.remove();
    }
  }

  function updateUnreadBadge() {
    const badge = document.getElementById('unread-badge');
    const unreadCount = messages.filter(m => m.sender !== 'user' && !m.read).length;
    
    if (unreadCount > 0) {
      badge.textContent = unreadCount > 9 ? '9+' : unreadCount;
      badge.style.display = 'flex';
    } else {
      badge.style.display = 'none';
    }
  }

  function updateMessageStatus(messageId, status) {
    // Update in messages array
    const messageData = messages.find(m => m.id === messageId);
    if (messageData) {
      messageData.status = status;
    }
    
    // Update in DOM
    const messageEl = document.querySelector(`[data-message-id="${messageId}"]`);
    if (messageEl) {
      const ticksEl = messageEl.querySelector('.message-ticks');
      if (ticksEl) {
        ticksEl.className = `message-ticks ${
          status === 'read' ? 'ticks-read' : 
          status === 'delivered' ? 'ticks-delivered' : 'ticks-pending'
        }`;
      }
    }
  }

  // Main widget object
  window.ChatSupportWidget = {
    toggle: function() {
      const chatWindow = document.getElementById('chat-window');
      if (isOpen) {
        this.close();
      } else {
        this.open();
      }
    },

    open: function() {
      const chatWindow = document.getElementById('chat-window');
      chatWindow.classList.add('open');
      chatWindow.classList.remove('minimized');
      isOpen = true;
      isMinimized = false;
      
      // Mark messages as read
      messages.forEach(m => m.read = true);
      updateUnreadBadge();
      
      // Focus on input if in chat mode
      if (customerInfo) {
        const messageInput = document.getElementById('message-input');
        setTimeout(() => messageInput.focus(), 100);
      }
      
      // Start message polling if conversation exists
      if (conversationId) {
        this.startMessagePolling();
        this.startTypingPolling();
      }
    },

    close: function() {
      const chatWindow = document.getElementById('chat-window');
      chatWindow.classList.remove('open');
      isOpen = false;
      isMinimized = false;
    },

    minimize: function() {
      const chatWindow = document.getElementById('chat-window');
      chatWindow.classList.add('minimized');
      isMinimized = true;
    },

    startConversation: function() {
      const name = document.getElementById('customer-name').value.trim();
      const email = document.getElementById('customer-email').value.trim();
      
      if (!name || !email) {
        alert('Please fill in your name and email to start the conversation.');
        return;
      }

      customerInfo = { name, email };
      conversationId = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Hide contact form, show chat
      document.getElementById('contact-form-container').style.display = 'none';
      document.getElementById('chat-messages').style.display = 'block';
      document.getElementById('chat-input-container').style.display = 'block';
      
      // Add welcome message
      addMessage(config.welcomeMessage, 'ai', new Date(), 1.0);
      
      // Add personalized greeting
      setTimeout(() => {
        addMessage(
          `Hi ${name}! I'm your AI support assistant. I'm here to help you with any questions or issues you might have. What can I assist you with today?`,
          'ai',
          new Date(),
          1.0,
          ['Billing Question', 'Technical Issue', 'General Inquiry', 'Talk to Human']
        );
      }, 1000);
      
      // Focus on message input
      const messageInput = document.getElementById('message-input');
      setTimeout(() => messageInput.focus(), 100);
      
      // Start typing polling
      this.startTypingPolling();
    },

    sendMessage: async function(messageText = null) {
      const messageInput = document.getElementById('message-input');
      const content = messageText || messageInput.value.trim();
      
      if (!content) return;
      
      // Clear input
      if (!messageText) {
        messageInput.value = '';
        document.getElementById('send-button').disabled = true;
      }
      
      // Check if user wants to connect to human agent
      if (content.toLowerCase().includes('human') || content.toLowerCase().includes('agent') || 
          messageText === 'Yes, connect me' || messageText === 'Talk to Human') {
        await this.requestHumanAgent(content);
        return;
      }
      
      // Add user message with pending status
      const userMessage = addMessage(content, 'user', new Date(), null, [], 'pending');
      
      // Show typing indicator
      showTypingIndicator();
      
      try {
        // Call AI service
        const response = await fetch(`${WIDGET_CONFIG.apiUrl}/api/chat-realtime`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: content,
            businessId: businessId,
            conversationId: conversationId,
            customerInfo: customerInfo,
            previousMessages: messages.slice(-5) // Send last 5 messages for context
          })
        });
        
        let aiResponse;
        if (response.ok) {
          aiResponse = await response.json();
          
          // Update message status based on response
          if (aiResponse.silent && aiResponse.messageDelivered) {
            // Message was delivered to agent - update tick status
            updateMessageStatus(userMessage.id, 'delivered');
          } else if (aiResponse.agentConnected) {
            // Agent is connected but responded - mark as delivered
            updateMessageStatus(userMessage.id, 'delivered');
          }
        } else {
          // Fallback to simple responses
          aiResponse = this.getFallbackResponse(content);
          updateMessageStatus(userMessage.id, 'delivered');
        }
        
        // Hide typing indicator
        hideTypingIndicator();
        
        // Only add AI response if it's not silent
        console.log('🔍 AI Response debug:', {
          silent: aiResponse.silent,
          message: aiResponse.message,
          needsHuman: aiResponse.needsHuman,
          confidence: aiResponse.confidence,
          agentConnected: aiResponse.agentConnected,
          shouldAddMessage: !aiResponse.silent && aiResponse.message,
          shouldShowHumanConnect: aiResponse.needsHuman || aiResponse.confidence < 0.6
        });
        
        if (!aiResponse.silent && aiResponse.message) {
          addMessage(
            aiResponse.message,
            'ai',
            new Date(),
            aiResponse.confidence || 0.8,
            aiResponse.suggestedActions || []
          );
        }
        
        // Check if human agent is needed - SKIP if agent already connected
        if (!aiResponse.agentConnected && (aiResponse.needsHuman || aiResponse.confidence < 0.6)) {
          setTimeout(() => {
            addMessage(
              "Would you like me to connect you with a human agent for more personalized assistance?",
              'ai',
              new Date(),
              1.0,
              ['Yes, connect me', 'No, continue with AI', 'Talk to Human']
            );
          }, 2000);
        }
        
      } catch (error) {
        console.error('Error sending message:', error);
        hideTypingIndicator();
        
        // Fallback response
        addMessage(
          "I'm sorry, I'm having trouble connecting right now. Let me try to help you anyway. What specific issue are you experiencing?",
          'ai',
          new Date(),
          0.5,
          ['Technical Support', 'Billing Help', 'Talk to Human']
        );
      }
    },

    requestHumanAgent: async function(message) {
      // First check agent availability
      try {
        const availabilityResponse = await fetch(`${WIDGET_CONFIG.apiUrl}/api/check-agent-availability?businessId=${businessId}`);
        
        if (availabilityResponse.ok) {
          const availability = await availabilityResponse.json();
          console.log('Availability response:', availability);
        
          // Show dynamic message based on availability
          addMessage(
            `🔄 ${availability.message}`,
            'ai',
            new Date(),
            1.0
          );
            
          if (availability.available) {
            addMessage(
              `⏱️ Estimated wait time: ${availability.estimatedWaitTime}`,
              'ai',
              new Date(),
              1.0
            );
          } else {
            addMessage(
              `⏰ Estimated wait time: ${availability.estimatedWaitTime}. We'll connect you as soon as an agent becomes available.`,
              'ai',
              new Date(),
              1.0
            );
          }
        }
      } catch (error) {
        console.error('Error checking agent availability:', error);
        // Continue with normal flow if availability check fails
      }
      
      // Show connecting message
      addMessage(
        "🔄 Requesting human agent...",
        'ai',
        new Date(),
        1.0
      );
      
      try {
        const response = await fetch(`${WIDGET_CONFIG.apiUrl}/api/request-agent`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            conversationId: conversationId,
            businessId: businessId,
            customerInfo: customerInfo,
            message: message
          })
        });
        
        if (response.ok) {
          const result = await response.json();
          console.log('Agent request result:', result);
          
          addMessage(
            "✅ Perfect! I've notified our support team. An agent will join this conversation shortly.",
            'ai',
            new Date(),
            1.0
          );
          
          // Start listening for agent connection
          this.listenForAgentConnection();
          
        } else {
          const errorData = await response.json().catch(() => ({}));
          
          addMessage(
            errorData.message || "✅ Perfect! I've connected you to our 24/7 support team. An agent will be with you shortly.",
            'ai',
            new Date(),
            1.0,
            ['Continue with AI', 'Ask another question']
          );
        }
      } catch (error) {
        console.error('Error requesting human agent:', error);
        addMessage(
          "There was an error connecting to our support team. Please try again or continue with AI assistance.",
          'ai',
          new Date(),
          0.5,
          ['Try again', 'Continue with AI', 'Leave detailed message']
        );
      }
    },

    showOfflineMessageForm: function() {
      const messagesContainer = document.getElementById('chat-messages');
      const messageForm = document.createElement('div');
      messageForm.className = 'offline-message-form';
      messageForm.innerHTML = `
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin: 16px 0;">
          <h4 style="margin: 0 0 12px 0; color: #1f2937; font-size: 14px; font-weight: 600;">
            📝 Leave us a detailed message
          </h4>
          <textarea 
            id="offline-message" 
            placeholder="Please describe your issue in detail. Include any relevant information that will help us assist you better..."
            style="width: 100%; height: 80px; padding: 8px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 13px; resize: vertical;"
          ></textarea>
          <div style="margin-top: 12px; display: flex; gap: 8px;">
            <button 
              onclick="ChatSupportWidget.submitOfflineMessage()" 
              style="flex: 1; padding: 8px 12px; background: ${config.primaryColor}; color: white; border: none; border-radius: 6px; font-size: 13px; cursor: pointer;"
            >
              Send Message
            </button>
            <button 
              onclick="ChatSupportWidget.cancelOfflineMessage()" 
              style="padding: 8px 12px; background: #f3f4f6; color: #6b7280; border: none; border-radius: 6px; font-size: 13px; cursor: pointer;"
            >
              Cancel
            </button>
          </div>
        </div>
      `;
      
      messagesContainer.appendChild(messageForm);
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
      
      // Focus on textarea
      setTimeout(() => {
        const textarea = document.getElementById('offline-message');
        if (textarea) textarea.focus();
      }, 100);
    },

    submitOfflineMessage: async function() {
      const textarea = document.getElementById('offline-message');
      const message = textarea ? textarea.value.trim() : '';
      
      if (!message) {
        alert('Please enter your message before submitting.');
        return;
      }
      
      // Remove the form
      const form = document.querySelector('.offline-message-form');
      if (form) form.remove();
      
      // Add the message to chat
      addMessage(message, 'user');
      
      // Try to create offline ticket
      try {
        await fetch(`${WIDGET_CONFIG.apiUrl}/api/create-offline-ticket`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            businessId: businessId,
            customerInfo: customerInfo,
            message: message,
            timestamp: new Date().toISOString()
          })
        });
        
        addMessage(
          "✅ Thank you! Your message has been received. We'll get back to you via email during business hours (9 AM - 6 PM EST).",
          'ai',
          new Date(),
          1.0,
          ['Close chat', 'Ask another question']
        );
        
      } catch (error) {
        console.error('Error submitting offline message:', error);
        addMessage(
          "Your message has been saved locally. Please try contacting us directly at support@company.com if you need immediate assistance.",
          'ai',
          new Date(),
          0.8
        );
      }
    },

    cancelOfflineMessage: function() {
      const form = document.querySelector('.offline-message-form');
      if (form) form.remove();
      
      addMessage(
        "No problem! You can continue chatting with me, or try requesting a human agent again later.",
        'ai',
        new Date(),
        1.0,
        ['Continue with AI', 'Try again later', 'Browse help articles']
      );
    },

    listenForAgentConnection: function() {
      // Poll for agent connection status
      let pollCount = 0;
      const maxPolls = 40; // 40 polls * 3 seconds = 2 minutes
      let lastKnownStatus = null;
      
      const checkAgentConnection = async () => {
        try {
          const response = await fetch(`${WIDGET_CONFIG.apiUrl}/api/conversation-status/${conversationId}`);
          if (response.ok) {
            const status = await response.json();
            
            // Check if an agent just connected
            if (status.status === 'connected' && status.assignedAgent && 
                (!lastKnownStatus || lastKnownStatus.status !== 'connected')) {
              
              // Add agent connection message
              addMessage(
                `👋 Hi! I'm ${status.agentName || 'a support agent'}, and I'm here to help you. I can see your previous conversation with our AI assistant. How can I assist you further?`,
                'agent',
                new Date(),
                1.0,
                ['Continue conversation', 'Ask new question']
              );
              
              // Update widget state to show agent is connected
              widgetState.agentConnected = true;
              widgetState.agentName = status.agentName || 'Support Agent';
              
              // Update the typing indicator text
              const inputSection = document.querySelector('.input-section');
              if (inputSection) {
                const input = inputSection.querySelector('input');
                if (input) {
                  input.placeholder = `Type your message to ${widgetState.agentName}...`;
                }
              }
              
              // Stop polling
              return;
            }
            
            // Update last known status
            lastKnownStatus = status;
          }
        } catch (error) {
          console.error('Error checking agent connection:', error);
        }
        
        pollCount++;
        
        // Continue polling if within time limit
        if (pollCount < maxPolls) {
          setTimeout(checkAgentConnection, 3000);
        } else {
          // Timeout - show offline form if no agent connected
          if (!widgetState.agentConnected) {
            addMessage(
              "I apologize, but our agents are currently busy. Would you like to leave a message? We'll get back to you as soon as possible.",
              'ai',
              new Date(),
              1.0,
              ['Leave message', 'Try again later', 'Continue with AI']
            );
          }
        }
      };
      
      // Start polling after a short delay
      setTimeout(checkAgentConnection, 3000);
      
      // Start polling for new messages once agent connects
      this.startMessagePolling();
      
      // Show initial notification about agent connection
      setTimeout(() => {
        if (!widgetState.agentConnected) {
          addMessage(
            "🔍 Looking for an available agent... Please wait a moment while I connect you.",
            'ai',
            new Date(),
            1.0
          );
        }
      }, 1000);
      
      // Show follow-up notification about wait times
      setTimeout(() => {
        if (!widgetState.agentConnected) {
          addMessage(
            "📞 Our agents typically respond within 2-5 minutes during business hours (9 AM - 6 PM EST).",
            'ai',
            new Date(),
            1.0
          );
        }
      }, 8000);
    },

    getFallbackResponse: function(message) {
      const lowerMessage = message.toLowerCase();
      
      if (lowerMessage.includes('human') || lowerMessage.includes('agent')) {
        return {
          message: "I understand you'd like to speak with a human agent. Let me connect you with someone from our team right away.",
          confidence: 1.0,
          needsHuman: true,
          suggestedActions: ['Connect now', 'Leave message', 'Continue with AI']
        };
      }
      
      if (lowerMessage.includes('price') || lowerMessage.includes('cost') || lowerMessage.includes('billing')) {
        return {
          message: "I'd be happy to help with pricing information! Our platform offers flexible pricing plans to suit different business needs. Would you like me to share details about our current plans?",
          confidence: 0.9,
          suggestedActions: ['View pricing', 'Compare plans', 'Talk to sales']
        };
      }
      
      if (lowerMessage.includes('integrate') || lowerMessage.includes('setup') || lowerMessage.includes('install')) {
        return {
          message: "Great question about integration! Our chat widget is very easy to set up. You just need to add a simple script tag to your website. Would you like step-by-step integration instructions?",
          confidence: 0.9,
          suggestedActions: ['Contact support', 'Browse help', 'Ask another question']
        };
      }
      
      return {
        message: `Thanks for your message! I'm here to help with any questions about our customer support platform. Could you provide a bit more detail about what you need assistance with?`,
        confidence: 0.7,
        suggestedActions: ['Technical help', 'Billing question', 'Feature info', 'Talk to human']
      };
    },

    handleKeyPress: function(event) {
      if (event.key === 'Enter') {
        this.sendMessage();
      }
    },

    // Typing indicator functions
    handleTyping: function() {
      if (!conversationId || !customerInfo) return;
      
      // Send typing start
      this.sendTypingStatus(true);
      
      // Clear existing timeout
      if (widgetState.typingTimeout) {
        clearTimeout(widgetState.typingTimeout);
      }
      
      // Set new timeout to stop typing after 2 seconds of inactivity
      widgetState.typingTimeout = setTimeout(() => {
        this.sendTypingStatus(false);
      }, 2000);
    },

    sendTypingStatus: function(isTyping) {
      if (!conversationId || !customerInfo) {
        console.log('⚠️ Cannot send typing status - missing conversation or customer info');
        return;
      }
      
      const wasTyping = widgetState.isUserTyping;
      widgetState.isUserTyping = isTyping;
      
      // Only send if status actually changed
      if (wasTyping === isTyping) {
        console.log('🔄 Typing status unchanged, skipping send');
        return;
      }
      
      console.log('📤 Sending typing status:', {
        isTyping,
        conversationId,
        userName: customerInfo.name,
        userId: customerInfo.email
      });
      
      fetch(`${WIDGET_CONFIG.apiUrl}/api/typing-status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          conversationId: conversationId,
          userId: customerInfo.email,
          userType: 'customer',
          userName: customerInfo.name,
          isTyping: isTyping
        })
      }).then(response => {
        if (response.ok) {
          console.log('✅ Typing status sent successfully');
        } else {
          console.error('❌ Failed to send typing status:', response.status);
        }
      }).catch(error => {
        console.error('Error sending typing status:', error);
      });
    },

    startTypingPolling: function() {
      if (widgetState.isTypingPolling) {
        console.log('🔄 Typing polling already active, skipping');
        return;
      }
      
      console.log('🎯 Starting typing status polling for conversation:', conversationId);
      widgetState.isTypingPolling = true;
      
      const pollTypingStatus = async () => {
        if (!conversationId || !customerInfo) {
          console.log('⚠️ No conversation or customer info for typing polling');
          return;
        }
        
        try {
          const url = `${WIDGET_CONFIG.apiUrl}/api/typing-status?conversationId=${conversationId}&excludeUserId=${customerInfo.email}`;
          console.log('🔍 Polling typing status:', url);
          
          const response = await fetch(url);
          
          if (response.ok) {
            const data = await response.json();
            console.log('👁️ Typing status response:', data);
            
            if (data.typingUsers && data.typingUsers.length > 0) {
              // Someone is typing - show indicator
              const typingUser = data.typingUsers[0]; // Show first typing user
              console.log('⌨️ User is typing:', typingUser.userName);
              showTypingIndicator(typingUser.userName);
            } else {
              // No one is typing - hide indicator
              console.log('🙊 No one is typing');
              hideTypingIndicator();
            }
          } else {
            console.error('❌ Typing status polling failed:', response.status);
          }
        } catch (error) {
          console.error('Error polling typing status:', error);
        }
        
        // Continue polling if widget is open
        if (isOpen && conversationId && widgetState.isTypingPolling) {
          setTimeout(pollTypingStatus, 1500); // Poll every 1.5 seconds
        } else {
          console.log('🛑 Stopping typing polling');
          widgetState.isTypingPolling = false;
        }
      };
      
      // Start polling after a delay
      setTimeout(pollTypingStatus, 1500);
    },

    markRecentUserMessagesAsRead: function() {
      // Mark the last few customer messages as read (blue ticks) 
      // when an agent responds
      const recentUserMessages = messages
        .filter(m => m.sender === 'user' && m.status !== 'read')
        .slice(-3); // Mark last 3 unread user messages as read
        
      recentUserMessages.forEach(msg => {
        updateMessageStatus(msg.id, 'read');
      });
    },

    startMessagePolling: function() {
      // Prevent multiple polling instances
      if (widgetState.isPolling) {
        console.log('🚨 Message polling already active, skipping duplicate');
        return;
      }
      
      widgetState.isPolling = true;
      console.log('🔄 Starting message polling for conversation:', conversationId);
      console.log('📊 Current messages in memory:', messages.length);
      
      // Track processed message IDs to avoid duplicates
      let processedMessageIds = new Set(messages.map(m => m.id));
      console.log('🎯 Starting with', processedMessageIds.size, 'processed message IDs');
      
      const pollForMessages = async () => {
        try {
          const response = await fetch(`${WIDGET_CONFIG.apiUrl}/api/get-messages?conversationId=${conversationId}`);
          if (response.ok) {
            const data = await response.json();
            console.log('📊 API returned', data.messages?.length || 0, 'total messages');
            
            if (data.messages && data.messages.length > 0) {
              // Process all messages from API, filter out duplicates
              const newMessages = data.messages.filter(msg => 
                !processedMessageIds.has(msg.id) && msg.content
              );
              
              if (newMessages.length > 0) {
                console.log('📨 New messages found:', newMessages.length);
                
                newMessages.forEach(msg => {
                  console.log('🔍 Processing new message:', {
                    id: msg.id,
                    type: msg.type,
                    content: msg.content?.substring(0, 30),
                    sender: msg.sender
                  });
                  
                  // Only add customer or agent messages (not AI)
                  if (msg.type === 'customer' || msg.type === 'agent') {
                    const sender = msg.type === 'customer' ? 'user' : 'agent';
                    
                    console.log('➕ Adding message:', msg.type, msg.content.substring(0, 50));
                    
                    addMessage(
                      msg.content,
                      sender,
                      new Date(msg.timestamp),
                      sender === 'agent' ? 1.0 : null,
                      []
                    );
                    
                    // Track this message as processed
                    processedMessageIds.add(msg.id);
                    
                    // If this is an agent message, mark recent customer messages as read
                    if (sender === 'agent') {
                      ChatSupportWidget.markRecentUserMessagesAsRead();
                    }
                  }
                });
              } else {
                console.log('🙊 No new messages to process');
              }
            }
          }
        } catch (error) {
          console.error('Error polling for messages:', error);
        }
        
        // Continue polling if widget is open and conversation exists
        if (isOpen && conversationId && widgetState.isPolling) {
          setTimeout(pollForMessages, 2000);
        } else {
          widgetState.isPolling = false;
          console.log('🛑 Stopping message polling');
        }
      };
      
      // Start polling after a delay
      setTimeout(pollForMessages, 2000);
    }
  };

  // Initialize widget
  if (config.enabled) {
    const initializeWidget = async () => {
      createWidget();
      
      // Test CORS on load for debugging
      console.log('🚀 ChatSupport Widget v' + WIDGET_CONFIG.version + ' loading...');
      console.log('📍 Widget running from origin:', window.location.origin);
      console.log('🎯 API target:', WIDGET_CONFIG.apiUrl);
      
      const corsWorking = await testCORS();
      if (!corsWorking) {
        console.warn('⚠️ CORS test failed - widget may not work properly from this domain');
        console.warn('💡 Tip: Make sure your localhost server is running and accessible');
      } else {
        console.log('✅ Widget is ready and CORS is working!');
      }
    };
    
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initializeWidget);
    } else {
      initializeWidget();
    }
  }

  // Analytics tracking
  try {
    if (typeof gtag !== 'undefined') {
      gtag('event', 'widget_loaded', {
        business_id: businessId,
        widget_version: WIDGET_CONFIG.version
      });
    }
  } catch (e) {
    // Analytics not available
  }

})(); 