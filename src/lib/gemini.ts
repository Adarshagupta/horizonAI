// Gemini AI Integration for ChatSupport
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'AIzaSyBE6WWVvzMJ9MnE244-yUwMwCqSlKQG2jw';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

export interface GeminiResponse {
  message: string;
  confidence: number;
  suggestedActions?: string[];
}

export async function generateAIResponse(
  userMessage: string,
  context?: {
    customerName?: string;
    previousMessages?: string[];
    businessType?: string;
  }
): Promise<GeminiResponse> {
  // TEMPORARY: Skip API calls and return a simple response for testing
  console.log('Generating AI response (temporary mode) for:', userMessage);
  
  const customerName = context?.customerName || 'there';
  
  // Generate a simple contextual response based on the message
  let aiMessage = '';
  const lowerMessage = userMessage.toLowerCase();
  
  if (lowerMessage.includes('hello') || lowerMessage.includes('hi')) {
    aiMessage = `Hello ${customerName}! How can I help you today?`;
  } else if (lowerMessage.includes('help') || lowerMessage.includes('support')) {
    aiMessage = `I'm here to help you, ${customerName}! Can you tell me more about what you need assistance with?`;
  } else if (lowerMessage.includes('problem') || lowerMessage.includes('issue')) {
    aiMessage = `I understand you're experiencing an issue, ${customerName}. Let me help you resolve this. Can you provide more details about the problem?`;
  } else if (lowerMessage.includes('thank') || lowerMessage.includes('thanks')) {
    aiMessage = `You're welcome, ${customerName}! Is there anything else I can help you with?`;
  } else {
    aiMessage = `Hi ${customerName}! I received your message: "${userMessage}". I'm here to help you. Can you provide a bit more detail about what you need assistance with?`;
  }
  
  // Generate suggested actions based on the conversation
  const suggestedActions = generateSuggestedActions(userMessage, aiMessage);
  
  return {
    message: aiMessage,
    confidence: 0.8,
    suggestedActions
  };
}

function calculateConfidence(aiResponse: string, userMessage: string): number {
  // Simple confidence calculation based on response characteristics
  let confidence = 0.8;
  
  // Reduce confidence if response is too short or generic
  if (aiResponse.length < 50) confidence -= 0.2;
  if (aiResponse.includes('I don\'t know') || aiResponse.includes('I can\'t help')) confidence -= 0.3;
  
  // Increase confidence if response is detailed and specific
  if (aiResponse.length > 100) confidence += 0.1;
  if (aiResponse.includes(userMessage.slice(0, 20))) confidence += 0.1;
  
  return Math.max(0.1, Math.min(1.0, confidence));
}

function generateSuggestedActions(userMessage: string, _aiResponse: string): string[] {
  const actions = [];
  
  // Analyze message content to suggest relevant actions
  const lowerMessage = userMessage.toLowerCase();
  
  if (lowerMessage.includes('payment') || lowerMessage.includes('billing')) {
    actions.push('Check billing information', 'Contact billing support');
  } else if (lowerMessage.includes('account') || lowerMessage.includes('login')) {
    actions.push('Reset password', 'Check account settings');
  } else if (lowerMessage.includes('bug') || lowerMessage.includes('error')) {
    actions.push('Report a bug', 'View troubleshooting guide');
  } else if (lowerMessage.includes('feature') || lowerMessage.includes('request')) {
    actions.push('Submit feature request', 'View roadmap');
  } else {
    actions.push('Browse help center', 'Schedule a call');
  }
  
  // Always add option to connect with human
  actions.push('Connect with human agent');
  
  return actions.slice(0, 3); // Limit to 3 suggestions
}

// Function to check if user wants to speak with human agent
export function shouldTransferToHuman(message: string): boolean {
  const transferKeywords = [
    'human', 'agent', 'person', 'speak to someone', 'talk to someone',
    'representative', 'escalate', 'manager', 'supervisor', 'real person'
  ];
  
  const lowerMessage = message.toLowerCase();
  return transferKeywords.some(keyword => lowerMessage.includes(keyword));
}

// Function to detect urgent/high priority messages
export function detectUrgency(message: string): 'low' | 'medium' | 'high' {
  const urgentKeywords = ['urgent', 'emergency', 'asap', 'immediately', 'critical', 'broken', 'down'];
  const mediumKeywords = ['issue', 'problem', 'trouble', 'help', 'stuck', 'error'];
  
  const lowerMessage = message.toLowerCase();
  
  if (urgentKeywords.some(keyword => lowerMessage.includes(keyword))) {
    return 'high';
  } else if (mediumKeywords.some(keyword => lowerMessage.includes(keyword))) {
    return 'medium';
  }
  
  return 'low';
} 