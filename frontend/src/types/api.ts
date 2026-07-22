/**
 * Backend API type interfaces and mapper functions.
 * Matches backend Pydantic schemas and maps them to frontend shapes.
 */

// ─── Auth ────────────────────────────────────────────────────
export interface TokenResponse {
  access_token: string
  refresh_token: string
  token_type: string
  expires_in: number
  user_id: string
  email: string
}

export interface AuthUser {
  id: string
  email: string
  name: string
  avatarInitials: string
}

export function mapTokenResponseToAuthUser(res: TokenResponse, fullName?: string): AuthUser {
  const name = fullName || res.email.split('@')[0]
  const initials = name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
  return { id: res.user_id, email: res.email, name, avatarInitials: initials }
}

// ─── User Profile ────────────────────────────────────────────
export interface BackendUserProfile {
  id: string
  full_name?: string | null
  age?: number | null
  annual_income?: number | null
  monthly_expenses?: number | null
  existing_coverage?: number | null
  dependents?: number | null
  risk_appetite?: string | null
  city?: string | null
  marital_status?: string | null
  occupation?: string | null
  created_at?: string | null
  updated_at?: string | null
}

export interface UpdateProfileRequest {
  full_name?: string | null
  age?: number | null
  annual_income?: number | null
  monthly_expenses?: number | null
  existing_coverage?: number | null
  dependents?: number | null
  risk_appetite?: string | null
  city?: string | null
  marital_status?: string | null
  occupation?: string | null
}

// ─── Products ────────────────────────────────────────────────
export interface BackendProduct {
  id: string
  product_id: string
  name: string
  category: string
  description?: string | null
  min_age?: number | null
  max_age?: number | null
  policy_term_min?: number | null
  policy_term_max?: number | null
  key_benefits: string[]
  goals_supported: string[]
  is_active: boolean
  created_at?: string | null
}

export interface BackendProductListResponse {
  products: BackendProduct[]
  total: number
}

import type { Product, ProductCategory } from '../types'
import { MOCK_PRODUCTS } from '../mocks/products'

// Display-enhancement layer: fills in fields the backend doesn't have yet
const PRODUCT_DISPLAY_ENHANCEMENTS: Record<string, Partial<Product>> = {
  'iprotect-smart': { tagline: 'Comprehensive term cover with critical illness benefit', minPremium: 6000, coverageUpTo: 20_000_000, idealFor: ['Income replacement', 'Family protection', 'Loan cover'], returnType: 'guaranteed', tenure: '5 – 40 years', badge: 'Most Popular' },
  'iprotect-return': { tagline: 'Pure term plan — get all premiums back at maturity', minPremium: 8000, coverageUpTo: 10_000_000, idealFor: ['Risk-averse protection seekers', 'Young earners'], returnType: 'guaranteed', tenure: '10 – 30 years' },
  'lifetime-classic': { tagline: 'Market-linked wealth creation with life cover', minPremium: 24_000, coverageUpTo: 5_000_000, idealFor: ['Wealth creation', 'Long-term equity exposure', 'Child education'], returnType: 'market-linked', tenure: '10 – 30 years', badge: 'Equity Growth' },
  'smart-life': { tagline: 'ULIP with guaranteed additions on premium waiver', minPremium: 36_000, coverageUpTo: 5_000_000, idealFor: ["Child's future", 'Education planning', 'Marriage fund'], returnType: 'market-linked', tenure: '10 – 20 years' },
  'cash-advantage': { tagline: 'Regular cash payouts with bonuses through life', minPremium: 18_000, coverageUpTo: 2_000_000, idealFor: ['Steady income needs', 'Mid-term goals', 'Conservative investors'], returnType: 'bonus-based', tenure: '15 – 25 years', badge: 'Bonus Rich' },
  'savings-suraksha': { tagline: 'Endowment plan with guaranteed maturity and bonuses', minPremium: 12_000, coverageUpTo: 1_500_000, idealFor: ['Long-term savings', 'Retirement kitty building', 'Low-risk profile'], returnType: 'bonus-based', tenure: '15 – 30 years' },
  'guaranteed-savings': { tagline: 'Fixed, assured returns with life protection', minPremium: 15_000, coverageUpTo: 3_000_000, idealFor: ['Goal-based savings', 'Zero-market-risk seekers', 'Tax-efficient returns'], returnType: 'guaranteed', tenure: '10 – 20 years', badge: 'Zero Market Risk' },
  'guaranteed-income': { tagline: 'Regular guaranteed income starting from day one', minPremium: 20_000, coverageUpTo: 2_000_000, idealFor: ['Predictable income', 'Home loan EMI matching', 'Education corpus'], returnType: 'guaranteed', tenure: '5 – 15 years' },
  'immediate-annuity': { tagline: 'Lifelong pension starting immediately after purchase', minPremium: 100_000, coverageUpTo: 0, idealFor: ['Retirees', 'Retirement corpus deployment', 'Spousal income protection'], returnType: 'income', tenure: 'Lifetime', badge: 'Retirement First' },
  'guaranteed-pension': { tagline: 'Build and receive your pension with full flexibility', minPremium: 24_000, coverageUpTo: 0, idealFor: ['Early retirement planners', 'Government-employee alternatives', 'NRIs'], returnType: 'income', tenure: '5 – 30 years accumulation' },
}

