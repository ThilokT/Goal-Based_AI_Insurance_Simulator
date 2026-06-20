import { useRef, useCallback, useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Sliders, RefreshCw, TrendingUp, TrendingDown, WifiOff } from 'lucide-react'
import { useAppStore } from '../../store'
import { formatCurrency } from '../../lib/utils'
import { api, ApiError } from '../../lib/apiClient'
import type { SimulateRequest, BackendSimulateResponse } from '../../types/api'
import { mapBackendSimulation } from '../../types/api'
import { cn } from '../../lib/utils'
import type { SimulationResult } from '../../types'

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
  const { whatIfParams, setWhatIfParams, profile, goals, simulationResults, setSimulationResults, chatContexts, conversationId, isOffline, setIsOffline, setIsSimulating } = useAppStore()
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

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
        target_amount: g.corpusNeeded,
        target_year: g.targetAge,
        priority: 1,
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
      setIsOffline(false)
    } catch {
      // Fall back to offline
      console.warn('Simulation API unavailable, setting offline state')
      setIsOffline(true)
    } finally {
      setIsSimulating(false)
    }
  }, [activeProfile, activeGoals, setSimulationResults, setIsOffline, setIsSimulating])

  function update(key: keyof typeof whatIfParams, value: number | boolean) {
    const next = { ...whatIfParams, [key]: value }
    setWhatIfParams({ [key]: value })

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

  function reset() {
    const defaults = {
      retirementAge: 60,
      childEducationAbroad: false,
      inflationRate: 6,
      existingSavings: 500_000,
      annualIncrementPercent: 8,
    }
    setWhatIfParams(defaults)
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
            <SliderRow
              label="Retirement age"
              value={whatIfParams.retirementAge}
              min={45} max={70}
              onChange={v => update('retirementAge', v)}
            />
            <SliderRow
              label="Inflation assumption"
              value={whatIfParams.inflationRate}
              min={4} max={12} unit="%"
              onChange={v => update('inflationRate', v)}
            />
            <SliderRow
              label="Annual SIP step-up"
              value={whatIfParams.annualIncrementPercent}
              min={0} max={20} unit="%"
              onChange={v => update('annualIncrementPercent', v)}
            />

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-medium text-gray-600">Existing savings</label>
                <span className="text-xs font-bold text-brand-navy">{formatCurrency(whatIfParams.existingSavings)}</span>
              </div>
              <input
                type="range"
                min={0} max={5_000_000} step={50000}
                value={whatIfParams.existingSavings}
                onChange={e => update('existingSavings', +e.target.value)}
                className="w-full accent-brand-orange h-1.5"
              />
              <div className="flex justify-between mt-0.5">
                <span className="text-[10px] text-gray-400">₹0</span>
                <span className="text-[10px] text-gray-400">₹50L</span>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl border border-gray-200">
              <div>
                <p className="text-xs font-medium text-gray-700">Child abroad education</p>
                <p className="text-[10px] text-gray-400">Adds 2.2x to education corpus</p>
              </div>
              <button
                onClick={() => update('childEducationAbroad', !whatIfParams.childEducationAbroad)}
                className={cn(
                  'relative w-10 h-5 rounded-full transition-colors',
                  whatIfParams.childEducationAbroad ? 'bg-brand-orange' : 'bg-gray-200'
                )}
              >
                <motion.div
                  animate={{ x: whatIfParams.childEducationAbroad ? 20 : 2 }}
                  className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow"
                />
              </button>
            </div>
          </div>
        </div>
    </div>
  )
}
