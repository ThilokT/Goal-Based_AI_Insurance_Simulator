import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AuthUser } from '../lib/api/auth'
import { setAccessToken } from '../lib/api/client'
import type { UserProfile, Message, WhatIfParams, SimulationResult, LifeGoal, Product } from '../types'
import { DEFAULT_GOALS } from '../mocks/simulation'

interface AppState {
  // Auth
  user: AuthUser | null
  accessToken: string | null
  setAuth: (user: AuthUser, accessToken: string) => void
  clearAuth: () => void

  // Onboarding
  profile: UserProfile | null
  setProfile: (p: UserProfile) => void
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

  // Products
  products: Product[]
  productsLoading: boolean
  setProducts: (products: Product[]) => void
  setProductsLoading: (loading: boolean) => void

  // Simulation
  goals: LifeGoal[]
  simulationResults: SimulationResult[]
  simulationLoading: boolean
  setSimulationResults: (r: SimulationResult[]) => void
  setSimulationLoading: (loading: boolean) => void
  whatIfParams: WhatIfParams
  setWhatIfParams: (p: Partial<WhatIfParams>) => void

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
    (set) => ({
      user: null,
      accessToken: null,
      setAuth: (user, accessToken) => {
        setAccessToken(accessToken)
        set({ user, accessToken })
      },
      clearAuth: () => {
        setAccessToken(null)
        set({
          user: null,
          accessToken: null,
          profile: null,
          messages: [],
          chatTurn: 0,
          conversationId: null,
          simulationResults: [],
          products: [],
        })
      },

      profile: null,
      setProfile: (profile) => set({ profile }),
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

      products: [],
      productsLoading: false,
      setProducts: (products) => set({ products }),
      setProductsLoading: (productsLoading) => set({ productsLoading }),

      goals: DEFAULT_GOALS,
      simulationResults: [],
      simulationLoading: false,
      setSimulationResults: (simulationResults) => set({ simulationResults }),
      setSimulationLoading: (simulationLoading) => set({ simulationLoading }),
      whatIfParams: {
        retirementAge: 60,
        childEducationAbroad: false,
        inflationRate: 6,
        existingSavings: 500_000,
        annualIncrementPercent: 8,
      },
      setWhatIfParams: (p) => set(s => ({ whatIfParams: { ...s.whatIfParams, ...p } })),

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
        profile: s.profile,
        darkMode: s.darkMode,
        conversationId: s.conversationId,
      }),
      onRehydrateStorage: () => (state) => {
        if (state?.accessToken) {
          setAccessToken(state.accessToken)
        }
      },
    }
  )
)
