import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, Loader2, Bot, User, Sparkles, RotateCcw, WifiOff, MessageSquare, Plus, Edit2, Trash2, Check, X, ChevronUp, ChevronDown } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { useAppStore } from '../../store'
import { streamChat, ApiError, api } from '../../lib/apiClient'
import { streamChatResponse } from '../../mocks/chat'
import type { Message } from '../../types'

function TypingDots() {
  return (
    <div className="flex items-center gap-1 h-5">
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

function MessageBubble({ msg, onSubmitEdit, isEditable }: { msg: Message, onSubmitEdit?: (content: string) => void, isEditable?: boolean }) {
  const isUser = msg.role === 'user'
  const [isEditing, setIsEditing] = useState(false)
  const [editContent, setEditContent] = useState(msg.content)

  const handleSave = () => {
    if (editContent.trim() !== msg.content && onSubmitEdit) {
      onSubmitEdit(editContent.trim())
    }
    setIsEditing(false)
  }

  useEffect(() => {
    setEditContent(msg.content)
  }, [msg.content])
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''} group relative`}
    >
      <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center shadow-sm ${isUser ? 'gradient-orange' : 'gradient-navy'
        }`}>
        {isUser ? <User size={14} className="text-white" /> : <Bot size={14} className="text-white" />}
      </div>
      <div className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed relative ${isUser
        ? 'bg-brand-orange text-white rounded-tr-sm'
        : 'bg-white border border-gray-100 text-gray-800 rounded-tl-sm shadow-card'
        }`}>
        {isEditing ? (
          <div className="flex flex-col gap-2 min-w-[280px]">
            <textarea 
              value={editContent}
              onChange={e => setEditContent(e.target.value)}
              className="w-full bg-white/10 text-white placeholder-white/50 border border-white/20 rounded-xl py-2 px-3 text-sm focus:outline-none focus:bg-white/20 resize-none min-h-[44px]"
              rows={2}
            />
            <div className="flex gap-2 justify-end mt-1">
              <button onClick={() => { setIsEditing(false); setEditContent(msg.content); }} className="px-3 py-1.5 text-xs rounded-lg hover:bg-white/10 transition-colors">Cancel</button>
              <button onClick={handleSave} disabled={!editContent.trim()} className="px-3 py-1.5 text-xs rounded-lg bg-white text-brand-orange font-semibold hover:bg-gray-50 transition-colors disabled:opacity-50">Save & Submit</button>
            </div>
          </div>
        ) : isUser ? (
          <p className="whitespace-pre-wrap">{msg.content}</p>
        ) : msg.content === '' && msg.isStreaming ? (
          <TypingDots />
        ) : (
          <div className="prose prose-sm max-w-none prose-headings:font-display prose-headings:text-brand-navy prose-strong:text-gray-900">
            <ReactMarkdown>{msg.content}</ReactMarkdown>
          </div>
        )}
        {!isEditing && msg.isStreaming && msg.content !== '' && <span className="inline-block w-1 h-4 bg-brand-orange/60 animate-pulse ml-0.5 align-middle" />}
        
        {!isEditing && isEditable && onSubmitEdit && (
          <button
            onClick={() => setIsEditing(true)}
            className="absolute top-1/2 -translate-y-1/2 -left-10 p-2 text-gray-400 hover:text-brand-orange hover:bg-orange-50 rounded-full opacity-0 group-hover:opacity-100 transition-all shadow-sm bg-white border border-gray-100"
            title="Edit this message"
          >
            <Edit2 size={14} />
          </button>
        )}

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
    conversations, loadConversations, loadConversationDetails, createNewChat,
    isChatLoading, extractContext, chatContexts
  } = useAppStore()

  const currentChatContext = conversationId ? chatContexts[conversationId] : null;

  const [input, setInput] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [isExtracting, setIsExtracting] = useState(false)
  const [isExtractingTop, setIsExtractingTop] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [useBackend, setUseBackend] = useState(true)
  const [showChatVariables, setShowChatVariables] = useState(false)
  const [editingChatId, setEditingChatId] = useState<string | null>(null)
  const [editChatTitle, setEditChatTitle] = useState('')
  const [hoveredChatId, setHoveredChatId] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const handleEditMessage = async (index: number, newContent: string) => {
    const msg = messages[index];
    if (!msg || msg.role !== 'user') return;
    
    // Slice up to this message
    const newMessages = messages.slice(0, index);
    useAppStore.getState().setMessages(newMessages);

    // Send the edited message
    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: newContent.trim(),
      timestamp: new Date(),
    }
    useAppStore.getState().addMessage(userMsg)
    const actualTurn = Math.floor(newMessages.length / 2)
    useAppStore.getState().incrementChatTurn()
    await triggerBotReply(newContent.trim(), actualTurn + 1)
    loadConversations()
  }

  const prevConvIdRef = useRef<string | null>(null)
  const prevLastMsgIdRef = useRef<string | null>(null)

  useEffect(() => {
    const lastMsg = messages[messages.length - 1]
    
    // Only auto-scroll to bottom if:
    // 1. We are in the same conversation (not just switching)
    // 2. We are NOT actively loading historical chunks in the background
    // 3. AND the message is actively streaming, or it's a freshly sent local message (not from DB sync)
    if (
      conversationId === prevConvIdRef.current &&
      !isChatLoading &&
      lastMsg && (
        lastMsg.isStreaming || 
        lastMsg.id.startsWith('user-') || 
        lastMsg.id.startsWith('bot-')
      )
    ) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }

    prevConvIdRef.current = conversationId
    prevLastMsgIdRef.current = lastMsg?.id || null
  }, [messages, conversationId, isChatLoading])

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto'
      inputRef.current.style.height = `${inputRef.current.scrollHeight}px`
    }
  }, [input])

  useEffect(() => {
    loadConversations()
  }, [])

  useEffect(() => {
    if (messages.length === 0 && !conversationId) {
      if (useAppStore.getState().messages.length === 0) {
        triggerBotReply('', 0)
      }
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
        const errorDetail = err instanceof ApiError ? err.detail : String(err)
        console.warn('Chat SSE failed, falling back to mock:', errorDetail)
        accumulated = `Connection Error: ${errorDetail}`
      }
    }

    if (!accumulated) {
      accumulated = "Sorry, I encountered an error connecting to the AI backend. Please try again or check the server."
      updateLastMessage(accumulated)
    }
    setIsStreaming(false)
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
            onClick={() => { createNewChat() }}
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
                className={`w-full text-left px-3 py-2.5 rounded-xl text-sm flex items-center gap-3 transition-colors cursor-pointer ${conversationId === conv.id
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
              onClick={async () => {
                let targetConvId = conversationId;
                setIsExtractingTop(true);
                try {
                  if (!targetConvId) {
                    const res = await api.post<any>('/api/conversations', {});
                    targetConvId = res.id;
                    setConversationId(targetConvId);
                    loadConversations();
                  }
                  if (targetConvId) {
                    await extractContext(targetConvId);
                  }
                } catch (err) {
                  console.error('Failed to create chat or extract profile', err);
                } finally {
                  setIsExtractingTop(false);
                }
              }}
              disabled={isExtractingTop}
              className="btn-ghost text-xs py-1.5 px-2 flex items-center gap-1"
              title="Manually extract profile information from chat"
            >
              {isExtractingTop ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
              Extract Profile
            </button>
            <button
              onClick={() => { clearMessages(); setUseBackend(true); }}
              className="btn-ghost text-xs py-1.5 px-2 flex items-center gap-1"
              title="Restart conversation"
            >
              <RotateCcw size={13} /> Restart
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto bg-surface-subtle border border-gray-100 border-t-0 border-b-0 p-4 space-y-4 scrollbar-thin">
          <AnimatePresence initial={false}>
            {messages.map((msg, idx) => {
              const isLastUserMessage = idx === messages.map(m => m.role).lastIndexOf('user') && !isStreaming;
              return (
                <MessageBubble 
                  key={msg.id} 
                  msg={msg} 
                  isEditable={isLastUserMessage}
                  onSubmitEdit={(newContent) => handleEditMessage(idx, newContent)}
                />
              )
            })}
          </AnimatePresence>
          {isChatLoading && (
            <div className="w-full max-w-md mx-auto h-1 bg-gray-200 overflow-hidden rounded-full mb-4">
              <motion.div
                className="h-full w-1/2 bg-brand-orange rounded-full"
                animate={{ x: ['-100%', '200%'] }}
                transition={{ repeat: Infinity, duration: 1.2, ease: 'easeInOut' }}
              />
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Quick replies */}
        <div className="card rounded-none border-x-0 border-b-0 border-t border-gray-100 bg-white">
          <div className="flex justify-between items-start sm:items-center mb-3 flex-col sm:flex-row gap-2">
            <div className="flex gap-2 flex-wrap flex-1">
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
            {messages.length > 2 && (
              <div className="flex flex-col items-end gap-1">
                <span className="text-[10px] text-gray-400">
                  Based on your demographics, financials & aspirations
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={async () => {
                      if (conversationId) {
                        setIsSyncing(true);
                        await useAppStore.getState().syncGlobalToChat(conversationId);
                        setIsSyncing(false);
                      }
                    }}
                    disabled={isSyncing}
                    className="flex items-center gap-1.5 text-xs py-1.5 px-3 whitespace-nowrap bg-white text-brand-navy border border-brand-navy/20 hover:bg-brand-navy hover:text-white transition-colors rounded-lg shadow-sm disabled:opacity-70"
                    title="Overwrite this chat's isolated variables with your real Global Profile"
                  >
                    {isSyncing ? <Loader2 size={13} className="animate-spin" /> : <RotateCcw size={13} />}
                    {isSyncing ? "Syncing..." : "Use Global Profile"}
                  </button>
                  <button
                    onClick={() => {
                      if (conversationId) {
                        const missing = [];
                        if (!currentChatContext?.profile?.age) missing.push('Age');
                        if (!currentChatContext?.profile?.income) missing.push('Annual Income');
                        if (!currentChatContext?.goals || currentChatContext.goals.length === 0) missing.push('Financial Goals');

                        if (missing.length > 0) {
                          addMessage({
                            id: `bot-missing-${Date.now()}`,
                            role: 'assistant',
                            content: `I'm missing some details to run your simulation. Please provide the following: **${missing.join(', ')}**, and then click **Extract Profile**.`,
                            timestamp: new Date()
                          });
                        } else {
                          setActiveTab('timeline');
                        }
                      }
                    }}
                    className="btn-primary flex items-center gap-1.5 text-xs py-1.5 px-3 whitespace-nowrap bg-brand-navy hover:bg-brand-navy/90 border-none shadow-sm"
                    title="Generate Life Journey from current isolated variables"
                  >
                    <Sparkles size={13} />
                    Simulate Life Journey
                  </button>
                </div>
                {currentChatContext && (
                  <div className="mt-3 text-[11px] text-gray-500 bg-brand-cream/30 p-2.5 rounded-lg border border-brand-orange/20 text-left w-full max-w-[280px]">
                    <div 
                      className={`font-semibold text-brand-navy flex items-center justify-between cursor-pointer select-none ${showChatVariables ? 'mb-1.5' : ''}`}
                      onClick={() => setShowChatVariables(!showChatVariables)}
                      title="Toggle variables visibility"
                    >
                      <span className="flex items-center gap-1">
                        <Sparkles size={11} className="text-brand-orange" />
                        Isolated Chat Variables
                      </span>
                      {showChatVariables ? <ChevronDown size={13} className="text-gray-400" /> : <ChevronUp size={13} className="text-gray-400" />}
                    </div>
                    {showChatVariables && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                        <div className="grid grid-cols-2 gap-x-2 gap-y-1">
                          <div><span className="text-gray-400">Age:</span> {currentChatContext.profile.age || '—'}</div>
                          <div><span className="text-gray-400">Income:</span> {currentChatContext.profile.income ? `₹${(currentChatContext.profile.income * 12).toLocaleString()}` : '—'}</div>
                          <div><span className="text-gray-400">City:</span> {currentChatContext.profile.city || '—'}</div>
                          <div><span className="text-gray-400">Dependents:</span> {currentChatContext.profile.familySize ?? '—'}</div>
                        </div>
                        <div className="mt-1.5 pt-1.5 border-t border-brand-orange/10">
                          <span className="text-gray-400">Goals:</span>{' '}
                          {currentChatContext.goals && currentChatContext.goals.length > 0 
                            ? currentChatContext.goals.map((g: any) => `${g.label}`).join(', ') 
                            : 'None identified'}
                        </div>
                      </motion.div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
          <form
            onSubmit={e => { e.preventDefault(); handleSend() }}
            className="flex items-end gap-2 bg-white border border-gray-200 rounded-2xl p-1 shadow-sm focus-within:shadow-md focus-within:border-brand-orange/40 transition-all duration-300 relative"
          >
            <textarea
              ref={inputRef as any}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  if (input.trim() && !isStreaming) {
                    handleSend();
                  }
                }
              }}
              placeholder="Tell me about your life goals... (Shift+Enter for new line)"
              className="flex-1 resize-none bg-transparent py-3 px-4 text-sm text-gray-800 focus:outline-none min-h-[48px] max-h-[120px] placeholder-gray-400 scrollbar-thin"
              rows={1}
              disabled={isStreaming}
            />
            <button
              type="submit"
              disabled={!input.trim() || isStreaming}
              className="bg-brand-orange text-white p-2.5 rounded-xl hover:bg-[#D85D1A] transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed mb-1 mr-1 flex items-center justify-center active:scale-95"
            >
              {isStreaming ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
