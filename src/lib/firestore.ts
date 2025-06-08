import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit,
  serverTimestamp,
  onSnapshot
} from 'firebase/firestore';
import { db } from './firebase';
import { Conversation, Message, User, Business } from '@/types';

// User Management
export async function createUser(userId: string, userData: Partial<User>) {
  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      ...userData,
      updatedAt: serverTimestamp()
    });
    return userRef;
  } catch (error) {
    console.error('Error creating user:', error);
    throw error;
  }
}

export async function getUser(userId: string): Promise<User | null> {
  try {
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists()) {
      const data = userSnap.data();
      return {
        id: userSnap.id,
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
      } as User;
    }
    return null;
  } catch (error) {
    console.error('Error getting user:', error);
    throw error;
  }
}

// Business Management
export async function createBusiness(businessData: Partial<Business>) {
  try {
    const businessRef = await addDoc(collection(db, 'businesses'), {
      ...businessData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return businessRef;
  } catch (error) {
    console.error('Error creating business:', error);
    throw error;
  }
}

export async function getBusiness(businessId: string): Promise<Business | null> {
  try {
    const businessRef = doc(db, 'businesses', businessId);
    const businessSnap = await getDoc(businessRef);
    
    if (businessSnap.exists()) {
      const data = businessSnap.data();
      return {
        id: businessSnap.id,
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
      } as Business;
    }
    return null;
  } catch (error) {
    console.error('Error getting business:', error);
    throw error;
  }
}

// Conversation Management
export async function createConversation(conversationData: Partial<Conversation>) {
  try {
    const conversationRef = await addDoc(collection(db, 'conversations'), {
      ...conversationData,
      status: 'open',
      priority: 'medium',
      tags: [],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      lastMessageAt: serverTimestamp()
    });
    return conversationRef;
  } catch (error) {
    console.error('Error creating conversation:', error);
    throw error;
  }
}

export async function getConversation(conversationId: string): Promise<Conversation | null> {
  try {
    const conversationRef = doc(db, 'conversations', conversationId);
    const conversationSnap = await getDoc(conversationRef);
    
    if (conversationSnap.exists()) {
      const data = conversationSnap.data();
      return {
        id: conversationSnap.id,
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
        lastMessageAt: data.lastMessageAt?.toDate() || new Date(),
      } as Conversation;
    }
    return null;
  } catch (error) {
    console.error('Error getting conversation:', error);
    throw error;
  }
}

export async function getConversationsByBusiness(businessId: string, limitCount: number = 50) {
  try {
    const conversationsRef = collection(db, 'conversations');
    const q = query(
      conversationsRef,
      where('businessId', '==', businessId),
      orderBy('lastMessageAt', 'desc'),
      limit(limitCount)
    );
    
    const querySnapshot = await getDocs(q);
    const conversations: Conversation[] = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      conversations.push({
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
        lastMessageAt: data.lastMessageAt?.toDate() || new Date(),
      } as Conversation);
    });
    
    return conversations;
  } catch (error) {
    console.error('Error getting conversations:', error);
    throw error;
  }
}

export async function updateConversation(conversationId: string, updates: Partial<Conversation>) {
  try {
    const conversationRef = doc(db, 'conversations', conversationId);
    await updateDoc(conversationRef, {
      ...updates,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error updating conversation:', error);
    throw error;
  }
}

// Message Management
export async function addMessage(conversationId: string, messageData: Partial<Message>) {
  try {
    const messagesRef = collection(db, 'conversations', conversationId, 'messages');
    const messageRef = await addDoc(messagesRef, {
      ...messageData,
      createdAt: serverTimestamp()
    });
    
    // Update conversation's lastMessageAt
    const conversationRef = doc(db, 'conversations', conversationId);
    await updateDoc(conversationRef, {
      lastMessageAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    
    return messageRef;
  } catch (error) {
    console.error('Error adding message:', error);
    throw error;
  }
}

export async function getMessages(conversationId: string, limitCount: number = 50) {
  try {
    const messagesRef = collection(db, 'conversations', conversationId, 'messages');
    const q = query(
      messagesRef,
      orderBy('createdAt', 'asc'),
      limit(limitCount)
    );
    
    const querySnapshot = await getDocs(q);
    const messages: Message[] = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      messages.push({
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
      } as Message);
    });
    
    return messages;
  } catch (error) {
    console.error('Error getting messages:', error);
    throw error;
  }
}

// Real-time listeners
export function subscribeToConversation(conversationId: string, callback: (conversation: Conversation) => void) {
  const conversationRef = doc(db, 'conversations', conversationId);
  
  return onSnapshot(conversationRef, (doc) => {
    if (doc.exists()) {
      const data = doc.data();
      const conversation: Conversation = {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
        lastMessageAt: data.lastMessageAt?.toDate() || new Date(),
      } as Conversation;
      callback(conversation);
    }
  });
}

export function subscribeToMessages(conversationId: string, callback: (messages: Message[]) => void) {
  const messagesRef = collection(db, 'conversations', conversationId, 'messages');
  const q = query(messagesRef, orderBy('createdAt', 'asc'));
  
  return onSnapshot(q, (querySnapshot) => {
    const messages: Message[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      messages.push({
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
      } as Message);
    });
    callback(messages);
  });
}

export function subscribeToBusinessConversations(businessId: string, callback: (conversations: Conversation[]) => void) {
  const conversationsRef = collection(db, 'conversations');
  const q = query(
    conversationsRef,
    where('businessId', '==', businessId),
    orderBy('lastMessageAt', 'desc')
  );
  
  return onSnapshot(q, (querySnapshot) => {
    const conversations: Conversation[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      conversations.push({
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
        lastMessageAt: data.lastMessageAt?.toDate() || new Date(),
      } as Conversation);
    });
    callback(conversations);
  });
}

// Analytics Functions
export async function getConversationStats(businessId: string) {
  try {
    const conversationsRef = collection(db, 'conversations');
    const q = query(conversationsRef, where('businessId', '==', businessId));
    const querySnapshot = await getDocs(q);
    
    let totalConversations = 0;
    let openConversations = 0;
    let closedConversations = 0;
    let pendingConversations = 0;
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      totalConversations++;
      
      switch (data.status) {
        case 'open':
          openConversations++;
          break;
        case 'closed':
          closedConversations++;
          break;
        case 'pending':
          pendingConversations++;
          break;
      }
    });
    
    return {
      total: totalConversations,
      open: openConversations,
      closed: closedConversations,
      pending: pendingConversations,
      resolutionRate: totalConversations > 0 ? (closedConversations / totalConversations) * 100 : 0
    };
  } catch (error) {
    console.error('Error getting conversation stats:', error);
    throw error;
  }
} 