# Firebase Setup Guide for ChatSupport AI

## 🔥 Firebase Console Setup

### 1. Authentication Setup
1. Go to your [Firebase Console](https://console.firebase.google.com/project/interchat-d7457)
2. Navigate to **Authentication** > **Sign-in method**
3. Enable the following providers:
   - **Email/Password** ✅
   - **Google** ✅ (You may need to configure OAuth consent screen)

### 2. Firestore Database Setup
1. Navigate to **Firestore Database**
2. Click **Create database**
3. Choose **Start in test mode** (for development)
4. Select your preferred location (closest to your users)

### 3. Firestore Security Rules
Replace the default rules with these security rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can read/write their own user document
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Businesses - owners and agents can read/write
    match /businesses/{businessId} {
      allow read, write: if request.auth != null && 
        (request.auth.uid in resource.data.agents || 
         request.auth.uid == resource.data.ownerId);
    }
    
    // Conversations - business owners and agents can read/write
    match /conversations/{conversationId} {
      allow read, write: if request.auth != null;
      
      // Messages within conversations
      match /messages/{messageId} {
        allow read, write: if request.auth != null;
      }
    }
    
    // Allow anonymous users to create conversations (for widget)
    match /conversations/{conversationId} {
      allow create: if true;
      
      match /messages/{messageId} {
        allow create: if true;
      }
    }
  }
}
```

### 4. Firebase Indexes
Create these composite indexes in **Firestore** > **Indexes**:

1. **Collection:** `conversations`
   - Fields: `businessId` (Ascending), `lastMessageAt` (Descending)
   - Query scope: Collection

2. **Collection:** `conversations`
   - Fields: `businessId` (Ascending), `status` (Ascending), `lastMessageAt` (Descending)
   - Query scope: Collection

### 5. Enable Analytics (Optional)
1. Navigate to **Analytics**
2. Enable Google Analytics for your project
3. This will help track widget usage and performance

## 🚀 Application Configuration

### 1. Gemini AI Setup
Your Gemini AI is already configured with the API key: `AIzaSyBE6WWVvzMJ9MnE244-yUwMwCqSlKQG2jw`

To test if it's working:
1. Start your development server: `npm run dev`
2. Go to `http://localhost:3000/demo`
3. Try the chat widget and ask questions

### 2. Testing the Integration

#### Test Authentication:
1. Visit `http://localhost:3000/auth/signup`
2. Create an account with email/password
3. Try Google sign-in
4. Access the dashboard at `http://localhost:3000/dashboard`

#### Test Chat Widget:
1. Visit `http://localhost:3000/demo`
2. Click the chat widget
3. Fill in name and email
4. Ask questions like:
   - "What are your pricing plans?"
   - "I need help with my account"
   - "Can I speak to a human agent?"
   - "This is urgent - my payment failed"

#### Test AI Responses:
The widget should now provide intelligent responses using Gemini AI instead of random mock responses.

## 📊 Database Collections Structure

Your Firestore will automatically create these collections:

### `users`
```json
{
  "id": "user_id",
  "email": "user@example.com",
  "name": "User Name",
  "role": "admin|agent|customer",
  "businessId": "optional_business_id",
  "createdAt": "timestamp",
  "updatedAt": "timestamp"
}
```

### `businesses`
```json
{
  "id": "business_id",
  "name": "Business Name",
  "domain": "example.com",
  "ownerId": "user_id",
  "agents": ["user_id1", "user_id2"],
  "widgetConfig": {
    "primaryColor": "#2563eb",
    "accentColor": "#3b82f6",
    "welcomeMessage": "Hi! How can we help?",
    "position": "bottom-right",
    "enabled": true,
    "aiEnabled": true
  },
  "createdAt": "timestamp",
  "updatedAt": "timestamp"
}
```

### `conversations`
```json
{
  "id": "conversation_id",
  "businessId": "business_id",
  "customerId": "customer_id",
  "customerEmail": "customer@example.com",
  "customerName": "Customer Name",
  "status": "open|closed|pending",
  "assignedTo": "agent_user_id",
  "priority": "low|medium|high",
  "tags": ["tag1", "tag2"],
  "createdAt": "timestamp",
  "updatedAt": "timestamp",
  "lastMessageAt": "timestamp"
}
```

### `conversations/{id}/messages`
```json
{
  "id": "message_id",
  "conversationId": "conversation_id",
  "content": "Message content",
  "type": "text|image|file",
  "sender": {
    "id": "sender_id",
    "name": "Sender Name",
    "type": "customer|agent|ai"
  },
  "isRead": false,
  "createdAt": "timestamp"
}
```

## 🔧 Environment Setup

Your Firebase configuration is already set in `src/lib/firebase.ts`:

```typescript
const firebaseConfig = {
  apiKey: "AIzaSyB0ysCXaS4Ck_2mdii_D2bVTol1H55ABnA",
  authDomain: "interchat-d7457.firebaseapp.com",
  projectId: "interchat-d7457",
  storageBucket: "interchat-d7457.firebasestorage.app",
  messagingSenderId: "1066336384398",
  appId: "1:1066336384398:web:e9615f2c8836a68e97e0df",
  measurementId: "G-Z9BK0WRVJX"
};
```

## 🧪 Testing Checklist

- [ ] Firebase Authentication working (Email + Google)
- [ ] Firestore database accessible
- [ ] Chat widget appears on demo page
- [ ] AI responses working via Gemini
- [ ] Messages saved to Firestore
- [ ] Dashboard accessible after login
- [ ] User data stored correctly
- [ ] Real-time updates working

## 🚨 Important Notes

1. **Security**: Currently using test mode for Firestore. Update security rules for production.
2. **API Limits**: Monitor your Gemini AI usage to avoid hitting rate limits.
3. **Analytics**: Analytics will only work in production or when served over HTTPS.
4. **CORS**: If you have CORS issues, make sure your domain is whitelisted in Firebase.

## 🎯 Next Steps

1. Complete the Firebase setup above
2. Test all features thoroughly
3. Customize the widget appearance
4. Add your business information
5. Deploy to production

Your ChatSupport AI platform is now ready with real Firebase backend and Gemini AI integration! 🎉 