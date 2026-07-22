import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AuthUser, ConversationResponse, ConversationDetailResponse } from '../types/api'
import type { BackendGoalListResponse, GoalRequest } from '../types/api'
import type { UserProfile, Message, WhatIfParams, SimulationResult, LifeGoal, YearlyProjection, PayoutEvent } from '../types'
import { api } from '../lib/apiClient'

// ─── Goal type mapper (backend → frontend) ───────────────────
const NORMALIZE_GOAL_MAP: Record<string, string> = {
  'home_purchase': 'Buy a Home',
  'child_education': "Child's Higher Education",
  'child_marriage': "Child's Marriage",
  'retirement': 'Retirement Planning',
  'retirement_planning': 'Retirement Planning',
  'legacy': 'Leave a Legacy',
  'business': 'Business Fund',
  'business_fund': 'Business Fund',
  'travel': 'Travel & Experiences',
  'family_protection': 'Family Protection'
}

const GOAL_ICON_MAP: Record<string, string> = {
  "Child's Higher Education": '🎓',
  'Buy a Home': '🏠',
  'Retirement Planning': '🧘',
  'Retirement Corpus': '🧘',
  "Child's Marriage": '💍',
  'Family Protection': '🛡',
  'Leave a Legacy': '🛡',
  'Business Fund': '💼',
  'Travel & Experiences': '✈️',
  // Fallbacks for unmapped
  'home_purchase': '🏠',
  'child_education': '🎓',
  'child_marriage': '💍',
  'retirement_planning': '🧘',
  'family_protection': '🛡',
}

const GOAL_COVERED_MAP: Record<string, LifeGoal['coveredBy']> = {
  "Child's Higher Education": ['ulip', 'non-participating'],
  'Buy a Home': ['non-participating', 'participating'],
  'Retirement Planning': ['annuity', 'ulip', 'participating'],
  'Retirement Corpus': ['annuity', 'ulip', 'participating'],
  "Child's Marriage": ['participating', 'non-participating'],
  'Family Protection': ['protection'],
  'Leave a Legacy': ['protection'],
  'Business Fund': ['ulip', 'non-participating'],
  'Travel & Experiences': ['non-participating'],
}

interface AppState {
  // Auth
  user: AuthUser | null
  accessToken: string | null
  refreshToken: string | null
  setUser: (u: AuthUser | null) => void
  setTokens: (access: string, refresh: string) => void
  logout: () => void

  // Onboarding
  profile: UserProfile | null
  setProfile: (p: UserProfile) => void
  loadProfile: () => Promise<void>
  onboardingStep: number
  setOnboardingStep: (n: number) => void

  // Chat
  messages: Message[]
  addMessage: (m: Message) => void
  updateLastMessage: (content: string) => void
  setMessages: (m: Message[]) => void
  clearMessages: () => void
  chatTurn: number
  incrementChatTurn: () => void
  conversationId: string | null
  setConversationId: (id: string | null) => void
  isChatLoading: boolean
  setIsChatLoading: (b: boolean) => void
  chatCache: Record<string, Message[]>
  conversations: ConversationResponse[]
  loadConversations: () => Promise<void>
  loadConversationDetails: (id: string) => Promise<void>
  createNewChat: () => void
  deleteConversation: (id: string) => Promise<void>
  renameConversation: (id: string, title: string) => Promise<void>
  extractContext: (conversationId: string) => Promise<boolean>
  chatContexts: Record<string, { profile: Partial<UserProfile>, goals: LifeGoal[] }>
  applyExtractedContext: (data: any, conversationId: string) => void
  syncGlobalToChat: (conversationId: string) => Promise<boolean>

  // Simulation
  goals: LifeGoal[]
  setGoals: (g: LifeGoal[]) => void
  loadGoals: () => Promise<void>
  createGoal: (goal: GoalRequest) => Promise<void>
  updateGoal: (id: string, goal: GoalRequest) => Promise<void>
  deleteGoal: (id: string) => Promise<void>
  simulationResults: SimulationResult[]
  setSimulationResults: (r: SimulationResult[]) => void
  yearlyProjections: YearlyProjection[]
  setYearlyProjections: (p: YearlyProjection[]) => void
  whatIfParams: WhatIfParams
  setWhatIfParams: (p: Partial<WhatIfParams>) => void
  productWhatIfParams: { monthlyPremium: number; tenureYears: number }
  setProductWhatIfParams: (p: Partial<{ monthlyPremium: number; tenureYears: number }>) => void
  simulationMode: 'goals' | 'product'
  setSimulationMode: (mode: 'goals' | 'product') => void
  isProfileLoading: boolean
  setIsProfileLoading: (v: boolean) => void
  isOffline: boolean
  setIsOffline: (v: boolean) => void
  isSimulating: boolean
  setIsSimulating: (v: boolean) => void