export function mapBackendProduct(bp: BackendProduct): Product {
  // First try to find display enhancements in our updated mock catalog by matching names or IDs
  const bpNameLower = bp.name.toLowerCase()
  const mockMatch = MOCK_PRODUCTS.find(m => {
    const mNameLower = m.name.toLowerCase()
    return m.id === bp.product_id || 
           bpNameLower === mNameLower ||
           bpNameLower.includes(mNameLower) ||
           // specific check for GPP Flexi
           (bpNameLower.includes('guaranteed pension plan flexi') && mNameLower.includes('gpp flexi')) ||
           // specific check for signature
           (bpNameLower.includes('signature assure') && mNameLower.includes('signature assure'))
  })

  const enhancements = (mockMatch as Partial<Product>) || PRODUCT_DISPLAY_ENHANCEMENTS[bp.product_id] || {}
  
  const policyTenure = bp.policy_term_min && bp.policy_term_max
    ? `${bp.policy_term_min} – ${bp.policy_term_max} years`
    : enhancements.tenure ?? 'N/A'

  // Determine category. Scraped categories might not perfectly match UI categories.
  // Fall back to the mock category if we found a match.
  let finalCategory = bp.category as ProductCategory
  if (mockMatch && !['protection', 'ulip', 'participating', 'non-participating', 'annuity'].includes(finalCategory)) {
    finalCategory = mockMatch.category
  }

  // Create a reasonable tagline if we don't have one
  let finalTagline = enhancements.tagline || ''
  if (!finalTagline && bp.description) {
    // If no tagline, take the first sentence of the description or truncate it
    const firstSentence = bp.description.split('.')[0]
    finalTagline = firstSentence.length > 80 ? firstSentence.substring(0, 77) + '...' : firstSentence
  }

  return {
    id: bp.product_id,
    name: bp.name,
    category: finalCategory,
    tagline: finalTagline,
    description: bp.description || '',
    minPremium: enhancements.minPremium ?? 0,
    coverageUpTo: enhancements.coverageUpTo ?? 0,
    keyBenefits: bp.key_benefits?.length ? bp.key_benefits : (enhancements.keyBenefits ?? []),
    idealFor: enhancements.idealFor ?? bp.goals_supported ?? [],
    returnType: enhancements.returnType ?? 'guaranteed',
    tenure: policyTenure,
    badge: enhancements.badge,
  }
}

// ─── Goals ───────────────────────────────────────────────────
export interface BackendGoal {
  id: string
  user_id: string
  goal_type: string
  target_amount: number
  target_year: number
  priority: number
  monthly_contribution?: number | null
  notes?: string | null
  is_active: boolean
  created_at?: string | null
  updated_at?: string | null
}

export interface BackendGoalListResponse {
  goals: BackendGoal[]
  total: number
}

export interface GoalRequest {
  goal_type: string
  target_amount: number
  target_year: number
  priority?: number
  monthly_contribution?: number | null
  notes?: string | null
}

// ─── Chat ────────────────────────────────────────────────────
export interface ChatRequest {
  message: string
  conversation_id?: string | null
}

export interface ChatResponse {
  response: string
  conversation_id: string
  extracted_context?: Record<string, unknown> | null
}

