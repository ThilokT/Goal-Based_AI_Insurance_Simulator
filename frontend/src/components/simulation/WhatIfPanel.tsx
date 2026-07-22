import { useRef, useCallback, useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Sliders, RefreshCw, TrendingUp, TrendingDown, WifiOff } from 'lucide-react'
import { useAppStore } from '../../store'
import { formatCurrency } from '../../lib/utils'
import { api, ApiError } from '../../lib/apiClient'
import type { SimulateRequest, BackendSimulateResponse } from '../../types/api'
import { mapBackendSimulation } from '../../types/api'
import { cn } from '../../lib/utils'
import type { SimulationResult } from '../../types'
import { runSimulation } from '../../mocks/simulation'

function SliderRow({
  label, value, min, max, step = 1, unit = '',
  onChange, color = 'brand-orange'
}: {
  label: string; value: number; min: number; max: number; step?: number; unit?: string;
  onChange: (v: number) => void; color?: string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-xs font-medium text-gray-600">{label}</label>
        <span className="text-xs font-bold text-brand-navy">{value}{unit}</span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(+e.target.value)}
        className="w-full accent-brand-orange h-1.5"
      />
      <div className="flex justify-between mt-0.5">
        <span className="text-[10px] text-gray-400">{min}{unit}</span>
        <span className="text-[10px] text-gray-400">{max}{unit}</span>
      </div>
    </div>
  )
}

