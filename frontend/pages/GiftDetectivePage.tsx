/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Gift, Sparkles, Send, RefreshCw, ShoppingBag,
  Plus, Minus, Trash2, Check, AlertTriangle, ExternalLink,
  Truck, ShieldCheck, Heart, Info, ArrowRight, X, SlidersHorizontal,
  Bot, MessageSquare, Package, Clock, History, Calendar
} from 'lucide-react';
import { Product, CartItem } from '@shared/types';
import {
  getChatSessions,
  getActiveChatSession,
  saveChatSession,
  createNewChatSession,
  deleteChatSession,
  setActiveSessionId,
  ChatSession,
  INITIAL_DETECTIVE_MESSAGES,
  INITIAL_ASSISTANT_MESSAGES,
  INITIAL_PREFERENCES
} from '../services/chatHistoryService';

interface GiftDetectivePageProps {
  user?: any;
  pageData?: any;
  onNavigate: (page: string, data?: any) => void;
  onSelectProduct?: (product: Product) => void;
  onAddToCart?: (product: Product, quantity?: number, fulfillmentMethod?: 'DELIVERY' | 'SELF_PICKUP', bypassCart?: boolean) => void;
  setCheckoutItems?: (items: CartItem[] | null) => void;
  showToast?: (message: string, type?: 'success' | 'error' | 'info') => void;
}

interface GiftDetectivePreferences {
  recipient?: string;
  occasion?: string;
  budget?: number | null;
  budgetMode: 'TOTAL' | 'PRODUCT';
  interests: string[];
  additionalPreferences: Record<string, any>;
  step: 'RECIPIENT' | 'OCCASION' | 'BUDGET' | 'INTERESTS' | 'PREFERENCES' | 'RECOMMEND' | 'COMPLETE';
}

interface RecommendationItem {
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

interface CuratedBundle {
  title: string;
  items: RecommendationItem[];
  subtotal: number;
  packaging: number;
  delivery: number;
  finalTotal: number;
  remaining: number;
  multiSeller: boolean;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  createdAt: string | Date;
  recommendations?: RecommendationItem[];
  bundle?: CuratedBundle | null;
  quickReplies?: string[];
}

interface GiftBoxItem {
  product: RecommendationItem;
  quantity: number;
}

interface ValidationPricing {
  subtotal: number;
  packagingCost: number;
  deliveryCost: number;
  total: number;
  budget: number | null;
  budgetMode: 'TOTAL' | 'PRODUCT';
  remainingBudget: number;
  budgetExceeded: boolean;
}

interface MultiSellerInfo {
  isMultiSeller: boolean;
  sellerCount: number;
  sellers: Array<{
    sellerId: string;
    sellerName: string;
    address?: string;
    phone?: string;
    itemsCount: number;
  }>;
}

const DEFAULT_FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=600&auto=format&fit=crop&q=80';

const GENERAL_SUGGESTIONS = [
  'How does Craffle work?',
  'What are self-pickup limits?',
  'How do I cancel my order?',
  'Where is my wishlist?'
];

/**
 * Format relative timestamps like ChatGPT
 */
function formatRelativeTime(timestamp: number): string {
  if (!timestamp) return 'Recent';
  const diff = Date.now() - timestamp;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
}

/**
 * Cleanly renders markdown **bold text** without raw asterisks
 */
function formatChatMessageText(text: string) {
  if (!text) return '';
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      const clean = part.slice(2, -2);
      return (
        <strong key={index} className="font-extrabold text-[#FF6B35]">
          {clean}
        </strong>
      );
    }
    return part;
  });
}

