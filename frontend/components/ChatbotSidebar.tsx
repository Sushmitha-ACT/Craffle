/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  MessageSquare, X, Send, Bot, Sparkles, AlertCircle,
  Gift, ShoppingBag, Plus, Minus, Trash2, ArrowRight,
  Truck, ShieldCheck, Heart, RefreshCw, Check, AlertTriangle,
  Info, ExternalLink, Package, Maximize2
} from 'lucide-react';
import { Product, CartItem } from '@shared/types';
import { saveChatSession, setActiveSessionId, ChatSession } from '../services/chatHistoryService';

/**
 * Format markdown **bold** without raw asterisks
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

interface ChatbotSidebarProps {
  onNavigate?: (page: string, data?: any) => void;
  onSelectProduct?: (product: Product) => void;
  onAddToCart?: (product: Product, quantity?: number, fulfillmentMethod?: 'DELIVERY' | 'SELF_PICKUP', bypassCart?: boolean) => void;
  setCheckoutItems?: (items: CartItem[] | null) => void;
  user?: any;
  token?: string | null;
  showToast?: (message: string, type?: 'success' | 'error' | 'info') => void;
}

interface GiftDetectivePreferences {
  recipient?: string;
  occasion?: string;
  budget?: number | null;
  budgetMode: 'TOTAL' | 'PRODUCT';
  interests: string[];
  additionalPreferences: Record<string, any>;
  step: 'RECIPIENT' | 'OCCASION' | 'BUDGET' | 'INTERESTS' | 'MORE' | 'RECOMMEND';
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
  createdAt: Date;
  recommendations?: RecommendationItem[];
  bundle?: CuratedBundle | null;
  quickReplies?: string[];
  stepContext?: string;
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

const GENERAL_SUGGESTIONS = [
  'How does Craffle work?',
  'What are self-pickup limits?',
  'How do I cancel my order?',
  'Where is my wishlist?'
];

const INITIAL_PREFERENCES: GiftDetectivePreferences = {
  recipient: undefined,
  occasion: undefined,
  budget: null,
  budgetMode: 'TOTAL',
  interests: [],
  additionalPreferences: {},
  step: 'RECIPIENT'
};

const DEFAULT_FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=600&auto=format&fit=crop&q=80';

export default function ChatbotSidebar({
  onNavigate,
  onSelectProduct,
  onAddToCart,
  setCheckoutItems,
  user,
  token,
  showToast
}: ChatbotSidebarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'detective' | 'assistant'>('detective');

  // Gift Detective State
  const [preferences, setPreferences] = useState<GiftDetectivePreferences>(INITIAL_PREFERENCES);
  const [detectiveMessages, setDetectiveMessages] = useState<ChatMessage[]>([
    {
      id: 'detective_welcome',
      sender: 'bot',
      text: "Not sure what to gift? Tell me a little about the person and your budget. I'll find thoughtful gifts from local Craffle creators.",
      createdAt: new Date(),
      quickReplies: ['Best friend', 'Partner', 'Mother or father', 'Sibling', 'Child', 'Colleague']
    }
  ]);

  // General Assistant Messages
  const [assistantMessages, setAssistantMessages] = useState<ChatMessage[]>([
    {
      id: 'assistant_welcome',
      sender: 'bot',
      text: "Hi there! 👋 I'm your Craffle Assistant. I can help you with store questions, orders, and delivery guidelines. How can I help you today?",
      createdAt: new Date(),
      quickReplies: GENERAL_SUGGESTIONS
    }
  ]);

  // Shared UI State
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isGiftBoxOpen, setIsGiftBoxOpen] = useState(false);

  // Gift Box State
  const [giftBoxItems, setGiftBoxItems] = useState<GiftBoxItem[]>([]);
  const [packagingType, setPackagingType] = useState<'NONE' | 'ECO' | 'DELUXE'>('ECO');
  const [giftNote, setGiftNote] = useState('');
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [customBudgetInput, setCustomBudgetInput] = useState('');
  const [showCustomBudgetModal, setShowCustomBudgetModal] = useState(false);

  // Live Validation State
  const [validationPricing, setValidationPricing] = useState<ValidationPricing | null>(null);
  const [multiSellerInfo, setMultiSellerInfo] = useState<MultiSellerInfo | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [validationWarnings, setValidationWarnings] = useState<string[]>([]);

  // Unique Chat Session ID for history synchronization
  const [sessionId, setSessionId] = useState<string>(() => `session_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [detectiveMessages, assistantMessages, isTyping, activeTab]);

  // Synchronize active chat to history whenever messages or gift box items update
  useEffect(() => {
    const hasActivity = detectiveMessages.some(m => m.sender === 'user') || assistantMessages.some(m => m.sender === 'user') || giftBoxItems.length > 0;
    if (!hasActivity) return;

    const sessionData: ChatSession = {
      id: sessionId,
      title: 'Gift Discovery',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      activeTab,
      detectiveMessages: detectiveMessages.map(m => ({
        id: m.id,
        sender: m.sender,
        text: m.text,
        createdAt: m.createdAt instanceof Date ? m.createdAt.toISOString() : String(m.createdAt),
        recommendations: m.recommendations,
        bundle: m.bundle,
        quickReplies: m.quickReplies
      })),
      assistantMessages: assistantMessages.map(m => ({
        id: m.id,
        sender: m.sender,
        text: m.text,
        createdAt: m.createdAt instanceof Date ? m.createdAt.toISOString() : String(m.createdAt),
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
  }, [detectiveMessages, assistantMessages, preferences, giftBoxItems, packagingType, giftNote, activeTab, sessionId, user?.id]);

  // Whenever the small chatbot is opened, automatically archive previous chat and start fresh
  const handleOpenSmallChatbot = () => {
    const hasActivity = detectiveMessages.some(m => m.sender === 'user') || assistantMessages.some(m => m.sender === 'user') || giftBoxItems.length > 0;
    if (hasActivity) {
      saveChatSession({
        id: sessionId,
        title: 'Gift Discovery',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        activeTab,
        detectiveMessages: detectiveMessages.map(m => ({
          id: m.id,
          sender: m.sender,
          text: m.text,
          createdAt: m.createdAt instanceof Date ? m.createdAt.toISOString() : String(m.createdAt),
          recommendations: m.recommendations,
          bundle: m.bundle,
          quickReplies: m.quickReplies
        })),
        assistantMessages: assistantMessages.map(m => ({
          id: m.id,
          sender: m.sender,
          text: m.text,
          createdAt: m.createdAt instanceof Date ? m.createdAt.toISOString() : String(m.createdAt),
          recommendations: m.recommendations,
          bundle: m.bundle,
          quickReplies: m.quickReplies
        })),
        preferences: preferences as any,
        giftBoxItems: giftBoxItems as any,
        packagingType,
        giftNote
      }, user?.id);

      // Start fresh new session
      const newId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      setSessionId(newId);
      setPreferences({ ...INITIAL_PREFERENCES });
      setDetectiveMessages([
        {
          id: 'detective_welcome_' + Date.now(),
          sender: 'bot',
          text: "Not sure what to gift? Tell me a little about the person and your budget. I'll find thoughtful gifts from local Craffle creators.",
          createdAt: new Date(),
          quickReplies: ['Best friend', 'Partner', 'Mother or father', 'Sibling', 'Child', 'Colleague']
        }
      ]);
      setAssistantMessages([
        {
          id: 'assistant_welcome_' + Date.now(),
          sender: 'bot',
          text: "Hi there! 👋 I'm your Craffle Assistant. I can help you with store questions, orders, and delivery guidelines. How can I help you today?",
          createdAt: new Date(),
          quickReplies: GENERAL_SUGGESTIONS
        }
      ]);
      setGiftBoxItems([]);
      setPackagingType('ECO');
      setGiftNote('');
      setInput('');
      setIsGiftBoxOpen(false);
    }
    setIsOpen(true);
  };

  // Seamlessly maximize the active chat and continue on the full Gift Detective page
  const handleMaximize = () => {
    const currentSession: ChatSession = {
      id: sessionId,
      title: 'Gift Discovery',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      activeTab,
      detectiveMessages: detectiveMessages.map(m => ({
        id: m.id,
        sender: m.sender,
        text: m.text,
        createdAt: m.createdAt instanceof Date ? m.createdAt.toISOString() : String(m.createdAt),
        recommendations: m.recommendations,
        bundle: m.bundle,
        quickReplies: m.quickReplies
      })),
      assistantMessages: assistantMessages.map(m => ({
        id: m.id,
        sender: m.sender,
        text: m.text,
        createdAt: m.createdAt instanceof Date ? m.createdAt.toISOString() : String(m.createdAt),
        recommendations: m.recommendations,
        bundle: m.bundle,
        quickReplies: m.quickReplies
      })),
      preferences: preferences as any,
      giftBoxItems: giftBoxItems as any,
      packagingType,
      giftNote
    };

    saveChatSession(currentSession, user?.id);
    setActiveSessionId(sessionId, user?.id);
    setIsOpen(false);
    onNavigate?.('gift-detective', { sessionId });
  };

  // Auto validate Gift Box whenever items, packaging, or budget changes
  const validateGiftBox = useCallback(async (
    currentItems: GiftBoxItem[],
    currentPackaging: 'NONE' | 'ECO' | 'DELUXE',
    currentBudget: number | null,
    currentBudgetMode: 'TOTAL' | 'PRODUCT'
  ) => {
    if (currentItems.length === 0) {
      setValidationPricing(null);
      setMultiSellerInfo(null);
      setValidationErrors([]);
      setValidationWarnings([]);
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
        setValidationErrors(data.errors || []);
        setValidationWarnings(data.warnings || []);
      }
    } catch (err) {
      console.error('Failed to validate gift box:', err);
    }
  }, []);

  useEffect(() => {
    validateGiftBox(giftBoxItems, packagingType, preferences.budget, preferences.budgetMode);
  }, [giftBoxItems, packagingType, preferences.budget, preferences.budgetMode, validateGiftBox]);

  // ==========================================
  // GIFT DETECTIVE MESSAGE HANDLER
  // ==========================================
  const handleSendDetectiveMessage = async (textToSend: string) => {
    if (!textToSend.trim() || isTyping) return;

    const userMessage: ChatMessage = {
      id: Math.random().toString(36).substring(2, 9),
      sender: 'user',
      text: textToSend,
      createdAt: new Date()
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

        // Update local session preferences
        if (data.preferences) {
          setPreferences(data.preferences);
        }

        const botMessage: ChatMessage = {
          id: Math.random().toString(36).substring(2, 9),
          sender: 'bot',
          text: data.reply || "I found some wonderful handcrafted gifts for you!",
          createdAt: new Date(),
          recommendations: data.recommendations || [],
          bundle: data.bundle || null,
          quickReplies: data.quickReplies || []
        };

        setDetectiveMessages(prev => [...prev, botMessage]);
      } else {
        throw new Error('Server returned an error');
      }
    } catch (error) {
      const errorMessage: ChatMessage = {
        id: Math.random().toString(36).substring(2, 9),
        sender: 'bot',
        text: "I couldn't reach the catalogue right now. Please tell me your budget and who you're shopping for, and I'll search again!",
        createdAt: new Date(),
        quickReplies: ['Try again', 'Budget under ₹500', 'Gifts for best friend']
      };
      setDetectiveMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  // ==========================================
  // GENERAL ASSISTANT MESSAGE HANDLER
  // ==========================================
  const handleSendAssistantMessage = async (textToSend: string) => {
    if (!textToSend.trim() || isTyping) return;

    const userMessage: ChatMessage = {
      id: Math.random().toString(36).substring(2, 9),
      sender: 'user',
      text: textToSend,
      createdAt: new Date()
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
          createdAt: new Date(),
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
        createdAt: new Date()
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
    setIsGiftBoxOpen(true);
    showToast?.(`Curated Bundle added to your Gift Box! 🎁`, 'success');
  };

  const handleUpdateGiftBoxQuantity = (productId: string, delta: number) => {
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

  const handleClearGiftBox = () => {
    setGiftBoxItems([]);
    setValidationPricing(null);
    showToast?.('Gift Box cleared', 'info');
  };

  const handleResetPreferences = () => {
    setPreferences(INITIAL_PREFERENCES);
    setDetectiveMessages([
      {
        id: 'detective_reset',
        sender: 'bot',
        text: "Let's start fresh! Who is the gift for? Tell me a little about the person and your budget.",
        createdAt: new Date(),
        quickReplies: ['Best friend', 'Partner', 'Mother or father', 'Sibling', 'Child', 'Colleague']
      }
    ]);
    showToast?.('Gift discovery restarted', 'info');
  };

  // ==========================================
  // VIEW PRODUCT DETAIL
  // ==========================================
  const handleOpenProductDetail = (rec: RecommendationItem) => {
    const fullProduct: Product = {
      id: rec.id,
      sellerId: rec.sellerId,
      sellerName: rec.sellerName,
      name: rec.productName,
      price: rec.price,
      category: rec.category,
      description: rec.description,
      images: rec.images && rec.images.length > 0 ? rec.images : [DEFAULT_FALLBACK_IMAGE],
      pickupAvailable: rec.pickupAvailable,
      deliveryAvailable: rec.deliveryAvailable,
      stock: rec.stock,
      rating: rec.rating,
      totalReviews: rec.totalReviews,
      createdAt: new Date().toISOString()
    };

    onSelectProduct?.(fullProduct);
  };

  // ==========================================
  // ADD GIFT BOX TO CART
  // ==========================================
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
        createdAt: new Date().toISOString()
      };
      onAddToCart?.(fullProduct, item.quantity, 'DELIVERY');
    });

    showToast?.(`All ${giftBoxItems.length} gift items added to your cart! 🛒`, 'success');
  };

  // ==========================================
  // PROCEED TO CHECKOUT
  // ==========================================
  const handleProceedToCheckout = async () => {
    if (giftBoxItems.length === 0) return;

    if (!user) {
      showToast?.('Please sign in to proceed with your Gift Box checkout', 'info');
      onNavigate?.('home');
      setIsOpen(false);
      return;
    }

    if (validationPricing?.budgetExceeded) {
      showToast?.(
        `Total (₹${validationPricing.total}) exceeds budget (₹${validationPricing.budget}). Remove an item or increase your budget.`,
        'error'
      );
      return;
    }

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

      if (!res.ok) {
        const errorData = await res.json();
        showToast?.(errorData.error || 'Failed to prepare Gift Box checkout', 'error');
        return;
      }

      const data = await res.json();

      const itemsToCheckout = data.checkoutItems || data.items;
      if (itemsToCheckout && itemsToCheckout.length > 0) {
        setCheckoutItems?.(itemsToCheckout);
        setIsGiftBoxOpen(false);
        setIsOpen(false);
        showToast?.('🎁 Handing over your curated Gift Box to Checkout!', 'success');
        onNavigate?.('checkout');
      } else {
        throw new Error('No items returned for checkout');
      }
    } catch (err: any) {
      showToast?.(err.message || 'Error initiating checkout', 'error');
    } finally {
      setIsCheckingOut(false);
    }
  };

  // Calculate live summary
  const giftBoxCount = giftBoxItems.reduce((acc, i) => acc + i.quantity, 0);
  const packagingCost = packagingType === 'DELUXE' ? 70 : packagingType === 'ECO' ? 40 : 0;
  const rawSubtotal = giftBoxItems.reduce((acc, i) => acc + i.product.price * i.quantity, 0);
  const estimatedDelivery = validationPricing?.deliveryCost ?? (rawSubtotal >= 500 || rawSubtotal === 0 ? 0 : 29);
  const estimatedTotal = validationPricing?.total ?? (rawSubtotal + packagingCost + estimatedDelivery);
  const remainingBudget = preferences.budget ? preferences.budget - estimatedTotal : null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {/* Floating Chat Bubble Button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.div className="relative">
            <motion.button
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleOpenSmallChatbot}
              className="w-14 h-14 rounded-full flex items-center justify-center text-white shadow-2xl relative cursor-pointer"
              style={{
                background: 'linear-gradient(135deg, #FF6B35 0%, #FF8F5E 100%)',
                boxShadow: '0 8px 30px rgba(255, 107, 53, 0.45)'
              }}
              title="Craffle AI Gift Detective"
            >
              <span className="absolute inset-0 rounded-full bg-[#FF6B35] animate-ping opacity-25 pointer-events-none" />
              <Gift className="w-6 h-6 animate-pulse" />
            </motion.button>

            {/* Floating Gift Box Badge Count */}
            {giftBoxCount > 0 && (
              <span className="absolute -top-1.5 -left-1.5 w-6 h-6 rounded-full bg-emerald-500 text-white text-[11px] font-black flex items-center justify-center shadow-lg border-2 border-white pointer-events-none">
                {giftBoxCount}
              </span>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Chatbot Sidebar Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ x: 420, opacity: 0, scale: 0.96 }}
            animate={{ x: 0, opacity: 1, scale: 1 }}
            exit={{ x: 420, opacity: 0, scale: 0.96 }}
            transition={{ type: 'spring', damping: 26, stiffness: 240 }}
            className="w-[370px] sm:w-[440px] md:w-[460px] h-[640px] max-h-[90vh] rounded-3xl overflow-hidden shadow-2xl border flex flex-col relative"
            style={{
              fontFamily: '"Outfit", system-ui, -apple-system, sans-serif',
              background: 'var(--panel)',
              backdropFilter: 'blur(24px)',
              borderColor: 'var(--border)',
              boxShadow: '0 24px 60px rgba(0, 0, 0, 0.3)'
            }}
          >
            {/* Header with Mode Tabs */}
            <div
              className="p-3.5 border-b flex flex-col gap-2.5"
              style={{
                borderColor: 'var(--border)',
                background: 'linear-gradient(135deg, rgba(255, 107, 53, 0.1) 0%, rgba(255, 143, 94, 0.04) 100%)'
              }}
            >
              {/* Top Row: Title, Gift Box Icon & Close */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#FF6B35] to-[#FF8F5E] flex items-center justify-center text-white shadow-sm">
                    {activeTab === 'detective' ? <Gift className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm text-[var(--text)] flex items-center gap-1.5">
                      {activeTab === 'detective' ? 'AI Gift Detective' : 'Craffle Bot'}
                      <span className="text-[10px] font-black bg-[#FF6B35]/15 text-[#FF6B35] px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                        Live Catalog
                      </span>
                    </h3>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  {/* Gift Box Drawer Toggle */}
                  <button
                    onClick={() => setIsGiftBoxOpen(prev => !prev)}
                    className={`px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                      giftBoxCount > 0
                        ? 'bg-[#FF6B35] text-white shadow-md hover:bg-[#e05825]'
                        : 'bg-[var(--bg-secondary)] text-[var(--text)] hover:text-[#FF6B35] border border-[var(--border)]'
                    }`}
                    title="View Curated Gift Box"
                  >
                    <Gift className="w-3.5 h-3.5" />
                    <span>Gift Box</span>
                    {giftBoxCount > 0 && (
                      <span className="bg-white text-[#FF6B35] font-black text-[10px] px-1.5 py-0.2 rounded-full">
                        {giftBoxCount}
                      </span>
                    )}
                  </button>

                  {/* Maximize to AI Chatbot Page Button */}
                  <button
                    onClick={handleMaximize}
                    className="p-1.5 rounded-lg hover:bg-[var(--bg-secondary)] transition-colors text-slate-500 hover:text-[#FF6B35] cursor-pointer"
                    title="Maximize to AI Chatbot Page"
                  >
                    <Maximize2 className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => setIsOpen(false)}
                    className="p-1.5 rounded-lg hover:bg-[var(--bg-secondary)] transition-colors text-slate-500 hover:text-red-500 cursor-pointer"
                    title="Close"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Mode Toggle Pills */}
              <div className="flex items-center p-1 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border)]">
                <button
                  onClick={() => {
                    setActiveTab('detective');
                    setIsGiftBoxOpen(false);
                  }}
                  className={`flex-1 py-1 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    activeTab === 'detective'
                      ? 'bg-[var(--panel)] text-[#FF6B35] shadow-sm'
                      : 'text-[var(--muted)] hover:text-[var(--text)]'
                  }`}
                >
                  <Gift className="w-3.5 h-3.5" />
                  Gift Detective 🎁
                </button>
                <button
                  onClick={() => {
                    setActiveTab('assistant');
                    setIsGiftBoxOpen(false);
                  }}
                  className={`flex-1 py-1 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    activeTab === 'assistant'
                      ? 'bg-[var(--panel)] text-[#FF6B35] shadow-sm'
                      : 'text-[var(--muted)] hover:text-[var(--text)]'
                  }`}
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  General Bot 💬
                </button>
              </div>

              {/* Gift Detective Context Pills Strip */}
              {activeTab === 'detective' && (
                <div className="flex items-center justify-between text-[11px] pt-0.5">
                  <div className="flex items-center gap-1 overflow-x-auto whitespace-nowrap scrollbar-none py-0.5">
                    {preferences.recipient && (
                      <span className="px-2 py-0.5 bg-orange-500/10 text-[#FF6B35] border border-orange-500/20 rounded-md font-bold">
                        👤 {preferences.recipient}
                      </span>
                    )}
                    {preferences.occasion && (
                      <span className="px-2 py-0.5 bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 rounded-md font-bold">
                        🎉 {preferences.occasion}
                      </span>
                    )}
                    {preferences.budget && (
                      <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 rounded-md font-bold">
                        💰 ≤ ₹{preferences.budget}
                      </span>
                    )}
                    {preferences.interests.length > 0 && (
                      <span className="px-2 py-0.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 rounded-md font-bold">
                        🎨 {preferences.interests[0]}
                      </span>
                    )}
                  </div>

                  {(preferences.recipient || preferences.budget || preferences.occasion) && (
                    <button
                      onClick={handleResetPreferences}
                      className="text-[10px] text-[var(--muted)] hover:text-[#FF6B35] flex items-center gap-1 flex-shrink-0 ml-1 font-bold cursor-pointer"
                      title="Reset preferences"
                    >
                      <RefreshCw className="w-2.5 h-2.5" /> Reset
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Chat Body & Messages View */}
            {!isGiftBoxOpen ? (
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* Scrollable Messages Stream */}
                <div className="flex-1 overflow-y-auto p-3.5 space-y-4 scrollbar-thin">
                  {(activeTab === 'detective' ? detectiveMessages : assistantMessages).map(msg => (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
                    >
                      {/* Message Bubble */}
                      <div
                        className={`max-w-[88%] p-3.5 rounded-2xl text-[14px] leading-relaxed ${
                          msg.sender === 'user'
                            ? 'bg-gradient-to-tr from-[#FF6B35] to-[#FF8F5E] text-white rounded-tr-none shadow-md font-semibold'
                            : 'bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-tl-none shadow-sm font-medium'
                        }`}
                      >
                        {formatChatMessageText(msg.text)}
                      </div>

                      {/* Curated Bundle Card (if provided by backend) */}
                      {msg.bundle && msg.bundle.items && msg.bundle.items.length > 0 && (
                        <div className="w-full mt-3 p-3.5 rounded-2xl bg-gradient-to-br from-orange-500/10 via-amber-500/5 to-transparent border border-orange-500/30 shadow-sm">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-black text-[#FF6B35] flex items-center gap-1.5 uppercase tracking-wider">
                              <Sparkles className="w-3.5 h-3.5 fill-current" />
                              {msg.bundle.title || 'Curated Gift Bundle'}
                            </span>
                            <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                              ₹{msg.bundle.finalTotal} Total
                            </span>
                          </div>

                          {/* Mini item list */}
                          <div className="space-y-1.5 mb-3">
                            {msg.bundle.items.map(item => (
                              <div
                                key={item.id}
                                className="flex items-center justify-between text-xs py-1 border-b border-[var(--border)]/50 last:border-none"
                              >
                                <div className="flex items-center gap-2 truncate">
                                  <img
                                    src={item.images?.[0] || DEFAULT_FALLBACK_IMAGE}
                                    alt={item.productName}
                                    className="w-7 h-7 rounded-lg object-cover border border-[var(--border)]"
                                    onError={e => {
                                      (e.currentTarget as HTMLImageElement).src = DEFAULT_FALLBACK_IMAGE;
                                    }}
                                  />
                                  <span className="truncate text-[var(--text)] font-medium">
                                    {item.productName}
                                  </span>
                                </div>
                                <span className="font-bold text-[var(--text)] flex-shrink-0 ml-2">
                                  ₹{item.price}
                                </span>
                              </div>
                            ))}
                          </div>

                          {/* Calculations breakdown */}
                          <div className="text-[11px] text-[var(--muted)] mb-3 bg-[var(--panel)]/70 p-2 rounded-xl border border-[var(--border)] space-y-0.5">
                            <div className="flex justify-between">
                              <span>Products Subtotal:</span>
                              <span className="font-semibold text-[var(--text)]">₹{msg.bundle.subtotal}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Eco Gift Packaging:</span>
                              <span className="font-semibold text-[var(--text)]">₹{msg.bundle.packaging}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Estimated Delivery:</span>
                              <span className="font-semibold text-[var(--text)]">₹{msg.bundle.delivery}</span>
                            </div>
                            <div className="flex justify-between pt-1 border-t border-[var(--border)] font-bold text-[#FF6B35]">
                              <span>Final Checkout Total:</span>
                              <span>₹{msg.bundle.finalTotal}</span>
                            </div>
                          </div>

                          <button
                            onClick={() => handleAddBundleToGiftBox(msg.bundle!)}
                            className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-[#FF6B35] to-[#FF8F5E] text-white text-xs font-bold hover:shadow-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <Gift className="w-3.5 h-3.5" />
                            Add Entire Bundle to Gift Box
                          </button>
                        </div>
                      )}

                      {/* Product Recommendation Cards (Real MongoDB Products) */}
                      {msg.recommendations && msg.recommendations.length > 0 && (
                        <div className="w-full mt-3 space-y-2.5">
                          <div className="text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider flex items-center justify-between">
                            <span>Recommended Handcrafted Gifts ({msg.recommendations.length})</span>
                            <span className="text-[10px] text-emerald-500 font-bold">Real Stock Verified</span>
                          </div>

                          {msg.recommendations.map(rec => (
                            <div
                              key={rec.id}
                              className="p-3 rounded-2xl bg-[var(--panel)] border border-[var(--border)] hover:border-[#FF6B35]/40 transition-all shadow-sm flex flex-col gap-2 group"
                            >
                              <div className="flex gap-3">
                                {/* Thumbnail */}
                                <div className="w-20 h-20 rounded-xl overflow-hidden bg-[var(--bg-secondary)] flex-shrink-0 relative border border-[var(--border)]">
                                  <img
                                    src={rec.images?.[0] || DEFAULT_FALLBACK_IMAGE}
                                    alt={rec.productName}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                    onError={e => {
                                      (e.currentTarget as HTMLImageElement).src = DEFAULT_FALLBACK_IMAGE;
                                    }}
                                  />
                                  {rec.customizable && (
                                    <span className="absolute bottom-1 left-1 text-[9px] font-extrabold bg-purple-600 text-white px-1 py-0.5 rounded">
                                      Custom ✨
                                    </span>
                                  )}
                                </div>

                                {/* Product Info */}
                                <div className="flex-1 min-w-0 flex flex-col justify-between">
                                  <div>
                                    <div className="flex items-start justify-between gap-1">
                                      <h4 className="font-bold text-[13.5px] text-slate-900 dark:text-white line-clamp-1">
                                        {rec.productName}
                                      </h4>
                                      <span className="font-black text-[15px] text-[#FF6B35] flex-shrink-0">
                                        ₹{rec.price}
                                      </span>
                                    </div>
                                    <p className="text-xs font-medium text-slate-600 dark:text-slate-300 line-clamp-1 mt-0.5">
                                      by {rec.sellerName || 'Local Artisan'} • {rec.category}
                                    </p>
                                  </div>

                                  {/* Match Reasons */}
                                  <div className="flex flex-wrap gap-1 mt-1.5">
                                    {rec.reasons?.slice(0, 2).map((reason, idx) => (
                                      <span
                                        key={idx}
                                        className="text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 px-1.5 py-0.5 rounded-md line-clamp-1"
                                      >
                                        ✓ {reason}
                                      </span>
                                    ))}
                                    {rec.rating > 0 && (
                                      <span className="text-[10px] font-bold bg-amber-500/10 text-amber-700 dark:text-amber-400 px-1.5 py-0.5 rounded-md">
                                        ★ {rec.rating} ({rec.totalReviews})
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Action Buttons */}
                              <div className="flex items-center gap-2 pt-2 border-t border-[var(--border)]">
                                <button
                                  onClick={() => handleOpenProductDetail(rec)}
                                  className="flex-1 py-2 px-2.5 rounded-xl bg-[var(--bg-secondary)] hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 hover:text-[#FF6B35] text-xs font-bold border border-[var(--border)] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                  View Product
                                </button>
                                <button
                                  onClick={() => handleAddToGiftBox(rec)}
                                  disabled={rec.stock <= 0}
                                  className="flex-1 py-2 px-2.5 rounded-xl bg-gradient-to-r from-[#FF6B35] to-[#FF8F5E] text-white text-xs font-black shadow hover:shadow-md transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                                >
                                  <Gift className="w-3.5 h-3.5" />
                                  {rec.stock > 0 ? 'Add to Box' : 'Out of Stock'}
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Typing Indicator */}
                  {isTyping && (
                    <div className="flex justify-start">
                      <div className="bg-[var(--bg-secondary)] border border-[var(--border)] p-3 rounded-2xl rounded-tl-none flex items-center gap-1.5 shadow-sm">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#FF6B35] animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-1.5 h-1.5 rounded-full bg-[#FF6B35] animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-1.5 h-1.5 rounded-full bg-[#FF6B35] animate-bounce" style={{ animationDelay: '300ms' }} />
                        <span className="text-[11px] text-[var(--muted)] ml-1 font-medium">Detective searching catalogue...</span>
                      </div>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>

                {/* Quick Reply Chips */}
                {(() => {
                  const currentMessages = activeTab === 'detective' ? detectiveMessages : assistantMessages;
                  const latestMsg = currentMessages[currentMessages.length - 1];
                  const chips = latestMsg?.quickReplies || (activeTab === 'assistant' ? GENERAL_SUGGESTIONS : []);

                  if (!chips || chips.length === 0) return null;

                  return (
                    <div className="px-3.5 py-2.5 flex items-center gap-2 overflow-x-auto whitespace-nowrap scrollbar-none border-t border-[var(--border)] bg-[var(--bg-secondary)]">
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
                          className="px-3.5 py-1.5 bg-[var(--panel)] border-2 border-slate-300 dark:border-slate-700 hover:border-[#FF6B35] rounded-full text-xs font-black text-slate-800 dark:text-slate-200 hover:text-[#FF6B35] transition-all cursor-pointer flex-shrink-0 shadow-sm"
                        >
                          {chip}
                        </button>
                      ))}

                      {activeTab === 'detective' && (
                        <button
                          onClick={() => setShowCustomBudgetModal(true)}
                          className="px-3.5 py-1.5 bg-orange-500/10 border-2 border-orange-500/30 rounded-full text-xs font-black text-[#FF6B35] hover:bg-[#FF6B35] hover:text-white transition-all cursor-pointer flex-shrink-0"
                        >
                          ₹ Custom Budget
                        </button>
                      )}
                    </div>
                  );
                })()}

                {/* Message Input Box */}
                <div className="p-3 border-t border-[var(--border)] bg-[var(--panel)]">
                  <form
                    onSubmit={e => {
                      e.preventDefault();
                      if (activeTab === 'detective') {
                        handleSendDetectiveMessage(input);
                      } else {
                        handleSendAssistantMessage(input);
                      }
                    }}
                    className="flex items-center gap-2"
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
                      className="flex-1 px-4 py-2.5 bg-[var(--bg-secondary)] border-2 border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white placeholder:text-slate-600 dark:placeholder:text-slate-300 placeholder:font-medium focus:outline-none focus:border-[#FF6B35] focus:bg-[var(--panel)] transition-all"
                    />
                    <button
                      type="submit"
                      disabled={!input.trim() || isTyping}
                      className="p-2.5 rounded-xl bg-gradient-to-tr from-[#FF6B35] to-[#FF8F5E] text-white disabled:opacity-40 disabled:cursor-not-allowed hover:scale-105 transition-transform shadow cursor-pointer"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </form>
                </div>
              </div>
            ) : (
              /* ======================================================== */
              /* BUILD YOUR OWN GIFT BOX BUILDER VIEW                     */
              /* ======================================================== */
              <div className="flex-1 flex flex-col overflow-hidden bg-[var(--panel)]">
                {/* Gift Box Header & Budget Progress */}
                <div className="p-3.5 border-b border-[var(--border)] bg-[var(--bg-secondary)]/50">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Gift className="w-5 h-5 text-[#FF6B35]" />
                      <h3 className="font-extrabold text-sm text-[var(--text)]">
                        Your Custom Gift Box ({giftBoxCount} {giftBoxCount === 1 ? 'item' : 'items'})
                      </h3>
                    </div>
                    {giftBoxItems.length > 0 && (
                      <button
                        onClick={handleClearGiftBox}
                        className="text-[11px] text-red-500 hover:underline font-bold cursor-pointer flex items-center gap-1"
                      >
                        <Trash2 className="w-3 h-3" /> Clear
                      </button>
                    )}
                  </div>

                  {/* Budget Tracker Progress Bar */}
                  {preferences.budget && (
                    <div className="space-y-1 mt-2 p-2 rounded-xl bg-[var(--panel)] border border-[var(--border)]">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-[var(--text)]">
                          Budget: ₹{preferences.budget} ({preferences.budgetMode === 'TOTAL' ? 'Total' : 'Products'})
                        </span>
                        <span
                          className={`font-black ${
                            estimatedTotal > preferences.budget
                              ? 'text-red-500'
                              : 'text-emerald-600 dark:text-emerald-400'
                          }`}
                        >
                          {estimatedTotal > preferences.budget
                            ? `Exceeded by ₹${estimatedTotal - preferences.budget}`
                            : `₹${preferences.budget - estimatedTotal} remaining`}
                        </span>
                      </div>

                      <div className="w-full h-2 rounded-full bg-[var(--bg-secondary)] overflow-hidden">
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

                {/* Gift Box Items List & Addons */}
                <div className="flex-1 overflow-y-auto p-3.5 space-y-4 scrollbar-thin">
                  {giftBoxItems.length === 0 ? (
                    <div className="py-12 text-center space-y-3">
                      <div className="w-14 h-14 rounded-2xl bg-orange-500/10 text-[#FF6B35] flex items-center justify-center mx-auto">
                        <Gift className="w-7 h-7" />
                      </div>
                      <h4 className="font-bold text-sm text-[var(--text)]">Your Gift Box is empty</h4>
                      <p className="text-xs text-[var(--muted)] max-w-xs mx-auto">
                        Chat with the Gift Detective to discover and add handcrafted creations from local makers!
                      </p>
                      <button
                        onClick={() => setIsGiftBoxOpen(false)}
                        className="py-2 px-4 rounded-xl bg-[#FF6B35] text-white text-xs font-bold shadow hover:bg-[#e05825] transition-all cursor-pointer"
                      >
                        Discover Gifts Now
                      </button>
                    </div>
                  ) : (
                    <>
                      {/* Products List */}
                      <div className="space-y-2.5">
                        <span className="text-xs font-bold text-[var(--muted)] uppercase tracking-wider block">
                          Selected Creations
                        </span>
                        {giftBoxItems.map(item => (
                          <div
                            key={item.product.id}
                            className="p-2.5 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border)] flex items-center gap-3 shadow-sm"
                          >
                            <img
                              src={item.product.images?.[0] || DEFAULT_FALLBACK_IMAGE}
                              alt={item.product.productName}
                              className="w-12 h-12 rounded-xl object-cover border border-[var(--border)] flex-shrink-0"
                              onError={e => {
                                (e.currentTarget as HTMLImageElement).src = DEFAULT_FALLBACK_IMAGE;
                              }}
                            />
                            <div className="flex-1 min-w-0">
                              <h5 className="font-bold text-xs text-[var(--text)] truncate">
                                {item.product.productName}
                              </h5>
                              <p className="text-[10px] text-[var(--muted)] truncate">
                                by {item.product.sellerName}
                              </p>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="font-black text-xs text-[#FF6B35]">
                                  ₹{item.product.price}
                                </span>
                                {item.product.customizable && (
                                  <span className="text-[9px] text-purple-600 bg-purple-500/10 font-bold px-1 rounded">
                                    Customizable ✨
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Quantity Controls */}
                            <div className="flex items-center gap-1.5 bg-[var(--panel)] p-1 rounded-xl border border-[var(--border)]">
                              <button
                                onClick={() => handleUpdateGiftBoxQuantity(item.product.id, -1)}
                                className="w-5 h-5 flex items-center justify-center rounded-lg hover:bg-[var(--bg-secondary)] text-[var(--text)] transition-colors cursor-pointer"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="text-xs font-black w-4 text-center text-[var(--text)]">
                                {item.quantity}
                              </span>
                              <button
                                onClick={() => handleUpdateGiftBoxQuantity(item.product.id, 1)}
                                className="w-5 h-5 flex items-center justify-center rounded-lg hover:bg-[var(--bg-secondary)] text-[var(--text)] transition-colors cursor-pointer"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>

                            <button
                              onClick={() => handleRemoveFromGiftBox(item.product.id)}
                              className="p-1.5 text-[var(--muted)] hover:text-red-500 transition-colors cursor-pointer"
                              title="Remove item"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>

                      {/* Packaging Selector */}
                      <div className="space-y-2 pt-2 border-t border-[var(--border)]">
                        <span className="text-xs font-bold text-[var(--muted)] uppercase tracking-wider block">
                          Gift Packaging Options
                        </span>
                        <div className="grid grid-cols-1 gap-2">
                          <label
                            className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                              packagingType === 'ECO'
                                ? 'border-[#FF6B35] bg-[#FF6B35]/5 shadow-sm'
                                : 'border-[var(--border)] bg-[var(--bg-secondary)]'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <input
                                type="radio"
                                name="packaging"
                                checked={packagingType === 'ECO'}
                                onChange={() => setPackagingType('ECO')}
                                className="accent-[#FF6B35]"
                              />
                              <div>
                                <span className="text-xs font-bold text-[var(--text)] block">
                                  🌿 Eco Kraft Gift Box & Jute Ribbon
                                </span>
                                <span className="text-[10px] text-[var(--muted)]">
                                  Recycled earth-friendly gift wrapping
                                </span>
                              </div>
                            </div>
                            <span className="text-xs font-black text-[#FF6B35]">+₹40</span>
                          </label>

                          <label
                            className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                              packagingType === 'DELUXE'
                                ? 'border-[#FF6B35] bg-[#FF6B35]/5 shadow-sm'
                                : 'border-[var(--border)] bg-[var(--bg-secondary)]'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <input
                                type="radio"
                                name="packaging"
                                checked={packagingType === 'DELUXE'}
                                onChange={() => setPackagingType('DELUXE')}
                                className="accent-[#FF6B35]"
                              />
                              <div>
                                <span className="text-xs font-bold text-[var(--text)] block">
                                  🎀 Deluxe Satin Box & Handwritten Card
                                </span>
                                <span className="text-[10px] text-[var(--muted)]">
                                  Premium keepsake box with custom message
                                </span>
                              </div>
                            </div>
                            <span className="text-xs font-black text-[#FF6B35]">+₹70</span>
                          </label>

                          <label
                            className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                              packagingType === 'NONE'
                                ? 'border-[#FF6B35] bg-[#FF6B35]/5 shadow-sm'
                                : 'border-[var(--border)] bg-[var(--bg-secondary)]'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <input
                                type="radio"
                                name="packaging"
                                checked={packagingType === 'NONE'}
                                onChange={() => setPackagingType('NONE')}
                                className="accent-[#FF6B35]"
                              />
                              <div>
                                <span className="text-xs font-bold text-[var(--text)] block">
                                  🏷️ Standard Creator Packaging
                                </span>
                                <span className="text-[10px] text-[var(--muted)]">
                                  Standard protective package
                                </span>
                              </div>
                            </div>
                            <span className="text-xs font-black text-emerald-600">Free</span>
                          </label>
                        </div>
                      </div>

                      {/* Handwritten Gift Note */}
                      <div className="space-y-1.5 pt-2 border-t border-[var(--border)]">
                        <label className="text-xs font-bold text-[var(--muted)] uppercase tracking-wider block">
                          Handwritten Gift Message
                        </label>
                        <textarea
                          value={giftNote}
                          onChange={e => setGiftNote(e.target.value)}
                          placeholder="Write a heartfelt message to your recipient (e.g. 'Happy Birthday! Wishing you all the happiness! 💖')..."
                          rows={2}
                          className="w-full p-2.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)] text-xs text-[var(--text)] placeholder-[var(--muted)] focus:outline-none focus:border-[#FF6B35] transition-all resize-none"
                        />
                      </div>

                      {/* Multi-Seller Delivery Compatibility Disclosure */}
                      {multiSellerInfo && (
                        <div className="pt-2 border-t border-[var(--border)]">
                          {multiSellerInfo.isMultiSeller ? (
                            <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 space-y-1 text-xs">
                              <div className="flex items-center gap-1.5 font-bold">
                                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                                <span>Multi-Seller Shipment Disclosure</span>
                              </div>
                              <p className="text-[11px] leading-relaxed">
                                Items are crafted by <strong>{multiSellerInfo.sellerCount} different local creators</strong> and will ship in separate packages. Delivery charges are calculated per shipment for complete transparency.
                              </p>
                            </div>
                          ) : (
                            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs flex items-center gap-2">
                              <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                              <span>All items ship together directly from <strong>{multiSellerInfo.sellers[0]?.sellerName || 'the same creator'}</strong>.</span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Price Breakdown */}
                      <div className="p-3.5 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border)] space-y-1.5 text-xs">
                        <div className="flex justify-between text-[var(--muted)]">
                          <span>Creations Subtotal:</span>
                          <span className="font-bold text-[var(--text)]">₹{rawSubtotal}</span>
                        </div>
                        {packagingCost > 0 && (
                          <div className="flex justify-between text-[var(--muted)]">
                            <span>Gift Packaging ({packagingType === 'ECO' ? 'Eco' : 'Deluxe'}):</span>
                            <span className="font-bold text-[var(--text)]">₹{packagingCost}</span>
                          </div>
                        )}
                        <div className="flex justify-between text-[var(--muted)]">
                          <span>Estimated Delivery:</span>
                          <span className="font-bold text-[var(--text)]">
                            {estimatedDelivery === 0 ? 'FREE' : `₹${estimatedDelivery}`}
                          </span>
                        </div>
                        <div className="flex justify-between pt-2 border-t border-[var(--border)] text-sm font-black text-[var(--text)]">
                          <span>Estimated Total:</span>
                          <span className="text-[#FF6B35]">₹{estimatedTotal}</span>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* Gift Box Bottom Action Buttons */}
                {giftBoxItems.length > 0 && (
                  <div className="p-3 border-t border-[var(--border)] bg-[var(--panel)] space-y-2">
                    <button
                      onClick={handleProceedToCheckout}
                      disabled={isCheckingOut || !!validationPricing?.budgetExceeded}
                      className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-[#FF6B35] to-[#FF8F5E] text-white text-xs font-black shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                      <ShoppingBag className="w-4 h-4" />
                      {isCheckingOut
                        ? 'Verifying Real Inventory...'
                        : validationPricing?.budgetExceeded
                        ? 'Budget Exceeded (Adjust Items)'
                        : `Proceed to Checkout • ₹${estimatedTotal}`}
                    </button>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleAddAllToCart}
                        className="flex-1 py-2 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)] text-xs font-bold text-[var(--text)] hover:text-[#FF6B35] transition-colors cursor-pointer"
                      >
                        Add to Craffle Cart
                      </button>
                      <button
                        onClick={() => setIsGiftBoxOpen(false)}
                        className="py-2 px-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)] text-xs font-bold text-[var(--muted)] hover:text-[var(--text)] transition-colors cursor-pointer"
                      >
                        Back to Chat
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Persistent Gift Box Mini Bar (when drawer is closed & items exist) */}
            {!isGiftBoxOpen && giftBoxItems.length > 0 && (
              <div
                onClick={() => setIsGiftBoxOpen(true)}
                className="px-4 py-2.5 bg-gradient-to-r from-[#FF6B35] to-[#FF8F5E] text-white flex items-center justify-between cursor-pointer hover:brightness-105 transition-all shadow-md"
              >
                <div className="flex items-center gap-2 text-xs font-black">
                  <Gift className="w-4 h-4" />
                  <span>
                    Gift Box: {giftBoxCount} {giftBoxCount === 1 ? 'item' : 'items'} (₹{estimatedTotal})
                  </span>
                </div>
                <span className="text-xs font-bold flex items-center gap-1 bg-white/20 px-2 py-0.5 rounded-lg">
                  View Box <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Custom Budget Modal */}
      <AnimatePresence>
        {showCustomBudgetModal && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-sm rounded-3xl p-5 shadow-2xl border space-y-4"
              style={{ background: 'var(--panel)', borderColor: 'var(--border)' }}
            >
              <div className="flex items-center justify-between">
                <h3 className="font-black text-sm text-[var(--text)] flex items-center gap-2">
                  <Gift className="w-4 h-4 text-[#FF6B35]" /> Set Custom Budget
                </h3>
                <button
                  onClick={() => setShowCustomBudgetModal(false)}
                  className="p-1 rounded-lg text-[var(--muted)] hover:text-[var(--text)] cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-[var(--text)]">Amount in INR (₹)</label>
                <input
                  type="number"
                  value={customBudgetInput}
                  onChange={e => setCustomBudgetInput(e.target.value)}
                  placeholder="E.g. 500"
                  className="w-full px-3.5 py-2.5 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl text-sm font-bold text-[var(--text)] focus:outline-none focus:border-[#FF6B35]"
                />
              </div>

              <div className="space-y-1.5">
                <span className="text-xs font-bold text-[var(--text)] block">Budget Mode</span>
                <label className="flex items-center gap-2 text-xs text-[var(--text)] cursor-pointer">
                  <input
                    type="radio"
                    name="modalBudgetMode"
                    checked={preferences.budgetMode === 'TOTAL'}
                    onChange={() => setPreferences(prev => ({ ...prev, budgetMode: 'TOTAL' }))}
                    className="accent-[#FF6B35]"
                  />
                  <span>Total Budget (includes delivery + packaging)</span>
                </label>
                <label className="flex items-center gap-2 text-xs text-[var(--text)] cursor-pointer">
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

              <div className="flex items-center gap-2 pt-2">
                <button
                  onClick={() => setShowCustomBudgetModal(false)}
                  className="flex-1 py-2 rounded-xl bg-[var(--bg-secondary)] text-xs font-bold text-[var(--text)] cursor-pointer"
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
                  className="flex-1 py-2 rounded-xl bg-[#FF6B35] text-white text-xs font-black shadow hover:bg-[#e05825] cursor-pointer"
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