  cardInvestments: Record<string, number>
  setCardInvestment: (goalId: string, amount: number) => void

  cardInvestmentSchedules: Record<string, import('../types').InvestmentEvent[]>
  setCardInvestmentSchedule: (goalId: string, schedule: import('../types').InvestmentEvent[]) => void

  cardPayouts: Record<string, number>
  setCardPayout: (goalId: string, amount: number) => void

  cardPayoutSchedules: Record<string, PayoutEvent[]>
  setCardPayoutSchedule: (goalId: string, events: PayoutEvent[]) => void

  // Products (cached count from API)
  productCount: number
  setProductCount: (n: number) => void

  // UI
  sidebarOpen: boolean
  setSidebarOpen: (v: boolean) => void
  darkMode: boolean
  toggleDarkMode: () => void
  activeTab: string
  setActiveTab: (t: string) => void
  isProfileModalOpen: boolean
  setIsProfileModalOpen: (v: boolean) => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      setUser: (user) => set({ user }),
      setTokens: (accessToken, refreshToken) => set({ accessToken, refreshToken }),
      logout: () => set({
        user: null,
        accessToken: null,
        refreshToken: null,
        profile: null,
        messages: [],
        chatTurn: 0,
        conversationId: null,
        simulationResults: [],
        goals: [],
        activeTab: 'dashboard',
        cardInvestments: {},
        cardInvestmentSchedules: {},
        cardPayouts: {},
        cardPayoutSchedules: {},
      }),

      isProfileLoading: true,
      setIsProfileLoading: (isProfileLoading) => set({ isProfileLoading }),
      profile: null,
      setProfile: (profile) => set({ profile }),
      loadProfile: async () => {
        set({ isProfileLoading: true })
        try {
          const res = await api.get<any>('/users/me')
          if (res && res.age) {
            set((state) => ({
              profile: {
                name: res.full_name || undefined,
                age: res.age || undefined,
                city: res.city || undefined,
                income: res.annual_income ? res.annual_income / 12 : undefined,
                monthlyExpenses: res.monthly_expenses || undefined,
                existingCoverage: res.existing_coverage || undefined,
                riskAppetite: res.risk_appetite ? res.risk_appetite.toLowerCase() : undefined,
                familySize: res.dependents !== undefined && res.dependents !== null ? res.dependents : undefined,
                maritalStatus: res.marital_status || undefined,
                occupation: res.occupation || undefined,
                goals: state.profile?.goals || [],
              }
            }))
          }
        } catch (err) {
          console.error('Failed to load profile from API', err)
        } finally {
          set({ isProfileLoading: false })
        }
      },
      onboardingStep: 0,
      setOnboardingStep: (onboardingStep) => set({ onboardingStep }),

      chatCache: {},
      chatContexts: {},
      messages: [],
      addMessage: (m) => set(s => {
        const newMessages = [...s.messages, m];
        const cacheUpdate = s.conversationId ? { chatCache: { ...s.chatCache, [s.conversationId]: newMessages } } : {};
        return { messages: newMessages, ...cacheUpdate };
      }),
      updateLastMessage: (content) => set(s => {
        const newMessages = [...s.messages]
        if (newMessages.length > 0) {
          newMessages[newMessages.length - 1] = { ...newMessages[newMessages.length - 1], content, isStreaming: false }
        }
        const cacheUpdate = s.conversationId ? { chatCache: { ...s.chatCache, [s.conversationId]: newMessages } } : {};
        return { messages: newMessages, ...cacheUpdate };
      }),
      setMessages: (messages) => set(s => {
        const cacheUpdate = s.conversationId ? { chatCache: { ...s.chatCache, [s.conversationId]: messages } } : {};
        return { messages, chatTurn: Math.floor(messages.length / 2), ...cacheUpdate };
      }),
      clearMessages: () => set({ messages: [], chatTurn: 0, conversationId: null }),
      chatTurn: 0,
      incrementChatTurn: () => set(s => ({ chatTurn: s.chatTurn + 1 })),
      conversationId: null,
      setConversationId: (conversationId) => set({ conversationId }),
      isChatLoading: false,
      setIsChatLoading: (isChatLoading) => set({ isChatLoading }),

