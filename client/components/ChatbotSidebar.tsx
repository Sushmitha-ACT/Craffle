import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MessageSquare, X, Send, Bot, Sparkles, AlertCircle } from 'lucide-react';

interface Message {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  createdAt: Date;
}

const SUGGESTIONS = [
  'How does Craffle work?',
  'What are self-pickup limits?',
  'How do I cancel my order?',
  'Where is my wishlist?'
];

export default function ChatbotSidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      sender: 'bot',
      text: "Hi there! 👋 I'm your Craffle Assistant. I can help you discover local creations, explain fulfillment options, and track orders. How can I help you today?",
      createdAt: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom when messages list updates
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim()) return;

    const userMessage: Message = {
      id: Math.random().toString(36).substr(2, 9),
      sender: 'user',
      text: textToSend,
      createdAt: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    try {
      const res = await fetch('/api/gemini/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: textToSend,
          history: messages.slice(1).map(m => ({ sender: m.sender, text: m.text })) // omit welcome message
        })
      });

      if (res.ok) {
        const data = await res.json();
        const botMessage: Message = {
          id: Math.random().toString(36).substr(2, 9),
          sender: 'bot',
          text: data.reply || "Sorry, I didn't get that. Could you repeat?",
          createdAt: new Date()
        };
        setMessages(prev => [...prev, botMessage]);
      } else {
        throw new Error();
      }
    } catch {
      const errorMessage: Message = {
        id: Math.random().toString(36).substr(2, 9),
        sender: 'bot',
        text: 'Sorry, I am having trouble connecting right now. Please try again later!',
        createdAt: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {/* Floating Chat Bubble Button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsOpen(true)}
            className="w-14 h-14 rounded-full flex items-center justify-center text-white shadow-2xl relative cursor-pointer"
            style={{
              background: 'linear-gradient(135deg, #FF6B35 0%, #FF8F5E 100%)',
              boxShadow: '0 8px 30px rgba(255, 107, 53, 0.4)'
            }}
          >
            <span className="absolute inset-0 rounded-full bg-[#FF6B35] animate-ping opacity-20 pointer-events-none" />
            <MessageSquare className="w-6 h-6" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Expanded Sidebar Drawer */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ x: 400, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 400, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 220 }}
            className="w-[360px] h-[550px] max-h-[85vh] rounded-3xl overflow-hidden shadow-2xl border border-gray-100 flex flex-col"
            style={{
              background: 'rgba(255, 255, 255, 0.9)',
              backdropFilter: 'blur(20px)',
              boxShadow: '0 20px 50px rgba(0, 0, 0, 0.15)',
              borderColor: 'rgba(255, 107, 53, 0.1)'
            }}
          >
            {/* Header */}
            <div className="p-4 flex items-center justify-between border-b border-gray-100/60"
              style={{ background: 'linear-gradient(135deg, rgba(255, 107, 53, 0.05) 0%, rgba(255, 143, 94, 0.05) 100%)' }}>
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#FF6B35] to-[#FF8F5E] flex items-center justify-center text-white">
                  <Bot className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-gray-900 flex items-center gap-1">
                    Craffle AI Bot <Sparkles className="w-3.5 h-3.5 text-[#FF6B35] fill-current" />
                  </h3>
                  <span className="text-[10px] text-green-600 font-bold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" /> Online
                  </span>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Chat History */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3.5 scrollbar-thin">
              {messages.map(m => (
                <div key={m.id} className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[82%] p-3.5 rounded-2xl text-sm leading-relaxed ${
                      m.sender === 'user'
                        ? 'bg-gradient-to-tr from-[#FF6B35] to-[#FF8F5E] text-white rounded-tr-none'
                        : 'bg-white text-gray-800 border border-gray-100/80 rounded-tl-none shadow-sm'
                    }`}
                  >
                    {m.text}
                  </div>
                </div>
              ))}

              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-white border border-gray-100/80 p-3 rounded-2xl rounded-tl-none flex items-center gap-1.5 shadow-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#FF6B35]/60 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-[#FF6B35]/60 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-[#FF6B35]/60 animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Suggestion Chips */}
            <div className="px-4 py-2 flex gap-1.5 overflow-x-auto whitespace-nowrap scrollbar-none border-t border-gray-50 bg-gray-50/40">
              {SUGGESTIONS.map(s => (
                <button
                  key={s}
                  onClick={() => handleSendMessage(s)}
                  className="px-3 py-1.5 bg-white border border-gray-200/80 rounded-full text-xs font-bold text-gray-600 hover:border-[#FF6B35] hover:text-[#FF6B35] hover:bg-[#FF6B35]/5 transition-all cursor-pointer"
                >
                  {s}
                </button>
              ))}
            </div>

            {/* Message Input Box */}
            <div className="p-3 border-t border-gray-100/60 bg-white">
              <form
                onSubmit={e => {
                  e.preventDefault();
                  handleSendMessage(input);
                }}
                className="flex items-center gap-2"
              >
                <input
                  type="text"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  placeholder="Ask a question..."
                  className="flex-1 px-3.5 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:border-[#FF6B35] focus:bg-white transition-all font-medium"
                />
                <button
                  type="submit"
                  disabled={!input.trim()}
                  className="p-2.5 rounded-xl bg-gradient-to-tr from-[#FF6B35] to-[#FF8F5E] text-white disabled:opacity-40 disabled:cursor-not-allowed hover:scale-105 transition-transform"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