export default function WhatIfPanel() {
  const { whatIfParams, setWhatIfParams, profile, goals, simulationResults, setSimulationResults, setYearlyProjections, chatContexts, conversationId, isOffline, setIsOffline, setIsSimulating, cardInvestments, cardPayouts, cardPayoutSchedules, cardInvestmentSchedules } = useAppStore()
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [payoutAsOfAge, setPayoutAsOfAge] = useState<number>(85)
  const [investmentAsOfAge, setInvestmentAsOfAge] = useState<number>(85)

  // Use chat context profile if available
  const activeChatContext = conversationId ? chatContexts[conversationId] : null
  const activeProfile = activeChatContext?.profile ? { ...profile, ...activeChatContext.profile } : profile
  const activeGoals = (activeChatContext?.goals && activeChatContext.goals.length > 0)
    ? activeChatContext.goals
    : goals

  // Debounced API simulation call — now sends what-if params
  const runApiSimulation = useCallback(async (params: typeof whatIfParams) => {
    if (!activeProfile || activeGoals.length === 0) return

    const payload: SimulateRequest = {
      age: activeProfile.age,
      annual_income: activeProfile.income ? activeProfile.income * 12 : undefined,
      monthly_expenses: activeProfile.monthlyExpenses,
      dependents: activeProfile.familySize,
      risk_appetite: activeProfile.riskAppetite,
      goals: activeGoals.map(g => ({
        goal_type: g.label,
        target_amount: params.goalTargetAmounts?.[g.id] ?? g.corpusNeeded,
        target_year: g.targetAge,
        start_age: params.goalStartAges?.[g.id] ?? activeProfile.age,
        priority: 1,
        existing_savings: params.goalExistingSavings?.[g.id] || 0,
        risk_override: params.goalRiskAppetites?.[g.id],
      })),
      // ── What-If params wired to backend ──
      inflation_rate: params.inflationRate / 100,
      existing_savings: params.existingSavings,
      annual_increment_percent: params.annualIncrementPercent / 100,
      retirement_age: params.retirementAge,
      child_education_abroad: params.childEducationAbroad,
    }

    setIsSimulating(true)
    try {
      const res = await api.post<BackendSimulateResponse>('/api/simulate', payload)
      const mapped: SimulationResult[] = res.goals.map(goalResult => {
        const result = mapBackendSimulation(goalResult)
        const localGoal = activeGoals.find(g => g.label === goalResult.goal_type)
        if (localGoal) result.goalId = localGoal.id
        return result
      })
      setSimulationResults(mapped)
      if (res.yearly_projections) {
        setYearlyProjections(
          res.yearly_projections.map((p: any) => ({
            year: p.year,
            age: p.age,
            totalInvested: p.total_invested,
            projectedCorpus: p.projected_corpus,
          }))
        )
      }
      setIsOffline(false)
    } catch {
      // Fall back to offline
      console.warn('Simulation API unavailable, setting offline state')
      setIsOffline(true)
    } finally {
      setIsSimulating(false)
    }
  }, [activeProfile, activeGoals, setSimulationResults, setIsOffline, setIsSimulating])

  const cumulativePayoutByAge = useMemo(() => {
    let total = 0;
    activeGoals.forEach(g => {
      const events = cardPayoutSchedules?.[g.id];
      if (Array.isArray(events)) {
        events.forEach(event => {
          if (event && event.age <= payoutAsOfAge) {
            total += (event.amount || 0);
          }
        });
      }
    });
    return total;
  }, [cardPayoutSchedules, payoutAsOfAge, activeGoals]);

  const cumulativeInvestmentByAge = useMemo(() => {
    let total = 0;
    activeGoals.forEach(g => {
      const events = cardInvestmentSchedules?.[g.id];
      if (Array.isArray(events)) {
        events.forEach(event => {
          if (event && event.age <= investmentAsOfAge) {
            total += (event.amount || 0);
          }
        });
      }
    });
    return total;
  }, [cardInvestmentSchedules, investmentAsOfAge, activeGoals]);

  function update(key: keyof typeof whatIfParams, value: number | boolean | Record<string, number>) {
    const next = { ...whatIfParams, [key]: value } as typeof whatIfParams
    setWhatIfParams({ [key]: value })

    // Set simulating to true immediately to show Calculating UI while dragging sliders
    setIsSimulating(true)

    // Debounce API calls (500ms)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      if (activeProfile) {
        runApiSimulation(next).catch(() => {
          setIsOffline(true)
        })
      }
    }, 500)
  }

  function updateGoalStartAge(goalId: string, age: number) {
    const nextAges = { ...(whatIfParams.goalStartAges || {}), [goalId]: age }
    update('goalStartAges', nextAges)
  }

  function reset() {
    const defaults = {
      retirementAge: 60,
      childEducationAbroad: false,
      inflationRate: 6,
      existingSavings: 500_000,
      annualIncrementPercent: 8,
      goalTargetAges: {},
      goalTargetAmounts: {},
      goalExistingSavings: {},
      enableSip: true,
      goalRiskAppetites: {}
    }
    setWhatIfParams(defaults)
    
    // Optimistic reset
    if (activeProfile && activeGoals.length > 0) {
      const { goals: offlineResults, yearlyProjections } = runSimulation(activeProfile as any, defaults, activeGoals)
      setSimulationResults(offlineResults)
      setYearlyProjections(yearlyProjections)
    }
    if (activeProfile) {
      runApiSimulation(defaults).catch(() => {
        setIsOffline(true)
      })
    }
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="card">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Sliders size={16} className="text-brand-orange" />
              <h3 className="font-display font-semibold text-gray-900 text-sm">What-If Controls</h3>
              {isOffline && (
                <span className="inline-flex items-center gap-1 text-[10px] text-red-500 font-medium bg-red-50 px-2 py-0.5 rounded">
                  <WifiOff size={9} /> API Offline
                </span>
              )}
            </div>
            <button onClick={reset} className="btn-ghost text-xs py-1 px-2">
              <RefreshCw size={12} /> Reset
            </button>
          </div>

          <div className="space-y-5">



            <div className="bg-orange-50/50 p-3 rounded-lg border border-orange-100 flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-gray-700">Total Invested</label>
              <span className="text-sm font-bold text-[#b73238]">
                {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(
                  activeGoals.reduce((sum, g) => sum + (Number(cardInvestments?.[g.id]) || 0), 0)
                )}
              </span>
            </div>

            {/* ── Investment as of Age ── */}
            <div className="bg-orange-50/50 p-3 rounded-lg border border-orange-100 mb-6">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-medium text-gray-700">Investment as of Age</label>
                <span className="text-xs font-bold text-brand-navy">{investmentAsOfAge} yrs</span>
              </div>
              <input
                type="range"
                min={activeProfile?.age || 18}
                max={85}
                step={1}
                value={investmentAsOfAge}
                onChange={e => setInvestmentAsOfAge(+e.target.value)}
                className="w-full accent-[#b73238] h-1.5"
              />
              <div className="flex justify-between mt-0.5">
                <span className="text-[10px] text-gray-400">{activeProfile?.age || 18} yrs</span>
                <span className="text-[10px] text-gray-400">85 yrs</span>
              </div>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-[10px] font-medium text-gray-500">Total Invested by Age {investmentAsOfAge}</span>
                <span className="text-sm font-bold text-[#b73238]">
                  {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(cumulativeInvestmentByAge)}
                </span>
              </div>
            </div>

            <div className="bg-emerald-50/50 p-3 rounded-lg border border-emerald-100 flex items-center justify-between">
              <label className="text-xs font-medium text-gray-700">Total Payout</label>
              <span className="text-sm font-bold text-emerald-700">
                {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(
                  activeGoals.reduce((sum, g) => sum + (Number(cardPayouts?.[g.id]) || 0), 0)
                )}
              </span>
            </div>

            {/* ── Payout as of Age ── */}
            <div className="bg-blue-50/50 p-3 rounded-lg border border-blue-100">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-medium text-gray-700">Payout as of Age</label>
                <span className="text-xs font-bold text-brand-navy">{payoutAsOfAge} yrs</span>
              </div>
              <input
                type="range"
                min={activeProfile?.age || 18}
                max={85}
                step={1}
                value={payoutAsOfAge}
                onChange={e => setPayoutAsOfAge(+e.target.value)}
                className="w-full accent-blue-500 h-1.5"
              />
              <div className="flex justify-between mt-0.5">
                <span className="text-[10px] text-gray-400">{activeProfile?.age || 18} yrs</span>
                <span className="text-[10px] text-gray-400">85 yrs</span>
              </div>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-[10px] font-medium text-gray-500">Total Payout by Age {payoutAsOfAge}</span>
                <span className="text-sm font-bold text-blue-700">
                  {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(cumulativePayoutByAge)}
                </span>
              </div>
            </div>


            {activeGoals.length > 0 && (
              <div className="pt-4 border-t border-gray-100">
                <h4 className="text-xs font-semibold text-gray-900 mb-3">Investment Start Ages</h4>
                <div className="space-y-4">
                  {activeGoals.map(g => {
                    const currentStart = whatIfParams.goalStartAges?.[g.id] ?? (activeProfile?.age || 18)
                    return (
                        <SliderRow
                          key={g.id}
                          label={g.label}
                          value={currentStart}
                          min={activeProfile?.age || 18}
                          max={Math.max(55, activeProfile?.age || 18)}
                          unit=" yrs"
                          onChange={v => updateGoalStartAge(g.id, v)}
                        />
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
    </div>
  )
}