      conversations: [],
      loadConversations: async () => {
        try {
          const res = await api.get<ConversationResponse[]>('/api/conversations')
          set({ conversations: res || [] })
        } catch (err) {
          console.error('Failed to load conversations', err)
        }
      },

      loadConversationDetails: async (id: string) => {
        const state = get()
        const cachedMessages = state.chatCache[id]
        
        // Provide instant UI feedback by switching the active chat immediately
        set({
          conversationId: id,
          messages: cachedMessages || [],
          chatTurn: cachedMessages ? Math.floor(cachedMessages.length / 2) : 0,
          isChatLoading: !cachedMessages,
          simulationResults: [], // Clear stale simulation data
          yearlyProjections: [],
        })
        try {
          if (cachedMessages) {
            // If cached, silently sync in the background
            const res = await api.get<ConversationDetailResponse>(`/api/conversations/${id}`)
            const mappedMessages: Message[] = res.messages.map(m => ({
              id: m.id,
              role: m.role as 'user' | 'assistant',
              content: m.content,
              timestamp: new Date(m.created_at || Date.now()),
              isStreaming: false
            }))
            set((state) => ({
              messages: mappedMessages,
              chatTurn: Math.floor(mappedMessages.length / 2),
              isChatLoading: false,
              chatCache: { ...state.chatCache, [id]: mappedMessages }
            }))
            return;
          }

          // Not cached: Load incrementally in chunks of 4 (Oldest to Newest)
          let offset = 0;
          let hasMore = true;
          let accumulatedMessages: Message[] = [];
          
          while (hasMore) {
            if (get().conversationId !== id) return;
            
            const res = await api.get<ConversationDetailResponse>(`/api/conversations/${id}?limit=4&offset=${offset}`)
            const chunk: Message[] = res.messages.map(m => ({
              id: m.id,
              role: m.role as 'user' | 'assistant',
              content: m.content,
              timestamp: new Date(m.created_at || Date.now()),
              isStreaming: false
            }))

            if (chunk.length === 0) {
              hasMore = false;
              break;
            }

            if (offset === 0) {
              // Display the first chunk (the oldest messages) instantly without staggering
              // This prevents the auto-scroll logic from pulling the user down to the 4th message
              accumulatedMessages = chunk
              set({
                messages: accumulatedMessages,
                chatTurn: Math.floor(accumulatedMessages.length / 2)
              })
              // Apply conversation-specific context if it exists
              if (res.conversation.extracted_context) {
                get().applyExtractedContext(res.conversation.extracted_context, id)
              }
            } else {
              // Append newer messages to the bottom
              accumulatedMessages = [...accumulatedMessages, ...chunk]
              set({
                messages: accumulatedMessages,
                chatTurn: Math.floor(accumulatedMessages.length / 2)
              })
            }

            offset += chunk.length;

            set((state) => ({
              chatCache: { ...state.chatCache, [id]: accumulatedMessages }
            }))

            // If we received fewer than 4 messages, we've reached the very end of the chat
            if (chunk.length < 4) {
              hasMore = false;
            }
          }
          
          // Only turn off the loading bar when all messages have been fully loaded
          set({ isChatLoading: false })
        } catch (err) {
          console.error('Failed to load conversation details', err)
          set({ isChatLoading: false })
        }
      },

      createNewChat: () => {
        set({
          conversationId: null,
          messages: [],
          chatTurn: 0,
          profile: { name: get().user?.full_name || 'User', goals: [] },
          goals: []
        })
      },

