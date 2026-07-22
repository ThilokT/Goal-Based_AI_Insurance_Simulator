import { motion } from 'framer-motion'
import { cn, formatCurrency } from '../../lib/utils'
import type { SimulationResult, LifeGoal, UserProfile, WhatIfParams } from '../../types'

interface TermGoalCardProps {
  result: SimulationResult
  goal: LifeGoal
  profile: UserProfile
  whatIfParams: WhatIfParams
  event: any
  isEven: boolean
  catColor: string
  isSimulating: boolean
  updateGoalExistingSavings: (goalId: string, savings: number) => void
  updateGoalTargetAmount: (goalId: string, targetAmount: number) => void
}

export default function TermGoalCard({
  result,
  goal,
  profile,
  whatIfParams,
  event,
  isEven,
  catColor,
  isSimulating,
  updateGoalExistingSavings,
  updateGoalTargetAmount
}: TermGoalCardProps) {
  // Use what-if target or default goal corpus
  const targetCover = whatIfParams.goalTargetAmounts?.[goal.id] ?? goal.corpusNeeded
  
  // Quick Proxy Formula for realistic Term Insurance premiums
  // Rule of thumb: ~₹20/month per ₹1 Lakh of cover for a healthy ~30 year old
  const baseAge = (goal?.id && whatIfParams?.goalStartAges?.[goal.id]) ?? profile?.age ?? 30;
  const ageMultiplier = Math.max(1, 1 + ((baseAge - 30) * 0.05)) // +5% cost per year over 30
  const proxyMonthlyPremium = (targetCover / 100_000) * 20 * ageMultiplier

  const targetAge = goal.targetAge
  const yearsToGoal = Math.max(1, targetAge - baseAge)

  return (
    <motion.div 
      key={result.goalId} 
      initial={{ opacity: 0, y: 20 }} 
      animate={{ opacity: 1, y: 0 }} 
      className={cn(
        "relative flex w-full mb-12",
        isEven ? "sm:flex-row-reverse" : "sm:flex-row"
      )}
    >
      <div className="hidden sm:block sm:w-1/2" />
      
      {/* Timeline Node */}
      <div 
        className="absolute left-0 sm:left-1/2 top-10 w-5 h-5 rounded-full ring-[6px] ring-white transform sm:-translate-x-1/2 -translate-y-1/2 z-10 shadow-md transition-colors duration-500"
        style={{ backgroundColor: catColor }}
      />
      
      {/* Connector Line */}
      <div 
        className={cn(
          "absolute top-10 w-10 h-0.5 z-0 hidden sm:block",
          isEven ? "left-1/2 -ml-10" : "right-1/2 -mr-10"
        )}
        style={{ backgroundColor: catColor }}
      />

      <div className={cn(
        "ml-10 sm:ml-0 w-full sm:w-1/2 flex",
        isEven ? "sm:justify-end sm:pr-8" : "sm:justify-start sm:pl-8"
      )}>
        <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden relative">
          
          {/* Top colored accent bar */}
          <div className="h-1.5 w-full absolute top-0 left-0" style={{ backgroundColor: catColor }} />

          <div className="p-5">
            {/* Header */}
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-[10px] font-bold text-gray-400 tracking-wider uppercase mb-1">
                  Age {event.age} • {result.recommendedProductCategory === 'Term Insurance' ? 'Term Insurance' : 'Protection Plan'}
                </p>
                <h3 className="font-display font-bold text-gray-900 text-lg leading-tight">{goal.label}</h3>
                <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{result.recommendedProductName}</p>
              </div>
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-xl shrink-0" style={{ backgroundColor: `${catColor}15`, color: catColor }}>
                {goal.icon}
              </div>
            </div>

            {/* Inputs Section */}
            <div className="mb-6">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-[10px] uppercase font-bold text-gray-500">Target Life Cover</label>
                  <span className="text-xs font-bold text-gray-900">{formatCurrency(targetCover)}</span>
                </div>
                <input 
                  type="range"
                  min={100_000}
                  max={50_000_000}
                  step={100_000}
                  value={targetCover}
                  disabled={isSimulating}
                  onChange={(e) => updateGoalTargetAmount(goal.id, Number(e.target.value))}
                  className="w-full accent-blue-500 h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
              </div>
            </div>

            {/* Metrics Grid */}
            <div className="pt-4 border-t border-gray-100 grid grid-cols-2 gap-4">
              <div>
                <p className="text-[10px] font-bold text-gray-400 tracking-wider uppercase">Policy Term</p>
                <p className="font-display font-bold text-gray-900 text-xl">
                  {yearsToGoal} Years
                </p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold text-gray-400 tracking-wider uppercase">Est. Monthly Premium</p>
                <p className="font-display font-bold text-brand-navy text-xl">
                  ₹{Math.round(proxyMonthlyPremium).toLocaleString('en-IN')}
                </p>
              </div>
            </div>

          </div>
        </div>
      </div>
    </motion.div>
  )
}
