import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, Loader2, Bot, User, Sparkles, RotateCcw, WifiOff, MessageSquare, Plus, Edit2, Trash2, Check, X } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { useAppStore } from '../../store'
import { streamChat, ApiError } from '../../lib/apiClient'
import { streamChatResponse } from '../../mocks/chat'
import type { Message } from '../../types'

function TypingDots() {
  return (
    <div className="flex items-center gap-1 px-4 py-3">
      {[0, 1, 2].map(i => (
        <motion.div
          key={i}
          animate={{ y: [0, -4, 0] }}
          transition={{ repeat: Infinity, duration: 0.8, delay: i * 0.15 }}
          className="w-1.5 h-1.5 rounded-full bg-brand-orange"
        />
      ))}
    </div>
  )
}

function MessageBubble({ msg }: { msg: Message }) {
  const isUser = msg.role === 'user'
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}
    >
      <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center shadow-sm ${
        isUser ? 'gradient-orange' : 'gradient-navy'
      }`}>
        {isUser ? <User size={14} className="text-white" /> : <Bot size={14} className="text-white" />}
      </div>
      <div className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
        isUser
          ? 'bg-brand-orange text-white rounded-tr-sm'
          : 'bg-white border border-gray-100 text-gray-800 rounded-tl-sm shadow-card'
      }`}>
        {isUser ? (
          <p>{msg.content}</p>
        ) : (
          <div className="prose prose-sm max-w-none prose-headings:font-display prose-headings:text-brand-navy prose-strong:text-gray-900">
            <ReactMarkdown>{msg.content}</ReactMarkdown>
          </div>
        )}
        {msg.isStreaming && <span className="inline-block w-1 h-4 bg-brand-orange/60 animate-pulse ml-0.5 align-middle" />}
        <p className={`text-[10px] mt-1 ${isUser ? 'text-white/60' : 'text-gray-400'}`}>
          {new Date(msg.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
    </motion.div>
  )
}

