import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AuthUser } from '../mocks/auth'
import type { UserProfile, Message, WhatIfParams, SimulationResult, LifeGoal } from '../types'
import { DEFAULT_GOALS } from '../mocks/simulation'

interface AppState {
  // Auth
  user: AuthUser | null
  setUser: (u: AuthUser | null) => void

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

  // Simulation
  goals: LifeGoal[]
  simulationResults: SimulationResult[]
  setSimulationResults: (r: SimulationResult[]) => void
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
      setUser: (user) => set({ user }),

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
      clearMessages: () => set({ messages: [], chatTurn: 0 }),
      chatTurn: 0,
      incrementChatTurn: () => set(s => ({ chatTurn: s.chatTurn + 1 })),

      goals: DEFAULT_GOALS,
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

      sidebarOpen: true,
      setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
      darkMode: false,
      toggleDarkMode: () => set(s => ({ darkMode: !s.darkMode })),
      activeTab: 'dashboard',
      setActiveTab: (activeTab) => set({ activeTab }),
    }),
    { name: 'lifemap-store', partialize: (s) => ({ user: s.user, profile: s.profile, darkMode: s.darkMode }) }
  )
)
