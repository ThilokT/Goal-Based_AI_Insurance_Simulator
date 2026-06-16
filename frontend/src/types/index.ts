export type ProductCategory = 'protection' | 'ulip' | 'participating' | 'non-participating' | 'annuity'

export interface Product {
  id: string
  name: string
  category: ProductCategory
  tagline: string
  minPremium: number
  coverageUpTo: number
  keyBenefits: string[]
  idealFor: string[]
  returnType: 'market-linked' | 'guaranteed' | 'bonus-based' | 'income'
  tenure: string
  badge?: string
}

export interface LifeGoal {
  id: string
  label: string
  icon: string
  targetAge: number
  corpusNeeded: number
  coveredBy: ProductCategory[]
}

export interface UserProfile {
  name?: string
  age?: number
  city?: string
  income?: number
  riskAppetite?: 'conservative' | 'moderate' | 'aggressive'
  familySize?: number
  goals: string[]
}

export interface SimulationResult {
  goalId: string
  corpusNeeded: number
  coveredAmount: number
  gap: number
  recommendedProducts: string[]
  monthlyPremium: number
}

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  isStreaming?: boolean
}

export interface WhatIfParams {
  retirementAge: number
  childEducationAbroad: boolean
  inflationRate: number
  existingSavings: number
  annualIncrementPercent: number
}