export default function ChatPanel() {
  const {
    messages, addMessage, updateLastMessage, chatTurn, incrementChatTurn,
    profile, clearMessages, setActiveTab, conversationId, setConversationId, accessToken,
    conversations, loadConversations, loadConversationDetails, createNewChat
  } = useAppStore()

  const [input, setInput] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [useBackend, setUseBackend] = useState(true)
  const [editingChatId, setEditingChatId] = useState<string | null>(null)
  const [editChatTitle, setEditChatTitle] = useState('')
  const [hoveredChatId, setHoveredChatId] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    loadConversations()
  }, [])

  useEffect(() => {
    if (messages.length === 0 && !conversationId) {
      triggerBotReply('', 0)
    }
  }, [conversationId, messages.length])

  async function triggerBotReply(userMsg: string, turn: number) {
    if (!userMsg) {
      const greetingMsg: Message = {
        id: `bot-${Date.now()}`,
        role: 'assistant',
        content: "I'm here to help with your financial planning. What would you like to discuss?",
        timestamp: new Date(),
        isStreaming: false,
      }
      addMessage(greetingMsg)
      return
    }

    setIsStreaming(true)
    const botMsg: Message = {
      id: `bot-${Date.now()}`,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isStreaming: true,
    }
    addMessage(botMsg)

    let accumulated = ''

    if (useBackend && accessToken) {
      try {
        for await (const event of streamChat(userMsg, conversationId)) {
          if (event.type === 'error') {
            throw new ApiError(0, event.data)
          }
          if (event.type === 'done') {
            if (event.conversationId) {
              setConversationId(event.conversationId)
            }
            break
          }
          // token event
          accumulated += event.data
          updateLastMessage(accumulated)
          if (event.conversationId && !conversationId) {
            setConversationId(event.conversationId)
          }
        }
      } catch (err: unknown) {
        // Backend unavailable — fall through to mock for THIS request only
        console.warn('Chat SSE failed, falling back to mock:', err instanceof ApiError ? err.detail : err)
        accumulated = ''
      }
    }

    if (!accumulated) {
      // Mock fallback
      for await (const chunk of streamChatResponse(userMsg, turn, profile)) {
        accumulated += chunk
        updateLastMessage(accumulated)
      }
    }
    setIsStreaming(false)

    if (turn >= 5) {
      // Refresh profile and goals from backend before switching to timeline
      // Note: Backend context extraction might take a few seconds,
      // a more robust approach would be SSE events or polling, but this is a good start.
      Promise.all([
        useAppStore.getState().loadProfile(),
        useAppStore.getState().loadGoals()
      ]).catch(console.error)
      setTimeout(() => setActiveTab('timeline'), 1500)
    }
  }

  async function handleSend() {
    if (!input.trim() || isStreaming) return
    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    }
    addMessage(userMsg)
    const currentTurn = chatTurn
    incrementChatTurn()
    setInput('')
    await triggerBotReply(input.trim(), currentTurn + 1)
    loadConversations() // refresh sidebar to show updated title
  }

  return (
    <div className="flex h-[calc(100vh-96px)] max-h-[800px] bg-white rounded-2xl shadow-card overflow-hidden">
      {/* Sidebar for Chat History */}
      <div className="w-64 border-r border-gray-100 bg-surface-subtle flex flex-col hidden md:flex">
        <div className="p-4 border-b border-gray-100">
          <button 
            onClick={() => { createNewChat(); setTimeout(() => triggerBotReply('', 0), 100) }}
            className="w-full btn-primary py-2.5 flex items-center justify-center gap-2"
          >
            <Plus size={16} /> New Chat
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          <p className="text-xs font-bold text-gray-400 px-3 py-2 uppercase tracking-wider">Recent</p>
          {conversations.length === 0 ? (
            <p className="text-xs text-gray-400 px-3">No past chats</p>
          ) : (
            conversations.map(conv => (
              <div
                key={conv.id}
                onMouseEnter={() => setHoveredChatId(conv.id)}
                onMouseLeave={() => setHoveredChatId(null)}
                className={`w-full text-left px-3 py-2.5 rounded-xl text-sm flex items-center gap-3 transition-colors cursor-pointer ${
                  conversationId === conv.id 
                    ? 'bg-brand-orange/10 text-brand-orange font-medium' 
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <MessageSquare size={16} className={`flex-shrink-0 ${conversationId === conv.id ? 'text-brand-orange' : 'text-gray-400'}`} />
                
                {editingChatId === conv.id ? (
                  <div className="flex-1 flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    <input 
                      autoFocus
                      value={editChatTitle}
                      onChange={e => setEditChatTitle(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          useAppStore.getState().renameConversation(conv.id, editChatTitle)
                          setEditingChatId(null)
                        } else if (e.key === 'Escape') {
                          setEditingChatId(null)
                        }
                      }}
                      className="flex-1 min-w-0 bg-white border border-gray-300 rounded px-1.5 py-0.5 text-xs text-gray-800"
                    />
                    <button onClick={() => {
                        useAppStore.getState().renameConversation(conv.id, editChatTitle)
                        setEditingChatId(null)
                      }} className="p-1 hover:bg-gray-200 rounded text-green-600">
                      <Check size={14} />
                    </button>
                    <button onClick={() => setEditingChatId(null)} className="p-1 hover:bg-gray-200 rounded text-red-500">
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <div className="flex-1 flex justify-between items-center min-w-0">
                    <button 
                      className="truncate text-left flex-1"
                      onClick={() => loadConversationDetails(conv.id)}
                    >
                      {conv.title || 'Conversation'}
                    </button>
                    {(hoveredChatId === conv.id || conversationId === conv.id) && (
                      <div className="flex items-center gap-1 flex-shrink-0 ml-1">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditChatTitle(conv.title || 'Conversation');
                            setEditingChatId(conv.id);
                          }}
                          className="p-1 text-gray-400 hover:text-brand-orange hover:bg-white rounded transition-colors"
                          title="Rename"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            if (window.confirm('Are you sure you want to delete this chat?')) {
                              useAppStore.getState().deleteConversation(conv.id);
                            }
                          }}
                          className="p-1 text-gray-400 hover:text-red-500 hover:bg-white rounded transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="border-b border-gray-100 flex items-center gap-3 py-4 px-4 bg-white">
        <div className="w-9 h-9 gradient-navy rounded-xl flex items-center justify-center shadow-sm">
          <Bot size={17} className="text-white" />
        </div>
        <div>
          <p className="font-display font-semibold text-brand-navy text-sm">LifeMap AI Advisor</p>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            <span className="text-[11px] text-gray-400">
              Online · Powered by GenAI
              {!useBackend && (
                <span className="inline-flex items-center gap-1 ml-1 text-amber-500">
                  <WifiOff size={9} /> demo mode
                </span>
              )}
            </span>
          </div>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className="badge-orange text-[10px]">
            <Sparkles size={9} /> AI
          </span>
          <button
            onClick={() => { clearMessages(); setUseBackend(true); setTimeout(() => triggerBotReply('', 0), 100) }}
            className="btn-ghost text-xs py-1.5 px-2"
            title="Restart conversation"
          >
            <RotateCcw size={13} /> Restart
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto bg-surface-subtle border border-gray-100 border-t-0 border-b-0 p-4 space-y-4 scrollbar-thin">
        <AnimatePresence initial={false}>
          {messages.map(msg => <MessageBubble key={msg.id} msg={msg} />)}
        </AnimatePresence>
        {isStreaming && messages[messages.length - 1]?.role === 'user' && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full gradient-navy flex items-center justify-center flex-shrink-0">
              <Bot size={14} className="text-white" />
            </div>
            <div className="bg-white border border-gray-100 rounded-2xl rounded-tl-sm shadow-card">
              <TypingDots />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Quick replies */}
      <div className="card rounded-none border-x-0 border-b-0 border-t border-gray-100 bg-white">
        <div className="flex gap-2 mb-3 flex-wrap">
          {['Retirement at 55', 'Child abroad education', 'Aggressive ULIP', 'Safe guaranteed plan'].map(q => (
            <button
              key={q}
              onClick={() => setInput(q)}
              className="text-[11px] px-3 py-1 rounded-full border border-brand-orange/30 text-brand-orange hover:bg-brand-orange hover:text-white transition-all"
            >
              {q}
            </button>
          ))}
        </div>
        <form
          onSubmit={e => { e.preventDefault(); handleSend() }}
          className="flex gap-2"
        >
          <input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Tell me about your life goals..."
            className="input-base flex-1"
            disabled={isStreaming}
          />
          <button
            type="submit"
            disabled={!input.trim() || isStreaming}
            className="btn-primary px-4 py-2.5 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isStreaming ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          </button>
        </form>
      </div>
    </div>
    </div>
  )
}
