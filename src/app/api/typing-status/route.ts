import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';

// In-memory store for typing status (in production, use Redis or similar)
const typingStatus = new Map<string, {
  userId: string;
  userType: 'customer' | 'agent';
  userName: string;
  timestamp: number;
}>();

// Clean up old typing status (older than 5 seconds)
const cleanupOldStatus = () => {
  const now = Date.now();
  for (const [key, status] of typingStatus.entries()) {
    if (now - status.timestamp > 5000) {
      typingStatus.delete(key);
    }
  }
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { conversationId, userId, userType, userName, isTyping } = body;

    if (!conversationId || !userId || !userType || !userName) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const key = `${conversationId}_${userId}`;

    if (isTyping) {
      // User is typing - store/update status
      typingStatus.set(key, {
        userId,
        userType,
        userName,
        timestamp: Date.now()
      });
    } else {
      // User stopped typing - remove status
      typingStatus.delete(key);
    }

    // Clean up old statuses
    cleanupOldStatus();

    return NextResponse.json({ 
      success: true,
      message: `Typing status updated for ${userName}`
    });

  } catch (error) {
    console.error('Error updating typing status:', error);
    return NextResponse.json(
      { error: 'Failed to update typing status' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get('conversationId');
    const excludeUserId = searchParams.get('excludeUserId');

    if (!conversationId) {
      return NextResponse.json(
        { error: 'Missing conversationId' },
        { status: 400 }
      );
    }

    // Clean up old statuses first
    cleanupOldStatus();

    // Get typing users for this conversation (excluding the requesting user)
    const typingUsers = [];
    for (const [key, status] of typingStatus.entries()) {
      if (key.startsWith(conversationId) && status.userId !== excludeUserId) {
        typingUsers.push({
          userId: status.userId,
          userType: status.userType,
          userName: status.userName,
          timestamp: status.timestamp
        });
      }
    }

    return NextResponse.json({
      success: true,
      conversationId,
      typingUsers,
      count: typingUsers.length
    });

  } catch (error) {
    console.error('Error getting typing status:', error);
    return NextResponse.json(
      { error: 'Failed to get typing status' },
      { status: 500 }
    );
  }
} 