// ─── Simulation ──────────────────────────────────────────────
export interface GoalInput {
  goal_type: string
  target_amount: number
  target_year: number
  start_age?: number | null
  priority?: number
  monthly_contribution?: number | null
}

export interface SimulateRequest {
  age: number
  annual_income?: number | null
  monthly_expenses?: number | null
  dependents?: number | null
  risk_appetite?: string
  goals: GoalInput[]
  // What-If parameters
  enable_sip?: boolean | null
  inflation_rate?: number | null
  existing_savings?: number | null
  annual_increment_percent?: number | null
  retirement_age?: number | null
  child_education_abroad?: boolean | null
  expected_return_override?: number | null
}

export interface BackendGoalResult {
  goal_type: string
  target_amount: number
  future_value: number
  years_remaining: number
  monthly_savings_required: number
  current_gap: number
  projected_corpus: number
  coverage_ratio: number
  inflation_rate: number
  expected_return: number
  recommended_product_name?: string | null
  recommended_product_category?: string | null
  recommended_product_id?: string | null
}

export interface BackendYearlyProjection {
  year: number
  age: number
  total_invested: number
  projected_corpus: number
}

export interface BackendSimulateResponse {
  simulation_id?: string | null
  user_age: number
  total_monthly_savings_required: number
  total_gap: number
  goals: BackendGoalResult[]
  yearly_projections: BackendYearlyProjection[]
  disclaimers: string[]
  warnings: string[]
  timestamp?: string | null
}

export interface BackendProductSimulateRequest {
  monthly_premium: number
  tenure_years: number
  risk_appetite: string
  user_age: number
}

export interface BackendProductSimulateResponse {
  product_name: string
  product_category: string
  monthly_premium: number
  tenure_years: number
  total_invested: number
  projected_corpus: number
  expected_return_rate: number
  yearly_projections: BackendYearlyProjection[]
  warnings: string[]
  disclaimers: string[]
}

import type { SimulationResult } from '../types'

export function mapBackendSimulation(goalResult: BackendGoalResult): SimulationResult {
  return {
    goalId: goalResult.goal_type,
    corpusNeeded: Math.round(goalResult.future_value),
    coveredAmount: Math.round(goalResult.projected_corpus),
    gap: Math.round(goalResult.current_gap),
    recommendedProducts: goalResult.recommended_product_name
      ? [goalResult.recommended_product_category || 'insurance']
      : [],
    monthlyPremium: Math.round(goalResult.monthly_savings_required),
    recommendedProductName: goalResult.recommended_product_name || undefined,
    recommendedProductCategory: goalResult.recommended_product_category || undefined,
    recommendedProductId: goalResult.recommended_product_id || undefined,
  }
}

// ─── Scenarios ───────────────────────────────────────────────
export interface ScenarioRequest {
  profile: SimulateRequest
  template?: string | null
  custom_params?: Record<string, unknown> | null
  scenario_name?: string | null
}

export interface ScenarioResponse {
  scenario_name: string
  baseline: BackendSimulateResponse
  modified: BackendSimulateResponse
  delta_monthly_savings: number
  delta_total_gap: number
  summary: string
}

export interface TemplateListResponse {
  templates: Record<string, unknown>[]
}

// ─── Recommend ───────────────────────────────────────────────
export interface RecommendRequest {
  goals: Record<string, unknown>[]
  age?: number | null
  risk_appetite?: string
  n_results_per_goal?: number
}

export interface RankedProduct {
  product_name: string
  product_id: string
  category: string
  rank: number
  composite_score: number
  similarity_score: number
  goal_coverage_score: number
  category_fit_score: number
  matched_goals: string[]
  description: string
  key_benefits: string[]
  reasoning: string
}

export interface RecommendResponse {
  recommendations: RankedProduct[]
  total: number
  disclaimers: string[]
}

// ─── Conversations ───────────────────────────────────────────
export interface ConversationResponse {
  id: string
  user_id: string
  title: string
  summary?: string | null
  extracted_context?: Record<string, unknown> | null
  is_active: boolean
  created_at?: string | null
  updated_at?: string | null
}

export interface ConversationRenameRequest {
  title: string
}

export interface MessageResponse {
  id: string
  role: string
  content: string
  created_at?: string | null
}

export interface ConversationDetailResponse {
  conversation: ConversationResponse
  messages: MessageResponse[]
}
