# 🚀 ChatSupport AI - Production-Ready Customer Service Platform

[![Next.js](https://img.shields.io/badge/Next.js-15.3.3-black)](https://nextjs.org/)
[![Firebase](https://img.shields.io/badge/Firebase-11.9.0-orange)](https://firebase.google.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.0-blue)](https://tailwindcss.com/)

A complete, production-ready AI-powered customer support platform like Intercom, featuring real-time chat, AI assistance, comprehensive analytics, and embeddable widgets for any website.

## 🌟 Live Platform

**Local Development URL**: [http://localhost:3000](http://localhost:3000)

## ✨ Features

### 🤖 AI-Powered Customer Support
- **Gemini AI Integration** - Intelligent responses with confidence scoring
- **Context-Aware Conversations** - AI remembers conversation history
- **Smart Human Handoffs** - Automatic escalation when AI confidence is low
- **Sentiment Analysis** - Real-time urgency and priority detection
- **Suggested Actions** - Dynamic response suggestions for customers

### 💬 Real-Time Communication
- **Live Chat Interface** - Instant messaging with typing indicators
- **Real-Time Dashboard** - Live conversation monitoring for agents
- **WebSocket Integration** - Real-time message sync across devices
- **Multi-Channel Support** - Website, email, phone, and social media
- **Cross-Platform Widget** - Embeddable on any website

### 📊 Advanced Analytics & Reporting
- **Real-Time Metrics** - Live conversation, response time, and satisfaction stats
- **Performance Analytics** - Agent performance tracking and KPIs
- **Interactive Charts** - Visual data representation with Recharts
- **Trend Analysis** - Historical data and pattern recognition
- **Custom Reports** - Exportable analytics and insights

### 🎛️ Agent Dashboard
- **Conversation Management** - Full conversation history and context
- **Agent Assignment** - Smart routing and workload distribution
- **Status Management** - Real-time conversation status updates
- **Customer Profiles** - Complete customer interaction history
- **Quick Actions** - Pre-defined responses and workflow automation

### 🔧 Business Management
- **Multi-Business Support** - Manage multiple customer accounts
- **User Roles & Permissions** - Admin, Agent, and Manager roles
- **Widget Customization** - Brandable colors, messages, and positioning
- **API Integration** - RESTful API for external integrations
- **Security & Compliance** - Enterprise-grade security features

## 🏗️ Architecture

### Tech Stack
- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, Node.js
- **Database**: Firebase Firestore (NoSQL, Real-time)
- **Authentication**: Firebase Auth (Email/Password, Google OAuth)
- **AI Service**: Google Gemini Pro API
- **Analytics**: Firebase Analytics, Custom dashboard
- **Hosting**: Vercel, Firebase Hosting, Cloudflare

### Core Components
- **ChatWidget** - Embeddable chat interface for websites
- **Dashboard** - Agent and admin control panel
- **Analytics Engine** - Real-time data processing and visualization
- **AI Service** - Gemini integration with context management
- **Real-time Sync** - Firebase real-time database listeners

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ (LTS recommended)
- Firebase Account & Project
- Google Cloud Account (for Gemini AI)
- Git

### 1. Clone & Install
```bash
git clone https://github.com/your-repo/chatsupport-ai.git
cd chatsupport-ai
npm install
```

### 2. Environment Setup
Create `.env.local`:
```env
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your_measurement_id

# Gemini AI Configuration
GEMINI_API_KEY=your_gemini_api_key
```

### 3. Firebase Setup
```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login to Firebase
firebase login

# Initialize project
firebase init

# Deploy Firestore rules
firebase deploy --only firestore
```

### 4. Development
```bash
# Start development server
npm run dev

# Build for production
npm run build

# Deploy to production
npm run deploy
```

## 📋 Production Deployment

### Option 1: Vercel (Recommended)
1. Connect your GitHub repository to Vercel
2. Add environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

### Option 2: Firebase Hosting
```bash
# Build the application
npm run build

# Deploy to Firebase
firebase deploy --only hosting
```

### Option 3: Docker
```bash
# Build Docker image
docker build -t chatsupport-ai .

# Run container
docker run -p 3000:3000 chatsupport-ai
```

## 🔧 Widget Integration

### Basic Integration
Add this code to any website to enable the chat widget:

```html
<script>
  (function() {
    var script = document.createElement('script');
    script.src = 'https://your-domain.com/widget.js';
    script.setAttribute('data-business-id', 'your-business-id');
    document.head.appendChild(script);
  })();
</script>
```

### Advanced Configuration
```html
<script>
  (function() {
    var script = document.createElement('script');
    script.src = 'https://your-domain.com/widget.js';
    script.setAttribute('data-business-id', 'your-business-id');
    script.setAttribute('data-primary-color', '#2563eb');
    script.setAttribute('data-welcome-message', 'Hi! How can we help you today?');
    script.setAttribute('data-position', 'bottom-right');
    script.setAttribute('data-ai-enabled', 'true');
    document.head.appendChild(script);
  })();
</script>
```

### Widget Options
| Attribute | Description | Default |
|-----------|-------------|---------|
| `data-business-id` | Your unique business identifier | Required |
| `data-primary-color` | Widget primary color (hex) | `#2563eb` |
| `data-accent-color` | Widget accent color (hex) | `#3b82f6` |
| `data-welcome-message` | Initial greeting message | `Hi! How can we help you today?` |
| `data-position` | Widget position on page | `bottom-right` |
| `data-enabled` | Enable/disable widget | `true` |
| `data-ai-enabled` | Enable AI responses | `true` |

## 📊 API Documentation

### Chat API
**Endpoint**: `POST /api/chat`

**Request Body**:
```json
{
  "message": "Customer message",
  "businessId": "your-business-id",
  "conversationId": "unique-conversation-id",
  "customerInfo": {
    "name": "Customer Name",
    "email": "customer@example.com"
  },
  "previousMessages": ["Previous message 1", "Previous message 2"]
}
```

**Response**:
```json
{
  "message": "AI response message",
  "confidence": 0.95,
  "urgency": "medium",
  "needsHuman": false,
  "suggestedActions": ["Action 1", "Action 2"],
  "metadata": {
    "responseTime": 1640995200000,
    "businessId": "your-business-id",
    "conversationId": "conversation-id"
  }
}
```

### Analytics API
**Endpoint**: `GET /api/analytics`

**Query Parameters**:
- `businessId` - Business identifier
- `timeRange` - Time range (today, week, month)
- `metrics` - Comma-separated list of metrics

## 🔒 Security Features

### Authentication & Authorization
- **Firebase Authentication** - Secure user management
- **Role-Based Access Control** - Admin, Agent, Manager roles
- **JWT Token Validation** - Secure API access
- **Session Management** - Automatic token refresh

### Data Protection
- **Firestore Security Rules** - Database-level access control
- **CORS Configuration** - Cross-origin request security
- **Input Validation** - XSS and injection prevention
- **Rate Limiting** - API abuse protection

### Privacy Compliance
- **GDPR Compliant** - Data protection and user rights
- **SOC 2 Ready** - Enterprise security standards
- **Data Encryption** - End-to-end encryption for sensitive data
- **Audit Logging** - Complete activity tracking

## 📈 Performance & Scalability

### Optimization Features
- **Static Site Generation** - Pre-rendered pages for speed
- **Code Splitting** - Lazy loading for optimal performance
- **Image Optimization** - Automatic image compression
- **CDN Distribution** - Global content delivery
- **Caching Strategy** - Multi-level caching implementation

### Monitoring & Analytics
- **Real-Time Monitoring** - Firebase Performance Monitoring
- **Error Tracking** - Automatic error reporting
- **Usage Analytics** - User behavior and engagement tracking
- **Performance Metrics** - Core Web Vitals monitoring

## 🛠️ Development

### Project Structure
```
src/
├── app/                    # Next.js App Router pages
│   ├── api/               # API routes
│   ├── auth/              # Authentication pages
│   ├── dashboard/         # Admin dashboard
│   └── auth/              # Authentication pages
├── components/            # React components
├── contexts/              # React contexts
├── lib/                   # Utility libraries
├── types/                 # TypeScript type definitions
└── styles/                # Global styles

public/
├── widget.js              # Embeddable widget script
└── assets/                # Static assets
```

### Key Files
- `src/components/ChatWidget.tsx` - Main chat widget component
- `src/app/api/chat/route.ts` - Chat API endpoint
- `src/lib/gemini.ts` - AI service integration
- `src/lib/firebase.ts` - Firebase configuration
- `public/widget.js` - Embeddable widget script

### Environment Variables
```env
# Required for production
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=
GEMINI_API_KEY=

# Optional
NEXT_PUBLIC_ANALYTICS_ID=
NEXT_PUBLIC_SENTRY_DSN=
```

## 🤝 Contributing

### Development Setup
```bash
# Fork the repository
git clone https://github.com/your-username/chatsupport-ai.git

# Create feature branch
git checkout -b feature/your-feature-name

# Make changes and commit
git commit -m "Add your feature"

# Push and create pull request
git push origin feature/your-feature-name
```

### Code Style
- **ESLint + Prettier** for code formatting
- **TypeScript** for type safety
- **Conventional Commits** for commit messages
- **Component-driven development** with Storybook

### Testing
```bash
# Run tests
npm test

# Run e2e tests
npm run test:e2e

# Run linting
npm run lint
```

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

### Documentation
- [API Documentation](docs/api.md)
- [Widget Integration Guide](docs/widget-integration.md)
- [Firebase Setup Guide](FIREBASE_SETUP.md)
- [Production Deployment Guide](PRODUCTION_DEPLOYMENT.md)

### Community
- [GitHub Discussions](https://github.com/your-repo/chatsupport-ai/discussions)
- [Discord Server](https://discord.gg/chatsupport-ai)
- [Stack Overflow](https://stackoverflow.com/questions/tagged/chatsupport-ai)

### Professional Support
- Email: support@chatsupport-ai.com
- Enterprise Support: enterprise@chatsupport-ai.com
- Phone: +1 (555) 123-4567

## 🎯 Roadmap

### Upcoming Features
- [ ] **Mobile Apps** - Native iOS and Android apps
- [ ] **Voice Support** - Voice calls and voice messages
- [ ] **Video Chat** - Integrated video calling
- [ ] **Chatbot Builder** - Visual chatbot flow designer
- [ ] **Advanced Analytics** - Machine learning insights
- [ ] **Integrations** - Slack, Teams, Zendesk, Salesforce
- [ ] **Multi-language** - International support
- [ ] **Automation** - Advanced workflow automation

### Version History
- **v1.0.0** - Initial production release
- **v0.9.0** - Beta release with core features
- **v0.8.0** - Alpha release for testing

---

**Made with ❤️ by the ChatSupport AI Team**

For more information, visit [https://chatsupport-ai.com](https://chatsupport-ai.com)
# horizonAI
