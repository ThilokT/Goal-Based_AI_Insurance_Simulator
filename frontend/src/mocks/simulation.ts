import type { LifeGoal, SimulationResult, WhatIfParams, UserProfile, YearlyProjection } from '../types'

export const DEFAULT_GOALS: LifeGoal[] = [
  { id: 'education', label: "Child's Higher Education", icon: '🎓', targetAge: 45, corpusNeeded: 5_000_000, coveredBy: ['ulip', 'non-participating'] },
  { id: 'home',      label: 'Buy a Home',               icon: '🏠', targetAge: 38, corpusNeeded: 8_000_000, coveredBy: ['non-participating', 'participating'] },
  { id: 'retirement',label: 'Retirement Corpus',        icon: '🧘', targetAge: 60, corpusNeeded: 30_000_000, coveredBy: ['annuity', 'ulip', 'participating'] },
  { id: 'marriage',  label: "Child's Marriage",         icon: '💍', targetAge: 52, corpusNeeded: 3_000_000, coveredBy: ['participating', 'non-participating'] },
  { id: 'legacy',    label: 'Family Protection',        icon: '🛡', targetAge: 65, corpusNeeded: 20_000_000, coveredBy: ['protection'] },
]

// ── Brochure-backed return rates (mirrors backend RETURN_MATRIX) ──
const RETURN_MATRIX: Record<string, Record<string, number>> = {
  conservative: { short: 0.065, medium: 0.070, long: 0.075 },
  moderate:     { short: 0.070, medium: 0.085, long: 0.090 },
  aggressive:   { short: 0.080, medium: 0.100, long: 0.110 },
}

// Goals that get ULIP wealth boosters
const ULIP_GOALS = new Set(['retirement', 'wealth_creation', 'child_education', 'education'])
const CONSERVATIVE_GOALS = new Set(['protection', 'health', 'family_security', 'family_protection', 'legacy'])

// Goal → Product mapping (mirrors backend)
const GOAL_PRODUCT_MAP: Record<string, { name: string; category: string }> = {
  retirement:       { name: 'ICICI Pru Easy Retirement',            category: 'Retirement' },
  child_education:  { name: 'ICICI Pru Smart Kid',                  category: 'Child Plan' },
  education:        { name: 'ICICI Pru Smart Kid',                  category: 'Child Plan' },
  home_purchase:    { name: 'ICICI Pru Guaranteed Wealth Protector', category: 'Endowment' },
  home:             { name: 'ICICI Pru Guaranteed Wealth Protector', category: 'Endowment' },
  protection:       { name: 'ICICI Pru iProtect Smart',            category: 'Term Insurance' },
  legacy:           { name: 'ICICI Pru iProtect Smart',            category: 'Term Insurance' },
  wealth_creation:  { name: 'ICICI Pru Signature',                 category: 'ULIP' },
  marriage:         { name: 'ICICI Pru Smart Kid',                  category: 'Child Plan' },
}

function getHorizonBucket(years: number): string {
  if (years <= 5) return 'short'
  if (years <= 12) return 'medium'
  return 'long'
}

function getBlendedReturn(riskAppetite: string, years: number, goalId: string): number {
  if (CONSERVATIVE_GOALS.has(goalId)) return 0.065
  const appetite = riskAppetite || 'moderate'
  const bucket = getHorizonBucket(years)
  return RETURN_MATRIX[appetite]?.[bucket] ?? 0.085
}

/**
 * Future value of a stepped-up SIP (SIP increases annually by `increment`).
 */
function steppedSipFutureValue(
  monthlySip: number,
  annualReturn: number,
  annualIncrement: number,
  years: number,
): number {
  if (years <= 0 || monthlySip <= 0) return 0
  if (annualIncrement <= 0) {
    // Flat SIP
    const r = annualReturn / 12
    const n = years * 12
    if (r === 0) return monthlySip * n
    return monthlySip * ((Math.pow(1 + r, n) - 1) / r) * (1 + r)
  }

  let total = 0
  const monthlyRate = annualReturn / 12
  for (let yr = 0; yr < years; yr++) {
    const yearSip = monthlySip * Math.pow(1 + annualIncrement, yr)
    // FV of 12 months of this year's SIP
    let fvYear = 0
    if (monthlyRate === 0) {
      fvYear = yearSip * 12
    } else {
      fvYear = yearSip * ((Math.pow(1 + monthlyRate, 12) - 1) / monthlyRate) * (1 + monthlyRate)
    }
    // Compound for remaining years
    const remaining = years - yr - 1
    if (remaining > 0) {
      fvYear *= Math.pow(1 + annualReturn, remaining)
    }
    total += fvYear
  }
  return total
}