      deleteConversation: async (id: string) => {
        try {
          await api.delete(`/api/conversations/${id}`)
          if (get().conversationId === id) {
            set({ conversationId: null, messages: [], chatTurn: 0 })
          }
          await get().loadConversations()
        } catch {
          console.warn('Failed to delete conversation')
        }
      },
      renameConversation: async (id: string, title: string) => {
        // Optimistic UI update
        set((state) => ({
          conversations: state.conversations.map(c => 
            c.id === id ? { ...c, title } : c
          )
        }))
        try {
          await api.patch(`/api/conversations/${id}`, { title })
        } catch {
          console.warn('Failed to rename conversation')
          await get().loadConversations() // Revert on failure
        }
      },
      extractContext: async (conversationId: string) => {
        try {
          const res = await api.post<any>('/api/chat/extract', { conversation_id: conversationId })
          if (res && res.data) {
            get().applyExtractedContext(res.data, conversationId)
          }
          if (res && res.message) {
            get().addMessage({
              id: `bot-extract-${Date.now()}`,
              role: 'assistant',
              content: res.message,
              timestamp: new Date()
            })
          }
          return res?.status === 'success'
        } catch (err) {
          console.error('Failed to extract context', err)
          return false
        }
      },
      applyExtractedContext: (data: any, conversationId: string) => {
        const currentGlobalProfile = get().profile
        
        const extractedProfile: Partial<UserProfile> = {
          name: data.full_name || currentGlobalProfile?.name || get().user?.full_name || 'User',
          age: data.age,
          city: data.city,
          income: data.annual_income ? data.annual_income / 12 : undefined,
          monthlyExpenses: data.monthly_expenses,
          existingCoverage: data.existing_coverage,
          riskAppetite: data.risk_appetite,
          familySize: data.dependents,
          maritalStatus: data.marital_status,
          occupation: data.occupation,
        }

        let extractedGoals: LifeGoal[] = []
        if (data.goals && Array.isArray(data.goals)) {
          extractedGoals = data.goals.map((g: any, i: number) => ({
            id: `extracted-goal-${i}`,
            label: NORMALIZE_GOAL_MAP[g.goal_type] || g.goal_type,
            icon: GOAL_ICON_MAP[g.goal_type] ?? '🎯',
            targetAge: g.target_year,
            corpusNeeded: g.target_amount,
            coveredBy: GOAL_COVERED_MAP[g.goal_type] ?? ['protection'],
          }))
        }

        set((state) => ({
          chatContexts: {
            ...state.chatContexts,
            [conversationId]: {
              profile: extractedProfile,
              goals: extractedGoals
            }
          }
        }))
      },

      syncGlobalToChat: async (conversationId: string) => {
        const globalProfile = get().profile
        const globalGoals = get().goals
        
        if (!globalProfile) return false;

        // Map global goals back to the backend schema strings
        const reverseGoalMap: Record<string, string> = {
          'Buy a Home': 'home_purchase',
          "Child's Higher Education": 'child_education',
          "Child's Marriage": 'child_marriage',
          'Retirement Planning': 'retirement_planning',
          'Leave a Legacy': 'legacy',
          'Business Fund': 'business_fund',
          'Travel & Experiences': 'travel',
          'Family Protection': 'family_protection'
        }

        const formattedGoals = globalGoals.map(g => ({
          goal_type: reverseGoalMap[g.label] || 'general',
          target_amount: g.corpusNeeded,
          target_year: g.targetAge,
          priority: 1
        }))

        const payload = {
          full_name: globalProfile.name,
          age: globalProfile.age,
          city: globalProfile.city,
          annual_income: globalProfile.income ? globalProfile.income * 12 : undefined,
          monthly_expenses: globalProfile.monthlyExpenses,
          existing_coverage: globalProfile.existingCoverage,
          risk_appetite: globalProfile.riskAppetite,
          dependents: globalProfile.familySize,
          marital_status: globalProfile.maritalStatus,
          occupation: globalProfile.occupation,
          goals: formattedGoals
        }

        try {
          await api.put(`/api/conversations/${conversationId}/context`, payload)
          get().applyExtractedContext(payload, conversationId)
          return true
        } catch (err) {
          console.error('Failed to sync global profile to chat', err)
          return false
        }
      },

      goals: [],
      setGoals: (goals) => set({ goals }),

      // ── Goals API CRUD ─────────────────────────────────
      loadGoals: async () => {
        try {
          const res = await api.get<BackendGoalListResponse>('/api/goals')
          const mapped: LifeGoal[] = res.goals.map(g => ({
            id: g.id,
            label: NORMALIZE_GOAL_MAP[g.goal_type] || g.goal_type,
            icon: GOAL_ICON_MAP[g.goal_type] ?? '🎯',
            targetAge: g.target_year,
            corpusNeeded: g.target_amount,
            coveredBy: GOAL_COVERED_MAP[g.goal_type] ?? ['protection'],
          }))
          set({ goals: mapped })
        } catch {
          // Keep existing goals on failure
          console.warn('Failed to load goals from API')
        }
      },

