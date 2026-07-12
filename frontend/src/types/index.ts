export type ProductCategory = 'protection' | 'ulip' | 'participating' | 'non-participating' | 'annuity'

export interface Product {
  id: string
  name: string
  category: ProductCategory
  tagline: string
  description: string
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
  monthlyExpenses?: number
  existingCoverage?: number
  riskAppetite?: 'conservative' | 'moderate' | 'aggressive'
  familySize?: number
  maritalStatus?: string
  occupation?: string
  goals: string[]
  editableGoals?: any[]
}

export interface SimulationResult {
  goalId: string
  corpusNeeded: number
  coveredAmount: number
  gap: number
  recommendedProducts: string[]
  monthlyPremium: number
  recommendedProductName?: string
  recommendedProductCategory?: string
  recommendedProductId?: string
}

export interface YearlyProjection {
  year: number
  age: number
  totalInvested: number
  projectedCorpus: number
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
  goalTargetAges?: Record<string, number>
  goalTargetAmounts?: Record<string, number>
  goalExistingSavings?: Record<string, number>
  enableSip: boolean
  goalRiskAppetites?: Record<string, 'conservative' | 'moderate' | 'aggressive'>
}