export default function GiftDetectivePage({
  user,
  pageData,
  onNavigate,
  onSelectProduct,
  onAddToCart,
  setCheckoutItems,
  showToast
}: GiftDetectivePageProps) {
  // Chat History & Session State
  const [sessions, setSessions] = useState<ChatSession[]>(() => getChatSessions(user?.id));
  const [currentSessionId, setCurrentSessionId] = useState<string>(() => {
    if (pageData?.sessionId) return pageData.sessionId;
    const active = getActiveChatSession(user?.id);
    return active.id;
  });
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  // Load initial session data
  const initialSession = getChatSessions(user?.id).find(s => s.id === (pageData?.sessionId || currentSessionId)) || getActiveChatSession(user?.id);

  const [activeTab, setActiveTab] = useState<'detective' | 'assistant'>(initialSession.activeTab || 'detective');
  const [preferences, setPreferences] = useState<GiftDetectivePreferences>(initialSession.preferences || INITIAL_PREFERENCES);
  const [detectiveMessages, setDetectiveMessages] = useState<ChatMessage[]>(
    initialSession.detectiveMessages && initialSession.detectiveMessages.length > 0
      ? initialSession.detectiveMessages
      : [...INITIAL_DETECTIVE_MESSAGES]
  );
  const [assistantMessages, setAssistantMessages] = useState<ChatMessage[]>(
    initialSession.assistantMessages && initialSession.assistantMessages.length > 0
      ? initialSession.assistantMessages
      : [...INITIAL_ASSISTANT_MESSAGES]
  );

  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  // Gift Box State
  const [giftBoxItems, setGiftBoxItems] = useState<GiftBoxItem[]>(initialSession.giftBoxItems || []);
  const [packagingType, setPackagingType] = useState<'NONE' | 'ECO' | 'DELUXE'>(initialSession.packagingType || 'ECO');
  const [giftNote, setGiftNote] = useState(initialSession.giftNote || '');
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [showCustomBudgetModal, setShowCustomBudgetModal] = useState(false);
  const [customBudgetInput, setCustomBudgetInput] = useState('');

  // Live Validation State
  const [validationPricing, setValidationPricing] = useState<ValidationPricing | null>(null);
  const [multiSellerInfo, setMultiSellerInfo] = useState<MultiSellerInfo | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load specific session
  const loadSession = useCallback((sessionId: string) => {
    const all = getChatSessions(user?.id);
    const target = all.find(s => s.id === sessionId);
    if (target) {
      setCurrentSessionId(target.id);
      setActiveTab(target.activeTab || 'detective');
      setPreferences(target.preferences || INITIAL_PREFERENCES);
      setDetectiveMessages(target.detectiveMessages && target.detectiveMessages.length > 0 ? target.detectiveMessages : [...INITIAL_DETECTIVE_MESSAGES]);
      setAssistantMessages(target.assistantMessages && target.assistantMessages.length > 0 ? target.assistantMessages : [...INITIAL_ASSISTANT_MESSAGES]);
      setGiftBoxItems(target.giftBoxItems || []);
      setPackagingType(target.packagingType || 'ECO');
      setGiftNote(target.giftNote || '');
      setActiveSessionId(target.id, user?.id);
      setIsHistoryOpen(false);
      showToast?.(`Switched to: ${target.title}`, 'info');
    }
  }, [user?.id, showToast]);

  // Sync with incoming pageData.sessionId
  useEffect(() => {
    if (pageData?.sessionId && pageData.sessionId !== currentSessionId) {
      loadSession(pageData.sessionId);
    }
  }, [pageData?.sessionId, currentSessionId, loadSession]);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [detectiveMessages, assistantMessages, isTyping, activeTab]);

  // Auto-save active session to localStorage history
  useEffect(() => {
    const hasActivity = detectiveMessages.some(m => m.sender === 'user') || assistantMessages.some(m => m.sender === 'user') || giftBoxItems.length > 0;
    if (!hasActivity) return;

    const sessionData: ChatSession = {
      id: currentSessionId,
      title: 'Gift Discovery',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      activeTab,
      detectiveMessages: detectiveMessages.map(m => ({
        id: m.id,
        sender: m.sender,
        text: m.text,
        createdAt: typeof m.createdAt === 'string' ? m.createdAt : (m.createdAt instanceof Date ? m.createdAt.toISOString() : new Date().toISOString()),
        recommendations: m.recommendations,
        bundle: m.bundle,
        quickReplies: m.quickReplies
      })),
      assistantMessages: assistantMessages.map(m => ({
        id: m.id,
        sender: m.sender,
        text: m.text,
        createdAt: typeof m.createdAt === 'string' ? m.createdAt : (m.createdAt instanceof Date ? m.createdAt.toISOString() : new Date().toISOString()),
        recommendations: m.recommendations,
        bundle: m.bundle,
        quickReplies: m.quickReplies
      })),
      preferences: preferences as any,
      giftBoxItems: giftBoxItems as any,
      packagingType,
      giftNote
    };

    saveChatSession(sessionData, user?.id);
    setSessions(getChatSessions(user?.id));
  }, [detectiveMessages, assistantMessages, preferences, giftBoxItems, packagingType, giftNote, activeTab, currentSessionId, user?.id]);

  // Validate Gift Box with backend whenever items or packaging changes
  const validateGiftBox = useCallback(async (
    currentItems: GiftBoxItem[],
    currentPackaging: 'NONE' | 'ECO' | 'DELUXE',
    currentBudget: number | null,
    currentBudgetMode: 'TOTAL' | 'PRODUCT'
  ) => {
    if (currentItems.length === 0) {
      setValidationPricing(null);
      setMultiSellerInfo(null);
      return;
    }

    try {
      const payload = {
        items: currentItems.map(item => ({
          productId: item.product.id,
          quantity: item.quantity
        })),
        packagingType: currentPackaging,
        budget: currentBudget,
        budgetMode: currentBudgetMode
      };

      const res = await fetch('/api/gift-box/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const data = await res.json();
        setValidationPricing(data.pricing);
        setMultiSellerInfo(data.multiSellerInfo);
      }
    } catch (err) {
      console.error('Failed to validate gift box:', err);
    }
  }, []);

  useEffect(() => {
    validateGiftBox(giftBoxItems, packagingType, preferences.budget, preferences.budgetMode);
  }, [giftBoxItems, packagingType, preferences.budget, preferences.budgetMode, validateGiftBox]);

  // Start new chat (like ChatGPT)
  const handleStartNewChat = () => {
    const fresh = createNewChatSession(user?.id);
    setSessions(getChatSessions(user?.id));
    setCurrentSessionId(fresh.id);
    setActiveTab('detective');
    setPreferences({ ...INITIAL_PREFERENCES });
    setDetectiveMessages([...INITIAL_DETECTIVE_MESSAGES]);
    setAssistantMessages([...INITIAL_ASSISTANT_MESSAGES]);
    setGiftBoxItems([]);
    setPackagingType('ECO');
    setGiftNote('');
    setInput('');
    setIsHistoryOpen(false);
    showToast?.('Started a new gift discovery session 🎁', 'info');
  };

  // Delete chat session
  const handleDeleteSession = (sessionIdToDelete: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = deleteChatSession(sessionIdToDelete, user?.id);
    setSessions(updated);
    if (sessionIdToDelete === currentSessionId) {
      if (updated.length > 0) {
        loadSession(updated[0].id);
      } else {
        handleStartNewChat();
      }
    }
    showToast?.('Conversation removed from history', 'info');
  };

  // ==========================================
  // SEND MESSAGE HANDLERS
  // ==========================================
  const handleSendDetectiveMessage = async (textToSend: string) => {
    if (!textToSend.trim() || isTyping) return;

    const userMessage: ChatMessage = {
      id: Math.random().toString(36).substring(2, 9),
      sender: 'user',
      text: textToSend,
      createdAt: new Date().toISOString()
    };

    setDetectiveMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    try {
      const res = await fetch('/api/gift-detective/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: textToSend,
          preferences,
          history: detectiveMessages.slice(1).map(m => ({ sender: m.sender, text: m.text }))
        })
      });

      if (res.ok) {
        const data = await res.json();

        if (data.preferences) {
          setPreferences(data.preferences);
        }

        const botMessage: ChatMessage = {
          id: Math.random().toString(36).substring(2, 9),
          sender: 'bot',
          text: data.reply || "I found some wonderful handcrafted gifts for you!",
          createdAt: new Date().toISOString(),
          recommendations: data.recommendations || [],
          bundle: data.bundle || null,
          quickReplies: data.quickReplies || []
        };

        setDetectiveMessages(prev => [...prev, botMessage]);
      } else {
        throw new Error('Server returned an error');
      }
    } catch {
      const errorMessage: ChatMessage = {
        id: Math.random().toString(36).substring(2, 9),
        sender: 'bot',
        text: "I couldn't reach the catalogue right now. Please tell me your budget and who you're shopping for, and I'll search again!",
        createdAt: new Date().toISOString(),
        quickReplies: ['Try again', 'Budget under ₹500', 'Gifts for best friend']
      };
      setDetectiveMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleSendAssistantMessage = async (textToSend: string) => {
    if (!textToSend.trim() || isTyping) return;

    const userMessage: ChatMessage = {
      id: Math.random().toString(36).substring(2, 9),
      sender: 'user',
      text: textToSend,
      createdAt: new Date().toISOString()
    };

    setAssistantMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    try {
      const res = await fetch('/api/gemini/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: textToSend,
          history: assistantMessages.slice(1).map(m => ({ sender: m.sender, text: m.text }))
        })
      });

      if (res.ok) {
        const data = await res.json();
        const botMessage: ChatMessage = {
          id: Math.random().toString(36).substring(2, 9),
          sender: 'bot',
          text: data.reply || "I'm here to help! Could you please clarify your question?",
          createdAt: new Date().toISOString(),
          quickReplies: GENERAL_SUGGESTIONS
        };
        setAssistantMessages(prev => [...prev, botMessage]);
      } else {
        throw new Error();
      }
    } catch {
      const errorMessage: ChatMessage = {
        id: Math.random().toString(36).substring(2, 9),
        sender: 'bot',
        text: 'Sorry, I am having trouble connecting right now. Please try again later!',
        createdAt: new Date().toISOString()
      };
      setAssistantMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  // ==========================================
  // GIFT BOX ACTIONS
  // ==========================================
  const handleAddToGiftBox = (rec: RecommendationItem, quantity: number = 1) => {
    setGiftBoxItems(prev => {
      const existing = prev.find(item => item.product.id === rec.id);
      if (existing) {
        const newQty = existing.quantity + quantity;
        if (newQty > rec.stock) {
          showToast?.(`Only ${rec.stock} units available in creator's stock`, 'error');
          return prev;
        }
        return prev.map(item =>
          item.product.id === rec.id ? { ...item, quantity: newQty } : item
        );
      }
      return [...prev, { product: rec, quantity: Math.min(quantity, rec.stock) }];
    });

    showToast?.(`Added "${rec.productName}" to your Gift Box 🎁`, 'success');
  };

  const handleAddBundleToGiftBox = (bundle: CuratedBundle) => {
    setGiftBoxItems(prev => {
      const newItems = [...prev];
      bundle.items.forEach(rec => {
        const existing = newItems.find(item => item.product.id === rec.id);
        if (existing) {
          if (existing.quantity + 1 <= rec.stock) {
            existing.quantity += 1;
          }
        } else {
          newItems.push({ product: rec, quantity: 1 });
        }
      });
      return newItems;
    });

    setPackagingType('ECO');
    showToast?.(`Curated Bundle added to your Gift Box! 🎁`, 'success');
  };

  const handleUpdateQuantity = (productId: string, delta: number) => {
    setGiftBoxItems(prev =>
      prev
        .map(item => {
          if (item.product.id === productId) {
            const nextQty = item.quantity + delta;
            if (nextQty <= 0) return null;
            if (nextQty > item.product.stock) {
              showToast?.(`Stock limit reached (${item.product.stock})`, 'info');
              return item;
            }
            return { ...item, quantity: nextQty };
          }
          return item;
        })
        .filter((item): item is GiftBoxItem => item !== null)
    );
  };

  const handleRemoveFromGiftBox = (productId: string) => {
    setGiftBoxItems(prev => prev.filter(item => item.product.id !== productId));
    showToast?.('Item removed from Gift Box', 'info');
  };

  const handleOpenProduct = (rec: RecommendationItem) => {
    const fullProduct: Product = {
      id: rec.id,
      sellerId: rec.sellerId,
      sellerName: rec.sellerName,
      name: rec.productName,
      price: rec.price,
      category: rec.category,
      description: rec.description,
      images: rec.images?.length ? rec.images : [DEFAULT_FALLBACK_IMAGE],
      pickupAvailable: rec.pickupAvailable,
      deliveryAvailable: rec.deliveryAvailable,
      stock: rec.stock,
      rating: rec.rating,
      totalReviews: rec.totalReviews,
      createdAt: new Date().toISOString()
    };
    onSelectProduct?.(fullProduct);
  };

  const handleAddAllToCart = () => {
    if (giftBoxItems.length === 0) return;
    giftBoxItems.forEach(item => {
      const fullProduct: Product = {
        id: item.product.id,
        sellerId: item.product.sellerId,
        sellerName: item.product.sellerName,
        name: item.product.productName,
        price: item.product.price,
        category: item.product.category,
        description: item.product.description,
        images: item.product.images?.length ? item.product.images : [DEFAULT_FALLBACK_IMAGE],
        pickupAvailable: item.product.pickupAvailable,
        deliveryAvailable: item.product.deliveryAvailable,
        stock: item.product.stock,
        rating: item.product.rating,
        totalReviews: item.product.totalReviews,
        createdAt: new Date().toISOString()
      };
      onAddToCart?.(fullProduct, item.quantity, 'DELIVERY');
    });
    showToast?.(`Added ${giftBoxItems.length} creations to your cart! 🛒`, 'success');
  };

  const handleProceedToCheckout = async () => {
    if (giftBoxItems.length === 0) return;
    setIsCheckingOut(true);

    try {
      const payload = {
        items: giftBoxItems.map(item => ({
          productId: item.product.id,
          quantity: item.quantity
        })),
        packagingType,
        giftNote,
        budget: preferences.budget,
        budgetMode: preferences.budgetMode
      };

      const res = await fetch('/api/gift-box/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to prepare gift box for checkout');
      }

      if (data.checkoutCartItems && data.checkoutCartItems.length > 0) {
        setCheckoutItems?.(data.checkoutCartItems);
        showToast?.('🎁 Handing over your curated Gift Box to Checkout!', 'success');
        onNavigate('checkout');
      } else {
        throw new Error('No items returned for checkout');
      }
    } catch (err: any) {
      showToast?.(err.message || 'Error initiating checkout', 'error');
    } finally {
      setIsCheckingOut(false);
    }
  };

  const giftBoxCount = giftBoxItems.reduce((acc, i) => acc + i.quantity, 0);
  const packagingCost = packagingType === 'DELUXE' ? 70 : packagingType === 'ECO' ? 40 : 0;
  const rawSubtotal = giftBoxItems.reduce((acc, i) => acc + i.product.price * i.quantity, 0);
  const estimatedDelivery = validationPricing?.deliveryCost ?? (rawSubtotal >= 500 || rawSubtotal === 0 ? 0 : 29);
  const estimatedTotal = validationPricing?.total ?? (rawSubtotal + packagingCost + estimatedDelivery);

  return (
    <div
      className="w-full px-6 lg:px-10 py-8 page-enter transition-colors duration-200"
      style={{ fontFamily: '"Outfit", system-ui, -apple-system, sans-serif' }}
    >
      {/* Top Header - Sized exactly like OrdersPage */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 pb-6 border-b border-[var(--border)]">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-orange-500/10 text-[#FF6B35] flex items-center justify-center shrink-0 shadow-xs border border-orange-500/20">
            <Gift className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-3xl lg:text-4xl font-extrabold text-[var(--text)] tracking-tight flex items-center gap-3">
              AI Gift Detective
              <span className="text-xs font-black bg-orange-500/15 text-[#FF6B35] px-3 py-1 rounded-full uppercase tracking-wider">
                Live Catalog
              </span>
            </h1>
            <p className="text-[15px] sm:text-[16px] text-[var(--text-secondary)] font-normal mt-1">
              Find thoughtful handcrafted gifts from local Craffle creators tailored to your budget
            </p>
          </div>
        </div>


      </div>

      {/* Main Content: 58% (col-7) & 42% (col-5) Two-Column Layout matching OrdersPage */}
      <div className="flex flex-col lg:grid lg:grid-cols-12 gap-8 items-start w-full">
        
        {/* ========================================================= */}
        {/* LEFT COLUMN: Chatbot Interface Stream (lg:col-span-7)     */}
        {/* ========================================================= */}
        <div className="w-full lg:col-span-7 bg-[var(--panel)] border border-[var(--border)] rounded-3xl shadow-sm flex flex-col h-[780px] overflow-hidden relative">
          
          {/* ChatGPT-style Chat History Drawer */}
          <AnimatePresence>
            {isHistoryOpen && (
              <motion.div
                initial={{ x: -340, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -340, opacity: 0 }}
                transition={{ type: 'spring', damping: 25, stiffness: 220 }}
                className="absolute inset-y-0 left-0 w-80 sm:w-88 z-30 bg-[var(--panel)] border-r border-[var(--border)] shadow-2xl flex flex-col backdrop-blur-xl"
              >
                {/* History Header */}
                <div className="p-4 border-b border-[var(--border)] bg-orange-500/[0.04] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <History className="w-4 h-4 text-[#FF6B35]" />
                    <h3 className="font-extrabold text-sm text-[var(--text)]">Chat History</h3>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-orange-500/10 text-[#FF6B35]">
                      {sessions.length}
                    </span>
                  </div>
                  <button
                    onClick={() => setIsHistoryOpen(false)}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* + Start New Chat Button */}
                <div className="p-3 border-b border-[var(--border)]">
                  <button
                    onClick={handleStartNewChat}
                    className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-[#FF6B35] to-[#FF8F5E] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs hover:shadow-md transition-all cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Start New Discovery Chat</span>
                  </button>
                </div>

                {/* History Session List */}
                <div className="flex-1 overflow-y-auto p-3 space-y-2 scrollbar-thin">
                  {sessions.length === 0 ? (
                    <div className="py-12 text-center text-xs text-slate-400">
                      No saved chats yet. Start chatting to build your gift history!
                    </div>
                  ) : (
                    sessions.map(s => {
                      const isActive = s.id === currentSessionId;
                      return (
                        <div
                          key={s.id}
                          onClick={() => loadSession(s.id)}
                          className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between group ${
                            isActive
                              ? 'border-[#FF6B35] bg-orange-500/10 shadow-xs'
                              : 'border-[var(--border)] hover:border-slate-300 dark:hover:border-slate-700 bg-[var(--bg-secondary)]'
                          }`}
                        >
                          <div className="min-w-0 flex-1 pr-2">
                            <div className="flex items-center gap-2 mb-1">
                              {s.activeTab === 'assistant' ? (
                                <Bot className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                              ) : (
                                <Gift className="w-3.5 h-3.5 text-[#FF6B35] shrink-0" />
                              )}
                              <h4 className={`text-xs font-bold truncate ${isActive ? 'text-[#FF6B35]' : 'text-[var(--text)]'}`}>
                                {s.title}
                              </h4>
                            </div>
                            <div className="flex items-center gap-2 text-[10px] text-slate-500">
                              <span>{formatRelativeTime(s.updatedAt || s.createdAt)}</span>
                              {s.giftBoxItems && s.giftBoxItems.length > 0 && (
                                <span className="px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-600 font-extrabold">
                                  🎁 {s.giftBoxItems.length} items
                                </span>
                              )}
                            </div>
                          </div>

                          <button
                            onClick={(e) => handleDeleteSession(s.id, e)}
                            className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-all cursor-pointer"
                            title="Delete conversation"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Chatbot Header Sub-Bar: Mode Tabs & History Toggles */}
          <div className="p-4 border-b border-[var(--border)] bg-orange-500/[0.03] space-y-3">
            {/* Mode Switcher Tabs + History button */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center p-1 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border)] max-w-xs flex-1">
                <button
                  onClick={() => setActiveTab('detective')}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    activeTab === 'detective'
                      ? 'bg-[var(--panel)] text-[#FF6B35] shadow-xs'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text)]'
                  }`}
                >
                  <Gift className="w-4 h-4" />
                  <span>Gift Detective 🎁</span>
                </button>
                <button
                  onClick={() => setActiveTab('assistant')}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    activeTab === 'assistant'
                      ? 'bg-[var(--panel)] text-[#FF6B35] shadow-xs'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text)]'
                  }`}
                >
                  <Bot className="w-4 h-4" />
                  <span>General Bot 💬</span>
                </button>
              </div>

              {/* History & New Chat inside Card Header */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsHistoryOpen(prev => !prev)}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    isHistoryOpen
                      ? 'bg-[#FF6B35]/15 border-[#FF6B35] text-[#FF6B35]'
                      : 'bg-[var(--bg-secondary)] border-[var(--border)] text-[var(--text-secondary)] hover:text-[#FF6B35]'
                  }`}
                  title="Toggle Saved Chats"
                >
                  <History className="w-3.5 h-3.5" />
                  <span>History ({sessions.length})</span>
                </button>

                <button
                  onClick={handleStartNewChat}
                  className="px-3 py-1.5 rounded-xl bg-orange-500/10 hover:bg-[#FF6B35] text-[#FF6B35] hover:text-white border border-orange-500/20 text-xs font-bold flex items-center gap-1 transition-all cursor-pointer"
                  title="New chat"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>New Chat</span>
                </button>
              </div>
            </div>

            {/* Active Preference Badges Bar */}
            {activeTab === 'detective' && (
              <div className="flex items-center justify-between text-xs pt-1">
                <div className="flex items-center gap-2 overflow-x-auto whitespace-nowrap scrollbar-none py-0.5">
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-300 mr-1 flex items-center gap-1">
                    <SlidersHorizontal className="w-3.5 h-3.5 text-[#FF6B35]" /> Filters:
                  </span>
                  {preferences.recipient ? (
                    <span className="px-3 py-1 bg-orange-500/10 text-[#FF6B35] border border-orange-500/25 rounded-lg font-extrabold flex items-center gap-1">
                      👤 {preferences.recipient}
                    </span>
                  ) : (
                    <span className="text-slate-400 italic">Recipient pending</span>
                  )}

                  {preferences.occasion && (
                    <span className="px-3 py-1 bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/25 rounded-lg font-extrabold">
                      🎉 {preferences.occasion}
                    </span>
                  )}

                  {preferences.budget && (
                    <span className="px-3 py-1 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25 rounded-lg font-extrabold">
                      💰 ≤ ₹{preferences.budget} ({preferences.budgetMode === 'TOTAL' ? 'Total' : 'Products'})
                    </span>
                  )}

                  {preferences.interests.length > 0 && (
                    <span className="px-3 py-1 bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/25 rounded-lg font-extrabold">
                      🎨 {preferences.interests.join(', ')}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Messages Scroll Area - Styled cleanly like the small chatbot */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4 scrollbar-thin">
            {(activeTab === 'detective' ? detectiveMessages : assistantMessages).map(msg => (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
              >
                {/* Message Bubble */}
                <div
                  className={`max-w-[85%] p-4 rounded-3xl text-[14.5px] leading-relaxed font-medium ${
                    msg.sender === 'user'
                      ? 'bg-gradient-to-tr from-[#FF6B35] to-[#FF8F5E] text-white rounded-tr-none shadow-md font-semibold'
                      : 'bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-tl-none shadow-sm'
                  }`}
                >
                  {formatChatMessageText(msg.text)}
                </div>

                {/* Curated Bundle Card */}
                {msg.bundle && msg.bundle.items && msg.bundle.items.length > 0 && (
                  <div className="w-full mt-4 p-5 rounded-3xl bg-gradient-to-br from-orange-500/10 via-amber-500/5 to-transparent border-2 border-orange-500/30 shadow-md">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-black text-[#FF6B35] flex items-center gap-2 uppercase tracking-wider">
                        <Sparkles className="w-4 h-4 fill-current" />
                        {msg.bundle.title || 'Curated Gift Box Bundle'}
                      </span>
                      <span className="text-sm font-black text-emerald-700 dark:text-emerald-300 bg-emerald-500/15 px-3 py-1 rounded-xl">
                        ₹{msg.bundle.finalTotal} Final Total
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                      {msg.bundle.items.map(item => (
                        <div
                          key={item.id}
                          className="flex items-center gap-3 p-2.5 rounded-2xl bg-[var(--panel)] border border-[var(--border)] shadow-xs"
                        >
                          <img
                            src={item.images?.[0] || DEFAULT_FALLBACK_IMAGE}
                            alt={item.productName}
                            className="w-12 h-12 rounded-xl object-cover border border-[var(--border)] flex-shrink-0"
                            onError={e => {
                              (e.currentTarget as HTMLImageElement).src = DEFAULT_FALLBACK_IMAGE;
                            }}
                          />
                          <div className="min-w-0 flex-1">
                            <h5 className="font-bold text-xs text-slate-900 dark:text-white truncate">
                              {item.productName}
                            </h5>
                            <p className="text-[11px] text-slate-500 truncate">
                              by {item.sellerName}
                            </p>
                            <span className="font-extrabold text-xs text-[#FF6B35]">
                              ₹{item.price}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Math Breakdown */}
                    <div className="p-3 rounded-2xl bg-[var(--panel)] border border-[var(--border)] text-xs text-slate-600 dark:text-slate-300 space-y-1 mb-4">
                      <div className="flex justify-between">
                        <span>Products Subtotal:</span>
                        <span className="font-bold text-slate-900 dark:text-white">₹{msg.bundle.subtotal}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Eco Gift Packaging:</span>
                        <span className="font-bold text-slate-900 dark:text-white">₹{msg.bundle.packaging}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Estimated Delivery:</span>
                        <span className="font-bold text-slate-900 dark:text-white">₹{msg.bundle.delivery}</span>
                      </div>
                      <div className="flex justify-between pt-1 border-t border-[var(--border)] font-black text-sm text-[#FF6B35]">
                        <span>Final Total (Verified within budget):</span>
                        <span>₹{msg.bundle.finalTotal}</span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleAddBundleToGiftBox(msg.bundle!)}
                      className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-[#FF6B35] to-[#FF8F5E] text-white text-sm font-black hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Gift className="w-4 h-4" />
                      Add Entire Bundle to Gift Box (₹{msg.bundle.finalTotal})
                    </button>
                  </div>
                )}

                {/* Product Recommendation Cards (Real MongoDB Products) */}
                {msg.recommendations && msg.recommendations.length > 0 && (
                  <div className="w-full mt-4 space-y-3">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      <span>Matching Handcrafted Creations ({msg.recommendations.length})</span>
                      <span className="text-emerald-700 dark:text-emerald-300 font-black">Live Stock Verified</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      {msg.recommendations.map(rec => (
                        <div
                          key={rec.id}
                          className="p-3.5 rounded-3xl bg-[var(--panel)] border-2 border-slate-200 dark:border-slate-800 hover:border-[#FF6B35]/50 transition-all shadow-xs flex flex-col justify-between group"
                        >
                          <div className="flex gap-3.5 mb-3">
                            <div className="w-20 h-20 rounded-2xl overflow-hidden bg-slate-100 flex-shrink-0 relative border border-slate-200 dark:border-slate-700">
                              <img
                                src={rec.images?.[0] || DEFAULT_FALLBACK_IMAGE}
                                alt={rec.productName}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                onError={e => {
                                  (e.currentTarget as HTMLImageElement).src = DEFAULT_FALLBACK_IMAGE;
                                }}
                              />
                              {rec.customizable && (
                                <span className="absolute bottom-1 left-1 text-[9.5px] font-black bg-purple-600 text-white px-1.5 py-0.5 rounded-md">
                                  Custom ✨
                                </span>
                              )}
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-1">
                                <h4 className="font-bold text-[14px] text-slate-900 dark:text-white line-clamp-1">
                                  {rec.productName}
                                </h4>
                              </div>
                              <span className="font-black text-base text-[#FF6B35] block mt-0.5">
                                ₹{rec.price}
                              </span>
                              <p className="text-xs font-medium text-slate-600 dark:text-slate-300 line-clamp-1">
                                by {rec.sellerName} • {rec.category}
                              </p>

                              <div className="flex flex-wrap gap-1 mt-1.5">
                                {rec.reasons?.slice(0, 2).map((reason, idx) => (
                                  <span
                                    key={idx}
                                    className="text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 px-1.5 py-0.5 rounded-md line-clamp-1"
                                  >
                                    ✓ {reason}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 pt-2 border-t border-[var(--border)]">
                            <button
                              onClick={() => handleAddToGiftBox(rec, 1)}
                              className="flex-1 py-2 rounded-xl bg-orange-500/10 hover:bg-[#FF6B35] text-[#FF6B35] hover:text-white text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                            >
                              <Gift className="w-3.5 h-3.5" />
                              Add to Gift Box
                            </button>
                            <button
                              onClick={() => handleOpenProduct(rec)}
                              className="p-2 rounded-xl border border-[var(--border)] hover:border-[#FF6B35] text-slate-500 hover:text-[#FF6B35] transition-colors cursor-pointer"
                              title="View Product Details"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}

            {isTyping && (
              <div className="flex items-center gap-2 p-3.5 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border)] max-w-xs text-xs font-bold text-slate-600 dark:text-slate-300">
                <Sparkles className="w-4 h-4 text-[#FF6B35] animate-spin" />
                <span>Searching local catalog & analyzing gifts...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Reply Chips Bar */}
          {(() => {
            const currentMessages = activeTab === 'detective' ? detectiveMessages : assistantMessages;
            const latestMsg = currentMessages[currentMessages.length - 1];
            const chips = latestMsg?.quickReplies || (activeTab === 'assistant' ? GENERAL_SUGGESTIONS : []);
            if (chips.length === 0) return null;

            return (
              <div className="px-5 py-2.5 flex items-center gap-2 overflow-x-auto whitespace-nowrap scrollbar-none border-t border-[var(--border)] bg-[var(--bg-secondary)]">
                {chips.map(chip => (
                  <button
                    key={chip}
                    onClick={() => {
                      if (chip === 'Custom budget' || chip === 'Custom Amount') {
                        setShowCustomBudgetModal(true);
                      } else if (activeTab === 'detective') {
                        handleSendDetectiveMessage(chip);
                      } else {
                        handleSendAssistantMessage(chip);
                      }
                    }}
                    className="px-4 py-2 bg-[var(--panel)] border-2 border-slate-300 dark:border-slate-700 hover:border-[#FF6B35] rounded-full text-xs font-black text-slate-800 dark:text-slate-200 hover:text-[#FF6B35] transition-all cursor-pointer shadow-xs flex-shrink-0"
                  >
                    {chip}
                  </button>
                ))}
                {activeTab === 'detective' && (
                  <button
                    onClick={() => setShowCustomBudgetModal(true)}
                    className="px-4 py-2 bg-orange-500/10 border-2 border-orange-500/30 rounded-full text-xs font-black text-[#FF6B35] hover:bg-[#FF6B35] hover:text-white transition-all cursor-pointer flex-shrink-0"
                  >
                    ₹ Set Custom Budget
                  </button>
                )}
              </div>
            );
          })()}

          {/* Message Input Box - Styled cleanly like the small chatbot */}
          <div className="p-4 border-t border-[var(--border)] bg-[var(--panel)]">
            <form
              onSubmit={e => {
                e.preventDefault();
                if (activeTab === 'detective') {
                  handleSendDetectiveMessage(input);
                } else {
                  handleSendAssistantMessage(input);
                }
              }}
              className="flex items-center gap-3"
            >
              <input
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder={
                  activeTab === 'detective'
                    ? "E.g. Birthday gift for best friend who loves art under ₹500..."
                    : "Ask Craffle Assistant a question..."
                }
                className="flex-1 px-4 py-3 bg-[var(--bg-secondary)] border-2 border-slate-300 dark:border-slate-700 rounded-2xl text-sm font-semibold text-slate-900 dark:text-white placeholder:text-slate-600 dark:placeholder:text-slate-300 placeholder:font-medium focus:outline-none focus:border-[#FF6B35] focus:bg-[var(--panel)] transition-all"
              />
              <button
                type="submit"
                disabled={!input.trim() || isTyping}
                className="p-3.5 rounded-2xl bg-gradient-to-tr from-[#FF6B35] to-[#FF8F5E] text-white disabled:opacity-40 disabled:cursor-not-allowed hover:scale-105 transition-transform shadow-sm cursor-pointer flex-shrink-0"
              >
                <Send className="w-5 h-5" />
              </button>
            </form>
          </div>
        </div>

        {/* ========================================================= */}
        {/* RIGHT COLUMN: Build Your Own Gift Box (lg:col-span-5)     */}
        {/* ========================================================= */}
        <div className="w-full lg:col-span-5 sticky top-24 bg-[var(--panel)] border border-[var(--border)] rounded-3xl shadow-sm flex flex-col h-[780px] overflow-hidden">
          
          {/* Box Header & Live Budget Meter */}
          <div className="p-5 border-b border-[var(--border)] bg-orange-500/[0.04]">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#FF6B35] text-white flex items-center justify-center shadow-xs">
                  <Gift className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-lg text-slate-900 dark:text-white">
                    Your Curated Gift Box
                  </h3>
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                    {giftBoxCount} {giftBoxCount === 1 ? 'item' : 'items'} selected
                  </span>
                </div>
              </div>

              {giftBoxItems.length > 0 && (
                <button
                  onClick={() => setGiftBoxItems([])}
                  className="text-xs font-bold text-red-500 hover:text-red-700 flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Clear
                </button>
              )}
            </div>

            {/* Budget Progress Bar */}
            {preferences.budget && (
              <div className="mt-3 p-3 rounded-2xl bg-[var(--panel)] border border-[var(--border)] space-y-1.5 shadow-xs">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-slate-700 dark:text-slate-200">
                    Budget: ₹{preferences.budget} ({preferences.budgetMode === 'TOTAL' ? 'Total' : 'Products'})
                  </span>
                  <span
                    className={`font-black ${
                      estimatedTotal > preferences.budget ? 'text-red-600' : 'text-emerald-700 dark:text-emerald-400'
                    }`}
                  >
                    {estimatedTotal > preferences.budget
                      ? `Exceeded by ₹${estimatedTotal - preferences.budget}`
                      : `₹${preferences.budget - estimatedTotal} remaining`}
                  </span>
                </div>

                <div className="w-full h-2.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${
                      estimatedTotal > preferences.budget ? 'bg-red-500' : 'bg-emerald-500'
                    }`}
                    style={{
                      width: `${Math.min(100, (estimatedTotal / preferences.budget) * 100)}%`
                    }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Box Contents Scrollable Area */}
          <div className="flex-1 overflow-y-auto p-5 space-y-5 scrollbar-thin">
            {giftBoxItems.length === 0 ? (
              <div className="py-16 text-center space-y-3">
                <div className="w-16 h-16 rounded-3xl bg-orange-500/10 text-[#FF6B35] flex items-center justify-center mx-auto">
                  <Gift className="w-8 h-8" />
                </div>
                <h4 className="font-bold text-base text-slate-800 dark:text-slate-200">
                  Your Gift Box is Empty
                </h4>
                <p className="text-xs font-medium text-slate-600 dark:text-slate-300 max-w-xs mx-auto">
                  Tell the Detective who you are shopping for and add creations with one click!
                </p>
              </div>
            ) : (
              <>
                {/* Items List */}
                <div className="space-y-3">
                  <span className="text-xs font-black text-slate-600 dark:text-slate-300 uppercase tracking-wider block">
                    Box Contents ({giftBoxItems.length})
                  </span>
                  {giftBoxItems.map(item => (
                    <div
                      key={item.product.id}
                      className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center gap-3.5 shadow-xs"
                    >
                      <img
                        src={item.product.images?.[0] || DEFAULT_FALLBACK_IMAGE}
                        alt={item.product.productName}
                        className="w-14 h-14 rounded-xl object-cover border border-slate-200 dark:border-slate-700 flex-shrink-0"
                        onError={e => {
                          (e.currentTarget as HTMLImageElement).src = DEFAULT_FALLBACK_IMAGE;
                        }}
                      />
                      <div className="flex-1 min-w-0">
                        <h5 className="font-bold text-xs text-slate-900 dark:text-white truncate">
                          {item.product.productName}
                        </h5>
                        <p className="text-[11px] font-medium text-slate-600 dark:text-slate-300 truncate">
                          by {item.product.sellerName}
                        </p>
                        <span className="font-black text-sm text-[#FF6B35]">
                          ₹{item.product.price}
                        </span>
                      </div>

                      {/* Quantity Controls */}
                      <div className="flex items-center gap-1.5 bg-[var(--panel)] p-1 rounded-xl border border-[var(--border)]">
                        <button
                          onClick={() => handleUpdateQuantity(item.product.id, -1)}
                          className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-white transition-colors cursor-pointer"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="text-xs font-black w-4 text-center text-slate-900 dark:text-white">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => handleUpdateQuantity(item.product.id, 1)}
                          className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-white transition-colors cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <button
                        onClick={() => handleRemoveFromGiftBox(item.product.id)}
                        className="p-1.5 text-slate-400 hover:text-red-500 transition-colors cursor-pointer"
                        title="Remove item"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Packaging Options */}
                <div className="space-y-2 pt-3 border-t border-[var(--border)]">
                  <span className="text-xs font-black text-slate-600 dark:text-slate-300 uppercase tracking-wider block">
                    Gift Packaging
                  </span>
                  <div className="space-y-2">
                    <label
                      className={`p-3 rounded-2xl border-2 flex items-center justify-between cursor-pointer transition-all ${
                        packagingType === 'ECO'
                          ? 'border-[#FF6B35] bg-orange-500/5 shadow-xs'
                          : 'border-slate-200 dark:border-slate-800 bg-[var(--bg-secondary)]'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <input
                          type="radio"
                          name="pagePackaging"
                          checked={packagingType === 'ECO'}
                          onChange={() => setPackagingType('ECO')}
                          className="accent-[#FF6B35] w-4 h-4"
                        />
                        <div>
                          <span className="text-xs font-black text-slate-900 dark:text-white block">
                            🌿 Eco Kraft Box & Jute Ribbon
                          </span>
                          <span className="text-[11px] text-slate-600 dark:text-slate-300">
                            Recycled earth-friendly gift wrapping
                          </span>
                        </div>
                      </div>
                      <span className="text-xs font-black text-[#FF6B35]">+₹40</span>
                    </label>

                    <label
                      className={`p-3 rounded-2xl border-2 flex items-center justify-between cursor-pointer transition-all ${
                        packagingType === 'DELUXE'
                          ? 'border-[#FF6B35] bg-orange-500/5 shadow-xs'
                          : 'border-slate-200 dark:border-slate-800 bg-[var(--bg-secondary)]'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <input
                          type="radio"
                          name="pagePackaging"
                          checked={packagingType === 'DELUXE'}
                          onChange={() => setPackagingType('DELUXE')}
                          className="accent-[#FF6B35] w-4 h-4"
                        />
                        <div>
                          <span className="text-xs font-black text-slate-900 dark:text-white block">
                            🎀 Deluxe Satin Box & Handwritten Card
                          </span>
                          <span className="text-[11px] text-slate-600 dark:text-slate-300">
                            Premium keepsake box with custom message
                          </span>
                        </div>
                      </div>
                      <span className="text-xs font-black text-[#FF6B35]">+₹70</span>
                    </label>

                    <label
                      className={`p-3 rounded-2xl border-2 flex items-center justify-between cursor-pointer transition-all ${
                        packagingType === 'NONE'
                          ? 'border-[#FF6B35] bg-orange-500/5 shadow-xs'
                          : 'border-slate-200 dark:border-slate-800 bg-[var(--bg-secondary)]'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <input
                          type="radio"
                          name="pagePackaging"
                          checked={packagingType === 'NONE'}
                          onChange={() => setPackagingType('NONE')}
                          className="accent-[#FF6B35] w-4 h-4"
                        />
                        <div>
                          <span className="text-xs font-black text-slate-900 dark:text-white block">
                            🏷️ Standard Packaging
                          </span>
                          <span className="text-[11px] text-slate-600 dark:text-slate-300">
                            Standard protective shipping box
                          </span>
                        </div>
                      </div>
                      <span className="text-xs font-black text-emerald-600">Free</span>
                    </label>
                  </div>
                </div>

                {/* Handwritten Message Card */}
                <div className="space-y-1.5 pt-3 border-t border-[var(--border)]">
                  <label className="text-xs font-black text-slate-600 dark:text-slate-300 uppercase tracking-wider block">
                    Handwritten Note for Recipient
                  </label>
                  <textarea
                    value={giftNote}
                    onChange={e => setGiftNote(e.target.value)}
                    placeholder="Write a heartfelt message to your recipient..."
                    rows={2}
                    className="w-full p-3 rounded-2xl bg-[var(--bg-secondary)] border-2 border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white placeholder:text-slate-500 focus:outline-none focus:border-[#FF6B35] transition-all resize-none"
                  />
                </div>

                {/* Multi-Seller Fulfillment Disclosure */}
                {multiSellerInfo && (
                  <div className="pt-3 border-t border-[var(--border)]">
                    {multiSellerInfo.isMultiSeller ? (
                      <div className="p-3.5 rounded-2xl bg-amber-500/10 border-2 border-amber-500/25 text-amber-900 dark:text-amber-200 text-xs space-y-1">
                        <div className="flex items-center gap-2 font-black">
                          <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                          <span>Multi-Seller Shipment Notice</span>
                        </div>
                        <p className="text-[11.5px] leading-relaxed">
                          Items are made by <strong>{multiSellerInfo.sellerCount} different local creators</strong> and will ship in separate packages. Delivery fees are accounted for per shipment.
                        </p>
                      </div>
                    ) : (
                      <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2 font-bold">
                        <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                        <span>All items ship together directly from {multiSellerInfo.sellers[0]?.sellerName || 'the same creator'}.</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Price Breakdown */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 space-y-2 text-xs">
                  <div className="flex justify-between text-slate-600 dark:text-slate-300">
                    <span>Creations Subtotal:</span>
                    <span className="font-bold text-slate-900 dark:text-white">₹{rawSubtotal}</span>
                  </div>
                  {packagingCost > 0 && (
                    <div className="flex justify-between text-slate-600 dark:text-slate-300">
                      <span>Gift Packaging:</span>
                      <span className="font-bold text-slate-900 dark:text-white">₹{packagingCost}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-slate-600 dark:text-slate-300">
                    <span>Estimated Delivery:</span>
                    <span className="font-bold text-slate-900 dark:text-white">
                      {estimatedDelivery === 0 ? 'FREE' : `₹${estimatedDelivery}`}
                    </span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-slate-200 dark:border-slate-700 text-base font-black text-slate-900 dark:text-white">
                    <span>Final Total:</span>
                    <span className="text-[#FF6B35]">₹{estimatedTotal}</span>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Bottom Checkout Actions (Fixed footer inside card) */}
          {giftBoxItems.length > 0 && (
            <div className="p-4 border-t border-[var(--border)] bg-[var(--panel)] space-y-2.5">
              <button
                onClick={handleProceedToCheckout}
                disabled={isCheckingOut || !!validationPricing?.budgetExceeded}
                className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-[#FF6B35] to-[#FF8F5E] text-white text-sm font-black shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                <ShoppingBag className="w-4 h-4" />
                {isCheckingOut
                  ? 'Verifying Real Inventory...'
                  : validationPricing?.budgetExceeded
                  ? 'Budget Exceeded (Adjust Items)'
                  : `Proceed to Checkout • ₹${estimatedTotal}`}
              </button>

              <button
                onClick={handleAddAllToCart}
                className="w-full py-2 rounded-2xl bg-[var(--bg-secondary)] border-2 border-slate-300 dark:border-slate-700 text-xs font-black text-slate-800 dark:text-slate-200 hover:text-[#FF6B35] transition-colors cursor-pointer"
              >
                Add Items to Craffle Cart
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Custom Budget Modal */}
      <AnimatePresence>
        {showCustomBudgetModal && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-sm rounded-3xl p-6 shadow-2xl border space-y-4"
              style={{ background: 'var(--panel)', borderColor: 'var(--border)' }}
            >
              <div className="flex items-center justify-between">
                <h3 className="font-black text-base text-[var(--text)] flex items-center gap-2">
                  <Gift className="w-5 h-5 text-[#FF6B35]" /> Set Custom Budget
                </h3>
                <button
                  onClick={() => setShowCustomBudgetModal(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Amount in INR (₹)</label>
                <input
                  type="number"
                  value={customBudgetInput}
                  onChange={e => setCustomBudgetInput(e.target.value)}
                  placeholder="E.g. 500"
                  className="w-full px-4 py-3 bg-[var(--bg-secondary)] border-2 border-slate-300 dark:border-slate-700 rounded-2xl text-base font-bold text-[var(--text)] focus:outline-none focus:border-[#FF6B35]"
                />
              </div>

              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">Budget Mode</span>
                <label className="flex items-center gap-2 text-xs font-semibold text-[var(--text)] cursor-pointer">
                  <input
                    type="radio"
                    name="modalBudgetMode"
                    checked={preferences.budgetMode === 'TOTAL'}
                    onChange={() => setPreferences(prev => ({ ...prev, budgetMode: 'TOTAL' }))}
                    className="accent-[#FF6B35]"
                  />
                  <span>Total Budget (includes delivery + packaging)</span>
                </label>
                <label className="flex items-center gap-2 text-xs font-semibold text-[var(--text)] cursor-pointer">
                  <input
                    type="radio"
                    name="modalBudgetMode"
                    checked={preferences.budgetMode === 'PRODUCT'}
                    onChange={() => setPreferences(prev => ({ ...prev, budgetMode: 'PRODUCT' }))}
                    className="accent-[#FF6B35]"
                  />
                  <span>Product Only Budget (delivery added separately)</span>
                </label>
              </div>

              <div className="flex items-center gap-2.5 pt-2">
                <button
                  onClick={() => setShowCustomBudgetModal(false)}
                  className="flex-1 py-2.5 rounded-2xl bg-[var(--bg-secondary)] text-xs font-bold text-[var(--text)] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    const parsed = parseInt(customBudgetInput, 10);
                    if (parsed && parsed > 0) {
                      setPreferences(prev => ({ ...prev, budget: parsed }));
                      handleSendDetectiveMessage(`My budget is ₹${parsed} ${preferences.budgetMode === 'TOTAL' ? 'including delivery' : 'for products'}`);
                      setShowCustomBudgetModal(false);
                      setCustomBudgetInput('');
                    } else {
                      showToast?.('Please enter a valid amount', 'error');
                    }
                  }}
                  className="flex-1 py-2.5 rounded-2xl bg-[#FF6B35] text-white text-xs font-black shadow hover:bg-[#e05825] cursor-pointer"
                >
                  Apply Budget
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