      createGoal: async (goal: GoalRequest) => {
        try {
          await api.post('/api/goals', goal)
          await get().loadGoals()
        } catch (err) {
          console.error('Failed to create goal via API', err)
        }
      },

      updateGoal: async (id: string, goal: GoalRequest) => {
        try {
          await api.put(`/api/goals/${id}`, goal)
          await get().loadGoals()
        } catch {
          console.warn('Failed to update goal via API')
        }
      },

      deleteGoal: async (id: string) => {
        try {
          await api.delete(`/api/goals/${id}`)
          // Clean up stale card values for the deleted goal
          set((state) => {
            const { [id]: _inv, ...remainingInvestments } = state.cardInvestments || {}
            const { [id]: _invSched, ...remainingInvSchedules } = state.cardInvestmentSchedules || {}
            const { [id]: _pay, ...remainingPayouts } = state.cardPayouts || {}
            const { [id]: _sched, ...remainingSchedules } = state.cardPayoutSchedules || {}
            return {
              goals: state.goals.filter(g => g.id !== id),
              simulationResults: state.simulationResults.filter(r => r.goalId !== id),
              cardInvestments: remainingInvestments,
              cardInvestmentSchedules: remainingInvSchedules,
              cardPayouts: remainingPayouts,
              cardPayoutSchedules: remainingSchedules
            }
          })
          await get().loadGoals()
        } catch {
          console.warn('Failed to delete goal via API')
        }
      },

      simulationResults: [],
      setSimulationResults: (r) => set({ simulationResults: r }),
      yearlyProjections: [],
      setYearlyProjections: (p) => set({ yearlyProjections: p }),
      whatIfParams: {
        retirementAge: 60,
        childEducationAbroad: false,
        inflationRate: 6,
        existingSavings: 500000,
        annualIncrementPercent: 8,
        goalStartAges: {},
        goalTargetAmounts: {},
        goalExistingSavings: {},
        enableSip: true,
        goalRiskAppetites: {},
      },
      setWhatIfParams: (p) => set((state) => ({ 
        whatIfParams: { ...state.whatIfParams, ...p } 
      })),
      productWhatIfParams: {
        monthlyPremium: 10000,
        tenureYears: 20,
      },
      setProductWhatIfParams: (p) => set((state) => ({
        productWhatIfParams: { ...state.productWhatIfParams, ...p }
      })),
      simulationMode: 'goals',
      setSimulationMode: (simulationMode) => set({ simulationMode }),
      isOffline: false,
      setIsOffline: (isOffline) => set({ isOffline }),
      isSimulating: false,
      setIsSimulating: (isSimulating) => set({ isSimulating }),

      cardInvestments: {},
      setCardInvestment: (goalId, amount) => set((state) => ({ 
        cardInvestments: { ...state.cardInvestments, [goalId]: amount } 
      })),

      cardInvestmentSchedules: {},
      setCardInvestmentSchedule: (goalId, schedule) => set(state => ({
        cardInvestmentSchedules: { ...state.cardInvestmentSchedules, [goalId]: schedule }
      })),

      cardPayouts: {},
      setCardPayout: (goalId, amount) => set((state) => ({
        cardPayouts: { ...state.cardPayouts, [goalId]: amount }
      })),

      cardPayoutSchedules: {},
      setCardPayoutSchedule: (goalId, events) => set((state) => ({
        cardPayoutSchedules: { ...state.cardPayoutSchedules, [goalId]: events }
      })),

      productCount: 0,
      setProductCount: (productCount) => set({ productCount }),

      sidebarOpen: true,
      setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
      darkMode: false,
      toggleDarkMode: () => set(s => ({ darkMode: !s.darkMode })),
      activeTab: 'dashboard',
      setActiveTab: (activeTab) => set({ activeTab }),

      isProfileModalOpen: false,
      setIsProfileModalOpen: (isProfileModalOpen) => set({ isProfileModalOpen }),
    }),
    {
      name: 'lifemap-store',
      partialize: (s) => ({
        user: s.user,
        accessToken: s.accessToken,
        refreshToken: s.refreshToken,
        profile: s.profile,
        darkMode: s.darkMode,
        messages: s.messages,
        chatTurn: s.chatTurn,
        conversationId: s.conversationId,
        goals: s.goals,
        activeTab: s.activeTab,
        sidebarOpen: s.sidebarOpen,
      }),
    }
  )
)
