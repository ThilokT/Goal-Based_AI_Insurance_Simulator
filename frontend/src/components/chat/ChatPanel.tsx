import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, Loader2, Bot, User, Sparkles, RotateCcw } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { useAppStore } from '../../store'
import { streamChatMessage } from '../../lib/api'
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
          {msg.timestamp.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
    </motion.div>
  )
}

export default function ChatPanel() {
  const {
    messages, addMessage, updateLastMessage, chatTurn, incrementChatTurn,
    profile, clearMessages, setActiveTab, conversationId, setConversationId
  } = useAppStore()

  const [input, setInput] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (messages.length === 0) {
      triggerBotReply('', 0)
    }
  }, [])

  async function triggerBotReply(userMsg: string, turn: number) {
    setIsStreaming(true)
    const botMsg: Message = {
      id: `bot-${Date.now()}`,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isStreaming: true,
    }
    addMessage(botMsg)

    try {
      const { stream, getConversationId } = streamChatMessage(
        userMsg || 'Hello',
        conversationId
      )

      let accumulated = ''
      for await (const chunk of stream) {
        accumulated += chunk
        updateLastMessage(accumulated)
      }

      const newConversationId = getConversationId()
      if (newConversationId) setConversationId(newConversationId)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to reach the AI advisor.'
      updateLastMessage(`Sorry, I could not respond right now. ${message}`)
    } finally {
      setIsStreaming(false)
    }

    if (turn >= 5) {
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
  }

  return (
    <div className="flex flex-col h-[calc(100vh-96px)] max-h-[800px]">
      {/* Header */}
      <div className="card rounded-b-none border-b-0 flex items-center gap-3 py-4">
        <div className="w-9 h-9 gradient-navy rounded-xl flex items-center justify-center shadow-sm">
          <Bot size={17} className="text-white" />
        </div>
        <div>
          <p className="font-display font-semibold text-brand-navy text-sm">LifeMap AI Advisor</p>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            <span className="text-[11px] text-gray-400">Online · Powered by GenAI</span>
          </div>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className="badge-orange text-[10px]">
            <Sparkles size={9} /> AI
          </span>
          <button
            onClick={() => { clearMessages(); setTimeout(() => triggerBotReply('', 0), 100) }}
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
      <div className="card rounded-t-none border-t-0">
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
  )
}