/**
 * Wealth Booster: 3.25% of avg fund value, every 5 years from year 10.
 */
function wealthBoosterValue(annualSip: number, annualReturn: number, years: number): number {
  if (years < 10) return 0
  let total = 0
  for (let yr = 10; yr <= years; yr += 5) {
    // Approximate fund value at booster year
    const r = annualReturn / 12
    const n = yr * 12
    const monthlySip = annualSip / 12
    const fundAtYr = r === 0
      ? monthlySip * n
      : monthlySip * ((Math.pow(1 + r, n) - 1) / r) * (1 + r)
    let booster = fundAtYr * 0.0325
    const remaining = years - yr
    if (remaining > 0) booster *= Math.pow(1 + annualReturn, remaining)
    total += booster
  }
  return total
}

export function runSimulation(
  profile: UserProfile,
  params: WhatIfParams,
  goals: LifeGoal[]
): { goals: SimulationResult[], yearlyProjections: YearlyProjection[] } {
  const inflationRate = params.inflationRate / 100
  const annualIncrement = params.annualIncrementPercent / 100
  const existingSavingsPerGoal = (params.existingSavings || 0) / Math.max(goals.length, 1)

  const simGoals = goals.map(goal => {
    const yearsToGoal = Math.max(goal.targetAge - (profile.age || 30), 1)
    const risk = profile.riskAppetite || 'moderate'
    const blendedReturn = getBlendedReturn(risk, yearsToGoal, goal.id)

    // Inflation-adjusted corpus
    let adjustedCorpus = Math.round(goal.corpusNeeded * Math.pow(1 + inflationRate, yearsToGoal))

    // Retirement age adjustment
    if (goal.id === 'retirement') {
      const retDiff = params.retirementAge - 60
      if (retDiff < 0) {
        // Earlier retirement → larger corpus (more years to fund, less time to save)
        adjustedCorpus = Math.round(adjustedCorpus * (1 + Math.abs(retDiff) * 0.05))
      } else if (retDiff > 0) {
        adjustedCorpus = Math.round(adjustedCorpus * (1 - retDiff * 0.03))
      }
    }

    // Education abroad multiplier
    if ((goal.id === 'education' || goal.label.toLowerCase().includes('education')) && params.childEducationAbroad) {
      adjustedCorpus = Math.round(adjustedCorpus * 2.2)
    }

    // ── Projected corpus from multiple sources ──

    // 1. Existing savings compounding as lump sum
    const lumpSumFv = existingSavingsPerGoal * Math.pow(1 + blendedReturn, yearsToGoal)

    // 2. Monthly SIP (stepped up if increment > 0)
    const monthlySip = goal.corpusNeeded * 0.005 // Assume ~0.5% of target as monthly contribution
    const sipFv = steppedSipFutureValue(monthlySip, blendedReturn, annualIncrement, yearsToGoal)

    // 3. Wealth booster (ULIP goals only)
    let boosterFv = 0
    if (ULIP_GOALS.has(goal.id) && yearsToGoal >= 10) {
      boosterFv = wealthBoosterValue(monthlySip * 12, blendedReturn, yearsToGoal)
    }

    const covered = Math.min(Math.round(lumpSumFv + sipFv + boosterFv), adjustedCorpus)
    const gap = Math.max(adjustedCorpus - covered, 0)

    // Monthly premium to close the gap
    let monthlyPremium = 0
    if (gap > 0 && yearsToGoal > 0) {
      const r = blendedReturn / 12
      const n = yearsToGoal * 12
      monthlyPremium = r === 0
        ? Math.round(gap / n)
        : Math.round((gap * r) / (Math.pow(1 + r, n) - 1))
    }

    // Product recommendation
    const product = GOAL_PRODUCT_MAP[goal.id] ?? { name: 'ICICI Pru Signature', category: 'ULIP' }

    return {
      goalId: goal.id,
      corpusNeeded: adjustedCorpus,
      coveredAmount: covered,
      gap,
      recommendedProducts: goal.coveredBy,
      monthlyPremium: Math.max(monthlyPremium, 500),
      recommendedProductName: product.name,
      recommendedProductCategory: product.category,
      yearsToGoal, // internal usage for projections
      blendedReturn, // internal usage
    }
  })

  // Calculate yearly projections
  const maxYears = Math.max(...simGoals.map(g => g.yearsToGoal), 0)
  const yearlyProjections: YearlyProjection[] = []

  for (let year = 1; year <= maxYears; year++) {
    let totalInvested = 0
    let projectedCorpus = 0

    for (let i = 0; i < goals.length; i++) {
      const simGoal = simGoals[i]
      if (year > simGoal.yearsToGoal) continue

      const blendedReturn = simGoal.blendedReturn
      const monthlySip = simGoal.monthlyPremium + (goals[i].corpusNeeded * 0.005) // Current + Gap Premium

      // Lump sum
      const lumpFv = existingSavingsPerGoal * Math.pow(1 + blendedReturn, year)
      
      // SIP
      const sipFv = steppedSipFutureValue(monthlySip, blendedReturn, annualIncrement, year)
      
      // Booster
      let boosterFv = 0
      if (ULIP_GOALS.has(simGoal.goalId) && year >= 10) {
        boosterFv = wealthBoosterValue(monthlySip * 12, blendedReturn, year)
      }

      // Invested
      let investedSip = 0
      if (annualIncrement === 0) {
        investedSip = monthlySip * 12 * year
      } else {
        for (let yr = 0; yr < year; yr++) {
          investedSip += monthlySip * 12 * Math.pow(1 + annualIncrement, yr)
        }
      }

      totalInvested += existingSavingsPerGoal + investedSip
      projectedCorpus += lumpFv + sipFv + boosterFv
    }

    yearlyProjections.push({
      year,
      age: (profile.age || 30) + year,
      totalInvested: Math.round(totalInvested),
      projectedCorpus: Math.round(projectedCorpus)
    })
  }

  // Remove internal fields before returning
  const cleanedGoals = simGoals.map(g => {
    const { yearsToGoal, blendedReturn, ...rest } = g
    return rest as SimulationResult
  })

  return { goals: cleanedGoals, yearlyProjections }
}

