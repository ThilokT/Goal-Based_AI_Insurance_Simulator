import { useRef, useCallback, useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Sliders, RefreshCw, TrendingUp, TrendingDown, WifiOff } from 'lucide-react'
import { useAppStore } from '../../store'
import { formatCurrency } from '../../lib/utils'
import { runSimulation } from '../../mocks/simulation'
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
  const { whatIfParams, setWhatIfParams, profile, goals, simulationResults, setSimulationResults } = useAppStore()
  const [usingFallback, setUsingFallback] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Debounced API simulation call
  const runApiSimulation = useCallback(async (params: typeof whatIfParams) => {
    if (!profile || goals.length === 0) return

    // Build the SimulateRequest from profile + params + goals
    const payload: SimulateRequest = {
      age: profile.age,
      annual_income: profile.income * 12,
      monthly_expenses: undefined,
      dependents: profile.familySize,
      risk_appetite: profile.riskAppetite,
      goals: goals.map(g => ({
        goal_type: g.label,
        target_amount: g.corpusNeeded,
        target_year: g.targetAge,
        priority: 1,
      })),
    }

    try {
      const res = await api.post<BackendSimulateResponse>('/api/simulate', payload)
      const mapped: SimulationResult[] = res.goals.map(goalResult => {
        const result = mapBackendSimulation(goalResult)
        // Try to find the matching local goal by type
        const localGoal = goals.find(g => g.label === goalResult.goal_type)
        if (localGoal) result.goalId = localGoal.id
        return result
      })
      setSimulationResults(mapped)
      setUsingFallback(false)
    } catch {
      // Fall back to local simulation
      console.warn('Simulation API unavailable, using local calculation')
      const results = runSimulation(profile, params, goals)
      setSimulationResults(results)
      setUsingFallback(true)
    }
  }, [profile, goals, setSimulationResults])

  function update(key: keyof typeof whatIfParams, value: number | boolean) {
    const next = { ...whatIfParams, [key]: value }
    setWhatIfParams({ [key]: value })

    // Debounce API calls (500ms)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      if (profile) {
        runApiSimulation(next).catch(() => {
          // Fallback to local
          const results = runSimulation(profile, next, goals)
          setSimulationResults(results)
          setUsingFallback(true)
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
    if (profile) {
      runApiSimulation(defaults).catch(() => {
        setSimulationResults(runSimulation(profile, defaults, goals))
        setUsingFallback(true)
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
              {usingFallback && (
                <span className="inline-flex items-center gap-1 text-[10px] text-amber-500">
                  <WifiOff size={9} /> offline
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
              label="Existing savings"
              value={whatIfParams.existingSavings}
              min={0} max={5_000_000} step={50000}
              unit=""
              onChange={v => update('existingSavings', v)}
            />

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-medium text-gray-600">Existing savings</label>
                <span className="text-xs font-bold text-brand-navy">{formatCurrency(whatIfParams.existingSavings)}</span>
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
