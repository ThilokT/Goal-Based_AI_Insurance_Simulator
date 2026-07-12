import { motion } from 'framer-motion'
import { useAppStore } from '../../store'
import { formatCurrency } from '../../lib/utils'
import { TrendingUp, ShieldAlert, ShieldCheck } from 'lucide-react'

export default function FiveYearSnapshot() {
  const { profile, whatIfParams, simulationResults } = useAppStore()

  if (!profile || simulationResults.length === 0) return null

  // 1. Calculate 5-Year Savings Projection using risk-aware returns
  const RETURN_BY_RISK: Record<string, number> = {
    conservative: 0.075,
    moderate: 0.090,
    aggressive: 0.110,
  }
  const returnRate = RETURN_BY_RISK[profile.riskAppetite || 'moderate'] || 0.09
  const annualSavings = (profile.income || 0) * 12 * 0.20 // 20% savings rate
  
  // Future Value of existing savings (from what-if slider)
  const fvExisting = whatIfParams.existingSavings * Math.pow(1 + returnRate, 5)
  
  // Future Value of an annuity (annual savings invested each year, stepped up)
  const increment = whatIfParams.annualIncrementPercent / 100
  let fvAnnual = 0
  for (let yr = 0; yr < 5; yr++) {
    const yearSavings = annualSavings * Math.pow(1 + increment, yr)
    fvAnnual += yearSavings * Math.pow(1 + returnRate, 5 - yr - 1)
  }
  
  const projectedSavings5Y = Math.round(fvExisting + fvAnnual)

  // 2. Calculate Coverage Gap
  const totalCorpusNeeded = simulationResults.reduce((acc, r) => acc + r.corpusNeeded, 0)
  const totalCovered = simulationResults.reduce((acc, r) => acc + r.coveredAmount, 0)
  const totalGap = totalCorpusNeeded - totalCovered
  
  // Inflating by user's selected inflation rate (from what-if slider)
  const inflationRate = whatIfParams.inflationRate / 100
  const projectedCorpusNeeded5Y = totalCorpusNeeded * Math.pow(1 + inflationRate, 5)
  
  // Projected coverage gap if no action taken
  const projectedGap5Y = Math.max(0, projectedCorpusNeeded5Y - totalCovered - projectedSavings5Y)

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="card bg-gradient-to-br from-brand-navy to-[#0a4785] text-white overflow-hidden relative mb-6"
    >
      <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
        <TrendingUp size={120} />
      </div>

      <div className="relative z-10 flex flex-col md:flex-row gap-6 justify-between">
        <div className="md:w-1/2">
          <div className="flex items-center gap-2 mb-2">
            <span className="badge bg-brand-orange text-white border-none font-bold shadow-sm">5-Year Projection</span>
          </div>
          <h2 className="text-2xl font-display font-bold mb-1">Financial Snapshot at Age {profile.age + 5}</h2>
          <p className="text-blue-100 text-sm mb-6 max-w-md">
            Based on your current trajectory, here is what your savings and insurance gap will look like in 5 years if you don't adjust your protection strategy.
          </p>

          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-blue-400/30 pb-3">
              <span className="text-blue-100">Projected Savings</span>
              <span className="font-display font-bold text-xl">{formatCurrency(projectedSavings5Y)}</span>
            </div>
            <div className="flex items-center justify-between border-b border-blue-400/30 pb-3">
              <span className="text-blue-100">Projected Life Goals Cost</span>
              <span className="font-display font-bold text-xl text-amber-300">{formatCurrency(Math.round(projectedCorpusNeeded5Y))}</span>
            </div>
          </div>
        </div>

        <div className="md:w-5/12 flex flex-col justify-center">
          <div className={`p-5 rounded-2xl border ${projectedGap5Y > 0 ? 'bg-red-900/40 border-red-500/50' : 'bg-green-900/40 border-green-500/50'}`}>
            <div className="flex items-start gap-3 mb-2">
              {projectedGap5Y > 0 ? (
                <ShieldAlert className="text-red-400 shrink-0 mt-0.5" />
              ) : (
                <ShieldCheck className="text-green-400 shrink-0 mt-0.5" />
              )}
              <div>
                <h3 className="font-display font-bold text-lg">
                  {projectedGap5Y > 0 ? 'Projected Protection Gap' : 'Fully Covered'}
                </h3>
                <p className="text-sm text-gray-300">
                  {projectedGap5Y > 0 
                    ? "Your projected savings won't cover your inflated goal costs."
                    : "Your trajectory looks great. You are on track to cover your goals."}
                </p>
              </div>
            </div>
            
            {projectedGap5Y > 0 && (
              <div className="mt-4 bg-white/10 rounded-xl p-3">
                <p className="text-xs text-red-200 mb-1 font-semibold uppercase tracking-wider">Unfunded Liability in 5 Yrs</p>
                <p className="text-2xl font-display font-bold text-red-300">{formatCurrency(projectedGap5Y)}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  )
}
