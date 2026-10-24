/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface GiftDetectivePreferences {
  recipient?: string;
  occasion?: string;
  budget?: number | null;
  budgetMode: 'TOTAL' | 'PRODUCT';
  interests: string[];
  additionalPreferences: Record<string, any>;
  step: 'RECIPIENT' | 'OCCASION' | 'BUDGET' | 'INTERESTS' | 'PREFERENCES' | 'RECOMMEND' | 'COMPLETE';
}

export interface RecommendationItem {
  id: string;
  productName: string;
  category: string;
  description: string;
  price: number;
  stock: number;
  images: string[];
  sellerId: string;
  sellerName: string;
  pickupAvailable: boolean;
  deliveryAvailable: boolean;
  rating: number;
  totalReviews: number;
  customizable: boolean;
  score: number;
  reasons: string[];
  fitsDirectBudget: boolean;
  fitsWithFulfillment: boolean;
}

export interface CuratedBundle {
  title: string;
  items: RecommendationItem[];
  subtotal: number;
  packaging: number;
  delivery: number;
  finalTotal: number;
  remaining: number;
  multiSeller: boolean;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  createdAt: string;
  recommendations?: RecommendationItem[];
  bundle?: CuratedBundle | null;
  quickReplies?: string[];
}

export interface GiftBoxItem {
  product: RecommendationItem;
  quantity: number;
}

export interface ChatSession {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  activeTab: 'detective' | 'assistant';
  detectiveMessages: ChatMessage[];
  assistantMessages: ChatMessage[];
  preferences: GiftDetectivePreferences;
  giftBoxItems: GiftBoxItem[];
  packagingType: 'NONE' | 'ECO' | 'DELUXE';
  giftNote: string;
}

export const INITIAL_PREFERENCES: GiftDetectivePreferences = {
  budgetMode: 'TOTAL',
  interests: [],
  additionalPreferences: {},
  step: 'RECIPIENT'
};

export const INITIAL_DETECTIVE_MESSAGES: ChatMessage[] = [
  {
    id: 'welcome_init',
    sender: 'bot',
    text: "Not sure what to gift? Tell me a little about the person and your budget. I'll find thoughtful gifts from local Craffle creators.",
    createdAt: new Date().toISOString(),
    quickReplies: ['Best friend', 'Partner', 'Mother or father', 'Sibling', 'Child', 'Colleague']
  }
];

export const INITIAL_ASSISTANT_MESSAGES: ChatMessage[] = [
  {
    id: 'assistant_init',
    sender: 'bot',
    text: "Hi there! 👋 I'm your Craffle Assistant. I can help you with store questions, orders, and delivery guidelines. How can I help you today?",
    createdAt: new Date().toISOString(),
    quickReplies: [
      'How does delivery work?',
      'Can I pick up my order?',
      'Are products 100% handmade?',
      'Track my latest order',
      'What packaging options exist?'
    ]
  }
];

const STORAGE_PREFIX = 'craffle_chat_history_';
const ACTIVE_SESSION_PREFIX = 'craffle_active_session_';

function getStorageKey(userId?: string): string {
  const safeId = userId || 'guest';
  return `${STORAGE_PREFIX}${safeId}`;
}

function getActiveKey(userId?: string): string {
  const safeId = userId || 'guest';
  return `${ACTIVE_SESSION_PREFIX}${safeId}`;
}

/**
 * Retrieve all chat sessions for the user, sorted newest first
 */
export function getChatSessions(userId?: string): ChatSession[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(getStorageKey(userId));
    if (!raw) return [];
    const list: ChatSession[] = JSON.parse(raw);
    if (!Array.isArray(list)) return [];
    return list.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  } catch (err) {
    console.error('[ChatHistory] Error reading sessions:', err);
    return [];
  }
}

/**
 * Save a session (inserts or updates)
 */
