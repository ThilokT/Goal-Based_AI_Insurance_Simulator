import type { LifeGoal, SimulationResult, WhatIfParams, UserProfile } from '../types'

export const DEFAULT_GOALS: LifeGoal[] = [
  { id: 'education', label: "Child's Higher Education", icon: '🎓', targetAge: 45, corpusNeeded: 5_000_000, coveredBy: ['ulip', 'non-participating'] },
  { id: 'home',      label: 'Buy a Home',               icon: '🏠', targetAge: 38, corpusNeeded: 8_000_000, coveredBy: ['non-participating', 'participating'] },
  { id: 'retirement',label: 'Retirement Corpus',        icon: '🧘', targetAge: 60, corpusNeeded: 30_000_000, coveredBy: ['annuity', 'ulip', 'participating'] },
  { id: 'marriage',  label: "Child's Marriage",         icon: '💍', targetAge: 52, corpusNeeded: 3_000_000, coveredBy: ['participating', 'non-participating'] },
  { id: 'legacy',    label: 'Family Protection',        icon: '🛡', targetAge: 65, corpusNeeded: 20_000_000, coveredBy: ['protection'] },
]

export function runSimulation(
  profile: UserProfile,
  params: WhatIfParams,
  goals: LifeGoal[]
): SimulationResult[] {
  return goals.map(goal => {
    const yearsToGoal = Math.max(goal.targetAge - profile.age, 1)
    const inflationFactor = Math.pow(1 + params.inflationRate / 100, yearsToGoal)
    const adjustedCorpus = Math.round(goal.corpusNeeded * inflationFactor)

    const savingsGrowth = Math.round(
      params.existingSavings * Math.pow(1.08, yearsToGoal)
    )

    const retirementAdjustment = goal.id === 'retirement'
      ? (params.retirementAge < 60 ? 1.25 : 1)
      : 1

    const abroadAdjustment = goal.id === 'education' && params.childEducationAbroad ? 2.2 : 1

    const finalCorpus = Math.round(adjustedCorpus * retirementAdjustment * abroadAdjustment)
    const covered = Math.min(savingsGrowth + Math.round(profile.income * yearsToGoal * 1.5), finalCorpus * 0.75)
    const gap = Math.max(finalCorpus - covered, 0)

    const monthlyPremium = Math.round(
      (gap / (yearsToGoal * 12)) * (profile.riskAppetite === 'conservative' ? 1.4 : profile.riskAppetite === 'moderate' ? 1.2 : 1.0)
    )

    return {
      goalId: goal.id,
      corpusNeeded: finalCorpus,
      coveredAmount: covered,
      gap,
      recommendedProducts: goal.coveredBy,
      monthlyPremium: Math.max(monthlyPremium, 2000),
    }
  })
}