export function runProductSimulation(
  profile: UserProfile,
  params: { monthlyPremium: number; tenureYears: number }
): import('../types/api').BackendProductSimulateResponse {
  const age = profile.age || 30
  const risk = profile.riskAppetite || 'moderate'
  
  let goalType = 'wealth_creation'
  if (risk === 'conservative') {
    goalType = age > 40 ? 'protection' : 'home_purchase'
  } else if (age >= 50) {
    goalType = 'retirement'
  }
  
  const product = GOAL_PRODUCT_MAP[goalType] || GOAL_PRODUCT_MAP['wealth_creation']
  const returnRate = RETURN_MATRIX[risk]?.long || 0.09
  
  let totalInvested = 0
  let projectedCorpus = 0
  const yearlyProjections = []
  
  for (let year = 1; year <= params.tenureYears; year++) {
    totalInvested += params.monthlyPremium * 12
    
    // SIP Future Value (standard, no stepped up for product simulation here)
    const monthlyRate = returnRate / 12
    const n = year * 12
    let sipFv = params.monthlyPremium * ((Math.pow(1 + monthlyRate, n) - 1) / monthlyRate) * (1 + monthlyRate)
    
    let boosterFv = 0
    if (product.category.toLowerCase().includes('ulip') && year >= 10) {
      boosterFv = wealthBoosterValue(params.monthlyPremium * 12, returnRate, year)
    }
    
    projectedCorpus = sipFv + boosterFv
    
    yearlyProjections.push({
      year,
      age: age + year,
      total_invested: Math.round(totalInvested),
      projected_corpus: Math.round(projectedCorpus)
    })
  }

  return {
    product_name: product.name,
    product_category: product.category,
    monthly_premium: params.monthlyPremium,
    tenure_years: params.tenureYears,
    total_invested: Math.round(totalInvested),
    projected_corpus: Math.round(projectedCorpus),
    expected_return_rate: returnRate,
    yearly_projections: yearlyProjections,
    warnings: [],
    disclaimers: []
  }
}
