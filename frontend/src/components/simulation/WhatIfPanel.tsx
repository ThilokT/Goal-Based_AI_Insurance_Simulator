import { motion } from 'framer-motion'
import { Sliders, RefreshCw, TrendingUp, TrendingDown } from 'lucide-react'
import { useAppStore } from '../../store'
import { formatCurrency } from '../../lib/utils'
import { runSimulation } from '../../mocks/simulation'
import { cn } from '../../lib/utils'

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

  function update(key: keyof typeof whatIfParams, value: number | boolean) {
    const next = { ...whatIfParams, [key]: value }
    setWhatIfParams({ [key]: value })
    if (profile) {
      const results = runSimulation(profile, next, goals)
      setSimulationResults(results)
    }
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
    if (profile) setSimulationResults(runSimulation(profile, defaults, goals))
  }

  const totalCorpus = simulationResults.reduce((s, r) => s + r.corpusNeeded, 0)
  const totalCovered = simulationResults.reduce((s, r) => s + r.coveredAmount, 0)
  const totalGap = simulationResults.reduce((s, r) => s + r.gap, 0)
  const totalPremium = simulationResults.reduce((s, r) => s + r.monthlyPremium, 0)

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      {/* Controls */}
      <div className="lg:col-span-1 space-y-4">
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Sliders size={16} className="text-brand-orange" />
              <h3 className="font-display font-semibold text-gray-900 text-sm">What-If Controls</h3>
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

      {/* Impact summary */}
      <div className="lg:col-span-2 space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total corpus needed', value: formatCurrency(totalCorpus), sub: 'across all goals', color: 'text-brand-navy' },
            { label: 'Total covered',       value: formatCurrency(totalCovered), sub: 'by recommended products', color: 'text-green-600' },
            { label: 'Total gap',           value: formatCurrency(totalGap), sub: 'needs to be filled', color: 'text-red-500' },
            { label: 'Combined premium',    value: `₹${(totalPremium / 1000).toFixed(1)}K/mo`, sub: 'estimated monthly outgo', color: 'text-brand-orange' },
          ].map(stat => (
            <div key={stat.label} className="card p-4">
              <p className="section-label mb-2">{stat.label}</p>
              <p className={`text-xl font-display font-bold ${stat.color}`}>{stat.value}</p>
              <p className="text-[10px] text-gray-400 mt-0.5">{stat.sub}</p>
            </div>
          ))}
        </div>

        <div className="card">
          <h3 className="font-display font-semibold text-gray-900 text-sm mb-4">Goal-wise Impact</h3>
          <div className="space-y-4">
            {simulationResults.map(result => {
              const goal = goals.find(g => g.id === result.goalId)
              const pct = Math.round((result.coveredAmount / result.corpusNeeded) * 100)
              const isGood = pct >= 80
              return (
                <div key={result.goalId}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{goal?.icon}</span>
                      <span className="text-xs font-medium text-gray-700">{goal?.label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {isGood
                        ? <TrendingUp size={13} className="text-green-500" />
                        : <TrendingDown size={13} className="text-red-400" />
                      }
                      <span className={`text-xs font-bold ${isGood ? 'text-green-600' : 'text-red-500'}`}>{pct}%</span>
                    </div>
                  </div>
                  <div className="relative w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                    <motion.div
                      className={cn('h-full rounded-full', isGood ? 'bg-green-400' : 'bg-brand-orange')}
                      animate={{ width: `${Math.min(pct, 100)}%` }}
                      transition={{ duration: 0.5, ease: 'easeOut' }}
                    />
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-[10px] text-gray-400">
                      Corpus: {formatCurrency(result.corpusNeeded)}
                    </span>
                    <span className="text-[10px] text-gray-400">
                      Gap: <span className="text-red-400 font-medium">{formatCurrency(result.gap)}</span>
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
