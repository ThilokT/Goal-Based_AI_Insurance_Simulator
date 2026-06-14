import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AuthUser, ConversationResponse, ConversationDetailResponse } from '../types/api'
import type { BackendGoalListResponse, GoalRequest } from '../types/api'
import type { UserProfile, Message, WhatIfParams, SimulationResult, LifeGoal } from '../types'
import { api } from '../lib/apiClient'

// ─── Goal type mapper (backend → frontend) ───────────────────
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
  clearMessages: () => void
  chatTurn: number
  incrementChatTurn: () => void
  conversationId: string | null
  setConversationId: (id: string | null) => void
  conversations: ConversationResponse[]
  loadConversations: () => Promise<void>
  loadConversationDetails: (id: string) => Promise<void>
  createNewChat: () => void

  // Simulation
  goals: LifeGoal[]
  setGoals: (g: LifeGoal[]) => void
  loadGoals: () => Promise<void>
  createGoal: (goal: GoalRequest) => Promise<void>
  updateGoal: (id: string, goal: GoalRequest) => Promise<void>
  deleteGoal: (id: string) => Promise<void>
  simulationResults: SimulationResult[]
  setSimulationResults: (r: SimulationResult[]) => void
  whatIfParams: WhatIfParams
  setWhatIfParams: (p: Partial<WhatIfParams>) => void

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
      }),

      profile: null,
      setProfile: (profile) => set({ profile }),
      loadProfile: async () => {
        try {
          const res = await api.get<any>('/users/me')
          if (res && res.age) {
            set((state) => ({
              profile: {
                name: res.full_name || 'Guest',
                age: res.age || 30,
                city: res.city || 'Mumbai',
                income: (res.annual_income || 1000000) / 12,
                riskAppetite: (res.risk_appetite || 'moderate').toLowerCase(),
                familySize: res.dependents || 0,
                goals: state.profile?.goals || [],
              }
            }))
          }
        } catch {
          console.warn('Failed to load profile from API')
        }
      },
      onboardingStep: 0,
      setOnboardingStep: (onboardingStep) => set({ onboardingStep }),

      messages: [],
      addMessage: (m) => set(s => ({ messages: [...s.messages, m] })),
      updateLastMessage: (content) =>
        set(s => {
          const msgs = [...s.messages]
          if (msgs.length) msgs[msgs.length - 1] = { ...msgs[msgs.length - 1], content, isStreaming: false }
          return { messages: msgs }
        }),
      clearMessages: () => set({ messages: [], chatTurn: 0, conversationId: null }),
      chatTurn: 0,
      incrementChatTurn: () => set(s => ({ chatTurn: s.chatTurn + 1 })),
      conversationId: null,
      setConversationId: (conversationId) => set({ conversationId }),
      
      conversations: [],
      loadConversations: async () => {
        try {
          const res = await api.get<ConversationResponse[]>('/api/conversations')
          set({ conversations: res || [] })
        } catch {
          console.warn('Failed to load conversations')
        }
      },
      
      loadConversationDetails: async (id: string) => {
        try {
          const res = await api.get<ConversationDetailResponse>(`/api/conversations/${id}`)
          const mappedMessages: Message[] = res.messages.map(m => ({
            id: m.id,
            role: m.role as 'user' | 'assistant',
            content: m.content,
            timestamp: new Date(m.created_at || Date.now()),
            isStreaming: false
          }))
          set({ 
            conversationId: id,
            messages: mappedMessages,
            chatTurn: Math.floor(mappedMessages.length / 2)
          })
        } catch {
          console.warn('Failed to load conversation details')
        }
      },
      
      createNewChat: () => {
        set({
          conversationId: null,
          messages: [],
          chatTurn: 0
        })
      },

      goals: [],
      setGoals: (goals) => set({ goals }),

      // ── Goals API CRUD ─────────────────────────────────
      loadGoals: async () => {
        try {
          const res = await api.get<BackendGoalListResponse>('/api/goals')
          const mapped: LifeGoal[] = res.goals.map(g => ({
            id: g.id,
            label: g.goal_type,
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
        } catch {
          console.warn('Failed to create goal via API')
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
          await get().loadGoals()
        } catch {
          console.warn('Failed to delete goal via API')
        }
      },

      simulationResults: [],
      setSimulationResults: (simulationResults) => set({ simulationResults }),
      whatIfParams: {
        retirementAge: 60,
        childEducationAbroad: false,
        inflationRate: 6,
        existingSavings: 500_000,
        annualIncrementPercent: 8,
      },
      setWhatIfParams: (p) => set(s => ({ whatIfParams: { ...s.whatIfParams, ...p } })),

      productCount: 0,
      setProductCount: (productCount) => set({ productCount }),

      sidebarOpen: true,
      setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
      darkMode: false,
      toggleDarkMode: () => set(s => ({ darkMode: !s.darkMode })),
      activeTab: 'dashboard',
      setActiveTab: (activeTab) => set({ activeTab }),
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
      }),
    }
  )
)