export function saveChatSession(session: ChatSession, userId?: string): void {
  if (typeof window === 'undefined') return;
  try {
    const sessions = getChatSessions(userId);
    const existingIndex = sessions.findIndex(s => s.id === session.id);
    const updatedSession: ChatSession = {
      ...session,
      updatedAt: Date.now(),
      title: generateSessionTitle(session)
    };

    let updatedList: ChatSession[];
    if (existingIndex >= 0) {
      updatedList = [...sessions];
      updatedList[existingIndex] = updatedSession;
    } else {
      updatedList = [updatedSession, ...sessions];
    }

    // Keep max 30 sessions in local storage to prevent bloating
    if (updatedList.length > 30) {
      updatedList = updatedList.slice(0, 30);
    }

    localStorage.setItem(getStorageKey(userId), JSON.stringify(updatedList));
    localStorage.setItem(getActiveKey(userId), session.id);
  } catch (err) {
    console.error('[ChatHistory] Error saving session:', err);
  }
}

/**
 * Create a new, fresh chat session
 */
export function createNewChatSession(userId?: string): ChatSession {
  const newSession: ChatSession = {
    id: `session_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    title: 'New Gift Discovery',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    activeTab: 'detective',
    detectiveMessages: [...INITIAL_DETECTIVE_MESSAGES],
    assistantMessages: [...INITIAL_ASSISTANT_MESSAGES],
    preferences: { ...INITIAL_PREFERENCES },
    giftBoxItems: [],
    packagingType: 'ECO',
    giftNote: ''
  };

  saveChatSession(newSession, userId);
  return newSession;
}

/**
 * Get the currently active session or the newest one, or create new if empty
 */
export function getActiveChatSession(userId?: string): ChatSession {
  if (typeof window === 'undefined') {
    return createNewChatSession(userId);
  }
  const sessions = getChatSessions(userId);
  const activeId = localStorage.getItem(getActiveKey(userId));

  if (activeId) {
    const found = sessions.find(s => s.id === activeId);
    if (found) return found;
  }

  if (sessions.length > 0) {
    localStorage.setItem(getActiveKey(userId), sessions[0].id);
    return sessions[0];
  }

  return createNewChatSession(userId);
}

/**
 * Set active session ID
 */
export function setActiveSessionId(sessionId: string, userId?: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(getActiveKey(userId), sessionId);
}

/**
 * Delete a session by ID
 */
export function deleteChatSession(sessionId: string, userId?: string): ChatSession[] {
  if (typeof window === 'undefined') return [];
  try {
    const sessions = getChatSessions(userId).filter(s => s.id !== sessionId);
    localStorage.setItem(getStorageKey(userId), JSON.stringify(sessions));

    const activeId = localStorage.getItem(getActiveKey(userId));
    if (activeId === sessionId) {
      if (sessions.length > 0) {
        localStorage.setItem(getActiveKey(userId), sessions[0].id);
      } else {
        localStorage.removeItem(getActiveKey(userId));
      }
    }
    return sessions;
  } catch (err) {
    console.error('[ChatHistory] Error deleting session:', err);
    return [];
  }
}

/**
 * Generates an intuitive title for a chat session like ChatGPT
 */
function generateSessionTitle(session: ChatSession): string {
  if (session.activeTab === 'assistant') {
    const firstUserMsg = session.assistantMessages.find(m => m.sender === 'user');
    if (firstUserMsg) {
      return firstUserMsg.text.length > 32 ? `${firstUserMsg.text.slice(0, 32)}...` : firstUserMsg.text;
    }
    return 'Assistant Conversation';
  }

  const { recipient, occasion, budget, interests } = session.preferences;
  const parts: string[] = [];

  if (recipient) parts.push(`Gift for ${recipient}`);
  if (occasion) parts.push(occasion);
  if (budget) parts.push(`≤ ₹${budget}`);
  else if (interests.length > 0) parts.push(interests[0]);

  if (parts.length > 0) {
    return parts.join(' • ');
  }

  // Fallback to first user message
  const firstUserMsg = session.detectiveMessages.find(m => m.sender === 'user');
  if (firstUserMsg) {
    return firstUserMsg.text.length > 30 ? `${firstUserMsg.text.slice(0, 30)}...` : firstUserMsg.text;
  }

  return 'Gift Discovery';
}
