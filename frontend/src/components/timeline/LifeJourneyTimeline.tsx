import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useAppStore } from '../../store'
import { formatCurrency, cn } from '../../lib/utils'
import { api } from '../../lib/apiClient'
import type { SimulateRequest, BackendSimulateResponse } from '../../types/api'
import { mapBackendSimulation } from '../../types/api'
import type { SimulationResult } from '../../types'
import UlipGoalCard from './UlipGoalCard'
import IProtectGoalCard from './IProtectGoalCard'
import TermGoalCard from './TermGoalCard'
import WishGoalCard from './WishGoalCard'
import SmartKidGoalCard from './SmartKidGoalCard'
import GppFlexiGoalCard from './GppFlexiGoalCard'
import GiftProGoalCard from './GiftProGoalCard'
import ProtectNGainCard from './ProtectNGainCard'
import { CATEGORY_META } from '../../mocks/products'

const CATEGORY_COLORS: Record<string, string> = {
  protection:          '#F36F21',
  ulip:                '#003366',
  participating:       '#C9A84C',
  'non-participating': '#22C55E',
  annuity:             '#9333EA',
}
import WhatIfPanel from '../simulation/WhatIfPanel'

const GoalTargetSlider = ({ goal, currentAmount, isEven }: { goal: any, currentAmount: number, isEven: boolean }) => {
  const [localAmount, setLocalAmount] = useState(currentAmount)
  const { whatIfParams, setWhatIfParams } = useAppStore()

  useEffect(() => {
    setLocalAmount(currentAmount)
  }, [currentAmount])

  return (
    <>
      <div className={cn("flex items-center justify-between mb-1.5", isEven ? "flex-row-reverse" : "")}>
        <label className="text-[9px] text-gray-500 font-medium uppercase tracking-wider">Cost Today</label>
        <span className="text-[10px] font-bold text-brand-navy">
          {formatCurrency(localAmount)}
        </span>
      </div>
      <input
        type="range"
        min={100000}
        max={50000000}
        step={100000}
        value={localAmount}
        onChange={(e) => setLocalAmount(+e.target.value)}
        onMouseUp={() => {
          if (goal?.id && localAmount !== currentAmount) {
            const nextAmounts = { ...(whatIfParams.goalTargetAmounts || {}), [goal.id]: localAmount }
            setWhatIfParams({ goalTargetAmounts: nextAmounts })
          }
        }}
        onTouchEnd={() => {
          if (goal?.id && localAmount !== currentAmount) {
            const nextAmounts = { ...(whatIfParams.goalTargetAmounts || {}), [goal.id]: localAmount }
            setWhatIfParams({ goalTargetAmounts: nextAmounts })
          }
        }}
        className={cn("w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-brand-orange")}
        dir={isEven ? "rtl" : "ltr"}
      />
    </>
  )
}

import ProductSimulationView from '../simulation/ProductSimulationView'

function Legend() {
  return (
    <div className="flex flex-wrap gap-4 mb-6">
      {Object.entries(CATEGORY_META).map(([cat, meta]) => (
        <div key={cat} className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full" style={{ background: CATEGORY_COLORS[cat] }} />
          <span className="text-xs text-gray-500">{meta.label}</span>
        </div>
      ))}
      <div className="flex items-center gap-1.5">
        <div className="w-3 h-3 rounded-full bg-gray-200" />
        <span className="text-xs text-gray-500">Coverage gap</span>
      </div>
    </div>
  )
}

export default function LifeJourneyTimeline() {
  const { 
    profile: globalProfile, 
    goals: globalGoals, 
    whatIfParams, 
    simulationResults,
    setYearlyProjections,
    setSimulationResults,
    chatContexts,
    conversationId,
    isOffline,
    setIsOffline,
    isSimulating,
    setIsSimulating,
    simulationMode,
    setSimulationMode,
    setWhatIfParams
  } = useAppStore()

  // Pull isolated chat context
  const activeChatContext = conversationId ? chatContexts[conversationId] : null;

  const [annuityPptMap, setAnnuityPptMap] = useState<Record<string, number>>({})
  
  // Merge the chat profile over the global profile (so missing fields fallback to global)
  const profile = activeChatContext?.profile 
    ? { ...globalProfile, ...activeChatContext.profile } 
    : globalProfile;

  // Use chat extracted goals if available, otherwise fallback to global goals
  const goals = (activeChatContext?.goals && activeChatContext.goals.length > 0)
    ? activeChatContext.goals
    : globalGoals;

  const currentAge = profile?.age ?? 30

  function updateGoalRiskAppetite(goalId: string, risk: 'conservative' | 'moderate' | 'aggressive') {
    const nextRisks = { ...(whatIfParams.goalRiskAppetites || {}), [goalId]: risk }
    setWhatIfParams({ goalRiskAppetites: nextRisks })
  }

  function updateGoalExistingSavings(goalId: string, savings: number) {
    const nextSavings = { ...(whatIfParams.goalExistingSavings || {}), [goalId]: savings }
    setWhatIfParams({ goalExistingSavings: nextSavings })
  }

  function updateGoalTargetAmount(goalId: string, targetAmount: number) {
    const nextTarget = { ...(whatIfParams.goalTargetAmounts || {}), [goalId]: targetAmount }
    setWhatIfParams({ goalTargetAmounts: nextTarget })
  }

  useEffect(() => {
    if (!profile || goals.length === 0 || simulationMode === 'product') return

    setIsSimulating(true)

    const timeoutId = setTimeout(() => {
      async function runSim() {
        try {
          const payload: SimulateRequest = {
            age: profile!.age,
            annual_income: profile!.income ? profile!.income * 12 : undefined,
            monthly_expenses: profile!.monthlyExpenses,
            dependents: profile!.familySize,
            risk_appetite: profile!.riskAppetite,
            goals: goals.map(g => ({
              goal_type: g.label,
              target_amount: whatIfParams.goalTargetAmounts?.[g.id] ?? g.corpusNeeded,
              target_year: whatIfParams.goalTargetAges?.[g.id] ?? g.targetAge,
              priority: 1,
              existing_savings: whatIfParams.goalExistingSavings?.[g.id] || 0,
              risk_override: whatIfParams.goalRiskAppetites?.[g.id],
            })),
            // What-If params
            enable_sip: whatIfParams.enableSip,
            inflation_rate: whatIfParams.inflationRate / 100,
            existing_savings: whatIfParams.existingSavings,
            annual_increment_percent: whatIfParams.enableSip ? whatIfParams.annualIncrementPercent / 100 : 0,
            retirement_age: whatIfParams.retirementAge,
            child_education_abroad: whatIfParams.childEducationAbroad,
          }
          const res = await api.post<BackendSimulateResponse>('/api/simulate', payload)
          const mapped: SimulationResult[] = res.goals.map(goalResult => {
            const result = mapBackendSimulation(goalResult)
            const localGoal = goals.find(g => g.label === goalResult.goal_type)
            if (localGoal) result.goalId = localGoal.id
            return result
          })
          setSimulationResults(mapped)
          setYearlyProjections(res.yearly_projections || [])
          setIsOffline(false)
        } catch {
          // Backend unavailable
          console.warn('Timeline: Simulation API unavailable, going offline')
          setIsOffline(true)
        } finally {
          setIsSimulating(false)
        }
      }
      runSim()
    }, 500)

    return () => clearTimeout(timeoutId)
  }, [JSON.stringify(profile), JSON.stringify(whatIfParams), JSON.stringify(goals), simulationMode])

  if (!profile) {
    return (
      <div className="card flex flex-col items-center justify-center py-20 text-center">
        <div className="w-14 h-14 gradient-orange rounded-2xl flex items-center justify-center mb-4 shadow-orange">
          <span className="text-white text-2xl">📍</span>
        </div>
        <h3 className="font-display font-semibold text-gray-900 mb-2">Your Life Journey starts with a conversation</h3>
        <p className="text-sm text-gray-500 max-w-xs">Complete the AI chat or the onboarding wizard to generate your personalised timeline.</p>
      </div>
    )
  }

  // Build sorted timeline events
  const events = simulationResults.map(result => {
    const goal = goals.find(g => g.id === result.goalId)
    const effectiveAge = goal ? (whatIfParams.goalTargetAges?.[goal.id] ?? goal.targetAge) : (currentAge + 10)
    return {
      result,
      goal,
      age: effectiveAge,
      type: 'goal' as const
    }
  })

  // Note: Global Retirement Marker removed because Retirement age slider was removed

  // Sort chronologically
  events.sort((a, b) => a.age - b.age)


  return (
    <div>
      <div className="flex justify-between items-end mb-6">
        <div>
          <h1 className="text-3xl font-display font-bold text-gray-900">Life Journey</h1>
          <p className="text-gray-500 mt-1">Visualize your goals and financial trajectory over time.</p>
        </div>
        
        {/* Mode Toggle */}
        <div className="flex bg-gray-100 p-1 rounded-lg border border-gray-200 shadow-sm">
          <button
            onClick={() => setSimulationMode('goals')}
            className={cn(
              "px-4 py-1.5 text-sm font-medium rounded-md transition-colors",
              simulationMode === 'goals' 
                ? "bg-white text-brand-navy shadow-sm" 
                : "text-gray-500 hover:text-gray-700"
            )}
          >
            Goal Timeline
          </button>
          <button
            onClick={() => setSimulationMode('product')}
            className={cn(
              "px-4 py-1.5 text-sm font-medium rounded-md transition-colors",
              simulationMode === 'product' 
                ? "bg-white text-brand-navy shadow-sm" 
                : "text-gray-500 hover:text-gray-700"
            )}
          >
            Product Simulation
          </button>
        </div>
      </div>
      
      {simulationMode === 'product' ? (
        <ProductSimulationView />
      ) : isOffline ? (
        <div className="card flex flex-col items-center justify-center py-20 text-center col-span-full mx-auto w-full max-w-3xl mt-10">
          <div className="w-14 h-14 bg-red-100 rounded-2xl flex items-center justify-center mb-4 border border-red-200">
            <span className="text-red-500 text-2xl">🔌</span>
          </div>
          <h3 className="font-display font-semibold text-gray-900 mb-2">You are offline</h3>
          <p className="text-sm text-gray-500 max-w-md">
            The Simulation API is currently unreachable. Please make sure your backend server is running and your internet connection is active, then refresh the page.
          </p>
        </div>
      ) : (
        <div className="grid lg:grid-cols-4 gap-6 lg:h-[calc(100vh-8rem)]">
          {/* Left panel: What-If simulation engine */}
          <div className="lg:col-span-1 space-y-6 lg:overflow-y-auto pr-1 pb-10">
            <WhatIfPanel />
          </div>

          {/* Right panel: Visual Life Simulation */}
          <div className="lg:col-span-3 space-y-6 lg:overflow-y-auto pr-1 pb-10 relative">
            
            {/* Loading Indicator */}
            {isSimulating && (
              <div className="absolute top-0 inset-x-0 h-1 bg-orange-100 overflow-hidden rounded-full z-10">
                <motion.div 
                  className="h-full bg-brand-orange w-1/3"
                  animate={{ x: ["-100%", "300%"] }}
                  transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                />
              </div>
            )}
            
            <div className="card overflow-hidden">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="font-display font-bold text-gray-900 text-lg">Life Journey Timeline</h2>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {profile.name} · Age {currentAge} → 80 · {goals.length} milestones mapped
                  </p>
                </div>
                <div className="badge-orange text-xs shadow-sm">Live simulation</div>
              </div>
              <Legend />

              <div className="bg-brand-cream/30 p-4 rounded-xl border border-brand-orange/10 mb-8 mt-6">
                <h4 className="font-display font-bold text-brand-navy text-sm mb-2 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-brand-orange/10 flex items-center justify-center text-brand-orange">💡</span>
                  How to read this simulation
                </h4>
                <ul className="text-xs text-gray-600 space-y-2">
                  <li className="flex items-start gap-2">
                    <span className="text-brand-orange font-bold mt-0.5">•</span> 
                    <span><strong>Visual Dots:</strong> Each colored dot on the center line represents a life goal. The color tells you the primary recommended product category for that goal (e.g., Orange for Protection, Blue for ULIP).</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-brand-orange font-bold mt-0.5">•</span> 
                    <span><strong>Goal Cards:</strong> Shows the total corpus needed at that age, and how much is projected to be covered by the AI's recommended products.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-brand-orange font-bold mt-0.5">•</span> 
                    <span><strong>Coverage Bar:</strong> A quick visual indicator. If the bar is green, you are well covered (80%+). If it's orange, there is a gap you should review.</span>
                  </li>
                </ul>
              </div>

              <div className={cn(
                "relative py-8 px-4 sm:px-12 mt-4 bg-gray-50/50 rounded-2xl border border-gray-100 transition-all duration-300",
                isSimulating && "opacity-50 blur-sm pointer-events-none"
              )}>
                {/* Main vertical line */}
                <div className="absolute left-8 sm:left-1/2 top-0 bottom-0 w-1.5 bg-gradient-to-b from-brand-orange via-brand-navy to-purple-400 transform sm:-translate-x-1/2 rounded-full opacity-20" />

                {/* Today Marker */}
                <div className="relative flex items-center mb-16 sm:justify-center">
                  <div className="absolute left-0 sm:left-1/2 w-5 h-5 rounded-full bg-brand-orange ring-[6px] ring-white transform sm:-translate-x-1/2 z-10 shadow-md flex items-center justify-center">
                    <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                  </div>
                  <div className="ml-10 sm:ml-0 sm:absolute sm:right-1/2 sm:pr-8 text-right w-full sm:w-auto">
                    <span className="inline-block px-3 py-1 bg-brand-orange text-white text-xs font-bold rounded-full shadow-md uppercase tracking-wider">Today (Age {currentAge})</span>
                  </div>
                </div>

                <div className="space-y-10">
                  {events.map((event, i) => {
                    const isEven = i % 2 === 0
                    
                    const { result, goal } = event
                    
                    if (!goal) return null

                    const primaryCat = result.recommendedProducts[0] as string
                    const catColor = CATEGORY_COLORS[primaryCat] ?? '#ccc'
                    const coverPct = result.corpusNeeded > 0 ? Math.round((result.coveredAmount / result.corpusNeeded) * 100) : 0
                    const isGood = coverPct >= 80
                    
                    const currentPpt = annuityPptMap[result.goalId] ?? 7
                    
                    // Keep the annual premium constant based on the default 7-year assumption
                    const baseAnnualPremium = (result?.coveredAmount || 0) / 7
                    const yearsToRetirement = Math.max(1, (goal?.targetAge || 60) - (profile?.age || 30))
                    
                    // Calculate true future value based on selected PPT compounding at 6.5% (ICICI Annuity Yield)
                    const r = 0.065
                    let projectedCorpus = 0
                    if (currentPpt === 1) {
                      projectedCorpus = baseAnnualPremium * Math.pow(1 + r, yearsToRetirement)
                    } else {
                      // Future value of annuity due (paying at start of year)
                      const accumulationYears = Math.min(currentPpt, yearsToRetirement)
                      const defermentYears = Math.max(0, yearsToRetirement - accumulationYears)
                      
                      const fvAccumulation = baseAnnualPremium * ((Math.pow(1 + r, accumulationYears) - 1) / r) * (1 + r)
                      projectedCorpus = fvAccumulation * Math.pow(1 + r, defermentYears)
                    }
                    
                    // For GPP Flexi, apply the ~13.33% annuity conversion rate to the projected corpus
                    // (Actually in reality it's on total premium, but we simulate it on the compounded corpus for realism)
                    // Wait, if it's 13.33% on TOTAL premium, let's just do that to match exactly what ICICI website does!
                    // ICICI GPP Flexi formula: Pension = Total Premium * Annuity Rate.
                    // The annuity rate changes based on deferment. Longer deferment = higher rate.
                    // But we can approximate it using the compounded corpus * a standard withdrawal rate (e.g. 6.5%)
                    // Or we can use Total Premium * dynamic rate. Let's use the Compounded Corpus * 6.5% to be actuarially accurate.
                    // Or to keep the "₹42K" baseline they saw earlier, let's use the total premium approach but scale it.
                    // Let's use: Pension = Total Premium Paid * (13.33% * time multiplier)
                    // Actually, mathematically, let's just use: projectedCorpus * 0.08 (8% withdrawal rate on compounded corpus)
                    const dynamicPension = projectedCorpus * 0.08
                    
                    const totalPaid = baseAnnualPremium * currentPpt
                    const assumedLifeExpectancy = 85
                    const retirementYears = Math.max(10, assumedLifeExpectancy - (goal?.targetAge || 60))
                    const lifetimePayout = dynamicPension * retirementYears

                    if (result.recommendedProductId === 'icici-pru-gpp-flexi') {
                      return (
                        <GppFlexiGoalCard
                          key={result.goalId}
                          result={result}
                          goal={goal!}
                          profile={profile!}
                          event={event}
                          isEven={isEven}
                          catColor={catColor}
                          isSimulating={isSimulating}
                        />
                      )
                    }

                    if (result.recommendedProductId === 'icici-pru-smartkid-360') {
                      return (
                        <SmartKidGoalCard
                          key={result.goalId}
                          result={result}
                          goal={goal!}
                          profile={profile!}
                          event={event}
                          isEven={isEven}
                          catColor={catColor}
                          isSimulating={isSimulating}
                        />
                      )
                    }

                    if (result.recommendedProductId === 'icici-pru-gift-pro') {
                      return (
                        <GiftProGoalCard
                          key={result.goalId}
                          result={result}
                          goal={goal!}
                          profile={profile!}
                          whatIfParams={whatIfParams}
                          event={event}
                          isEven={isEven}
                          catColor={catColor}
                          isSimulating={isSimulating}
                          updateGoalTargetAmount={updateGoalTargetAmount}
                        />
                      )
                    }

                    if (
                      result.recommendedProductId === 'icici-pru-protect-n-gain' || 
                      result.recommendedProductName?.toLowerCase().includes('protect n gain')
                    ) {
                      return (
                        <ProtectNGainCard
                          key={result.goalId}
                          result={result}
                          goal={goal!}
                          profile={profile!}
                          whatIfParams={whatIfParams}
                          event={event}
                          isEven={isEven}
                          catColor={catColor}
                          isSimulating={isSimulating}
                          updateGoalTargetAmount={updateGoalTargetAmount}
                        />
                      )
                    }

                    if (primaryCat?.toLowerCase()?.includes('ulip')) {
                      return (
                        <UlipGoalCard
                          key={result.goalId}
                          result={result}
                          goal={goal!}
                          profile={profile!}
                          whatIfParams={whatIfParams}
                          event={event}
                          isEven={isEven}
                          catColor={catColor}
                          isSimulating={isSimulating}
                          updateGoalRiskAppetite={updateGoalRiskAppetite}
                          updateGoalExistingSavings={updateGoalExistingSavings}
                          updateGoalTargetAmount={updateGoalTargetAmount}
                        />
                      )
                    }

                    if (result.recommendedProductId === 'icici-pru-iprotect-smart') {
                      return (
                        <IProtectGoalCard
                          key={result.goalId}
                          result={result}
                          goal={goal!}
                          profile={profile!}
                          event={event}
                          isEven={isEven}
                          catColor={catColor}
                          isSimulating={isSimulating}
                        />
                      )
                    }

                    if (result.recommendedProductId === 'icici-pru-wish') {
                      return (
                        <WishGoalCard
                          key={result.goalId}
                          result={result}
                          goal={goal!}
                          profile={profile!}
                          whatIfParams={whatIfParams}
                          event={event}
                          isEven={isEven}
                          catColor={catColor}
                          isSimulating={isSimulating}
                          updateGoalTargetAmount={updateGoalTargetAmount}
                        />
                      )
                    }

                    if (primaryCat?.toLowerCase()?.includes('term') || primaryCat?.toLowerCase()?.includes('protection')) {
                      return (
                        <TermGoalCard
                          key={result.goalId}
                          result={result}
                          goal={goal!}
                          profile={profile!}
                          whatIfParams={whatIfParams}
                          event={event}
                          isEven={isEven}
                          catColor={catColor}
                          isSimulating={isSimulating}
                          updateGoalExistingSavings={updateGoalExistingSavings}
                          updateGoalTargetAmount={updateGoalTargetAmount}
                        />
                      )
                    }

                    return (
                      <motion.div 
                        key={result.goalId} 

                        initial={{ opacity: 0, y: 30 }} 
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: "-50px" }}
                        transition={{ duration: 0.5, delay: i * 0.1 }}
                        className={cn(
                          "relative flex w-full group",
                          isEven ? "sm:flex-row-reverse" : "sm:flex-row"
                        )}
                      >
                        {/* Empty Spacer */}
                        <div className="hidden sm:block sm:w-1/2" />

                        {/* Timeline Dot */}
                        <div 
                          className="absolute left-0 sm:left-1/2 top-1/2 w-5 h-5 rounded-full ring-[6px] ring-white transform sm:-translate-x-1/2 -translate-y-1/2 z-10 transition-transform group-hover:scale-125 shadow-md"
                          style={{ backgroundColor: catColor }}
                        />

                        {/* Card Container */}
                        <div className={cn(
                          "ml-10 sm:ml-0 w-full sm:w-1/2 flex items-center",
                          isEven ? "sm:justify-end sm:pr-10" : "sm:justify-start sm:pl-10"
                        )}>
                          <div className="w-full bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-lg transition-all duration-300">
                            
                            {/* Header */}
                            <div className={cn("flex items-center gap-3 mb-4", isEven ? "sm:flex-row-reverse" : "")}>
                              <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center text-2xl shrink-0 shadow-inner border border-gray-100">
                                {goal?.icon}
                              </div>
                              <div className={cn(isEven ? "sm:text-right" : "text-left")}>
                                <span className="text-[10px] font-bold tracking-wider text-gray-400 uppercase">Age {event.age}</span>
                                <h3 className="font-display font-bold text-gray-900 text-base leading-tight mt-0.5">{goal?.label}</h3>
                              </div>
                            </div>

                            {/* Financials & Progress */}
                            {primaryCat?.toLowerCase()?.includes('annuity') ? (
                              <div className="bg-green-50/50 p-4 rounded-xl border border-green-100 mb-4 mt-2">
                                <div className="flex justify-between items-center mb-3">
                                  <div>
                                    <p className="text-[10px] text-gray-500 uppercase font-semibold tracking-wider">Est. Annual Pension</p>
                                    <p className="text-xl font-display font-bold text-green-700">
                                      {isSimulating ? "..." : formatCurrency(dynamicPension)} <span className="text-sm font-normal text-green-600">/ yr</span>
                                    </p>
                                  </div>
                                  <div className="text-right">
                                    <div className="flex items-center justify-end gap-1 mb-1">
                                      <p className="text-[10px] text-gray-500 uppercase font-semibold tracking-wider">Est. Premium</p>
                                      <select 
                                        className="text-[9px] bg-white border border-green-200 rounded px-1 text-gray-700 outline-none font-medium h-4 focus:ring-1 focus:ring-brand-orange"
                                        value={currentPpt}
                                        onChange={(e) => setAnnuityPptMap(prev => ({...prev, [result.goalId]: Number(e.target.value)}))}
                                      >
                                        <option value={1}>Single Pay</option>
                                        <option value={5}>5 Yrs</option>
                                        <option value={7}>7 Yrs</option>
                                        <option value={10}>10 Yrs</option>
                                        <option value={12}>12 Yrs</option>
                                      </select>
                                    </div>
                                    <p className="text-sm font-bold text-gray-700">
                                      {isSimulating ? "..." : formatCurrency(baseAnnualPremium)} <span className="text-xs font-normal">{currentPpt === 1 ? 'one-time' : '/ yr'}</span>
                                    </p>
                                  </div>
                                </div>
                                
                                {/* Total Paid and Expected Returns */}
                                <div className="flex justify-between items-center mb-3 pt-3 border-t border-green-200/50">
                                  <div>
                                    <p className="text-[9px] text-gray-500 uppercase font-semibold tracking-wider">Total Paid ({currentPpt === 1 ? '1 yr' : `${currentPpt} yrs`})</p>
                                    <p className="text-xs font-bold text-gray-700">
                                      {isSimulating ? "..." : formatCurrency(totalPaid)}
                                    </p>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-[9px] text-gray-500 uppercase font-semibold tracking-wider flex items-center justify-end gap-1">
                                      Est. Lifetime Payout 
                                      <span className="text-[8px] font-normal lowercase bg-green-100 text-green-700 px-1 rounded">(till age 85)</span>
                                    </p>
                                    <p className="text-xs font-bold text-green-700">
                                      {isSimulating ? "..." : formatCurrency(lifetimePayout)}
                                    </p>
                                  </div>
                                </div>

                                <div className="text-[10px] text-green-600 font-medium flex items-center gap-1.5 bg-green-100/50 p-1.5 rounded-md px-2">
                                  <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                                  Lifelong guaranteed income after accumulation phase
                                </div>
                              </div>
                            ) : (primaryCat?.toLowerCase()?.includes('protection') || primaryCat?.toLowerCase()?.includes('term')) ? (
                              <div className="bg-brand-navy/5 p-4 rounded-xl border border-brand-navy/10 mb-4 mt-2">
                                <div className="flex justify-between items-center mb-3">
                                  <div>
                                    <p className="text-[10px] text-gray-500 uppercase font-semibold tracking-wider">Total Cover</p>
                                    <p className="text-xl font-display font-bold text-brand-navy">
                                      {isSimulating ? "..." : "₹1,00,00,000"}
                                    </p>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-[10px] text-gray-500 uppercase font-semibold tracking-wider">Est. Premium</p>
                                    <p className="text-sm font-bold text-gray-700">
                                      {isSimulating ? "..." : "₹1,191"} <span className="text-xs font-normal">/ mo</span>
                                    </p>
                                  </div>
                                </div>
                                <div className="text-[10px] text-brand-navy/80 font-medium flex items-center gap-1.5 bg-brand-navy/10 p-1.5 rounded-md px-2">
                                  <div className="w-1.5 h-1.5 rounded-full bg-brand-navy" />
                                  100% Return of Premium available
                                </div>
                              </div>
                            ) : (
                              <>
                                <div className={cn("flex flex-col gap-1 mb-5", isEven ? "sm:items-end" : "items-start")}>
                                  <div className={cn("flex flex-col gap-1", isEven ? "sm:items-end" : "items-start")}>
                                    <p className="text-[10px] text-gray-500 uppercase font-semibold tracking-wider">Corpus Needed</p>
                                    {isSimulating ? (
                                      <p className="text-sm font-display font-bold text-gray-400 animate-pulse italic mt-1">Calculating...</p>
                                    ) : (
                                      <p className="text-xl font-display font-bold text-brand-navy">{formatCurrency(result.corpusNeeded)}</p>
                                    )}
                                  </div>
                                  
                                  {/* Cost Today Slider */}
                                  <div className="w-full max-w-[180px] mt-2 opacity-80 hover:opacity-100 transition-opacity bg-gray-50 p-2 rounded-lg border border-gray-100">
                                    <GoalTargetSlider goal={goal} currentAmount={whatIfParams.goalTargetAmounts?.[goal?.id || ''] ?? goal?.corpusNeeded ?? 0} isEven={isEven} />
                                  </div>
                                </div>

                                {/* Progress Bar */}
                                <div className="space-y-2 mb-5">
                                  <div className="flex justify-between items-center text-xs">
                                    <span className="font-medium text-gray-600">Coverage</span>
                                    <span className={cn("font-bold text-sm", isSimulating ? "text-gray-400" : (isGood ? "text-green-600" : "text-brand-orange"))}>
                                      {isSimulating ? "..." : `${coverPct}%`}
                                    </span>
                                  </div>
                                  <div className="h-2.5 w-full bg-gray-100 rounded-full overflow-hidden flex shadow-inner">
                                    <motion.div 
                                      className="h-full rounded-full" 
                                      style={{ backgroundColor: isSimulating ? '#e5e7eb' : catColor }}
                                      initial={{ width: 0 }}
                                      animate={{ width: isSimulating ? '100%' : `${Math.min(coverPct, 100)}%` }}
                                      transition={{ duration: 1, ease: "easeOut" }}
                                    />
                                  </div>
                                  <div className="flex justify-between items-center text-[10px]">
                                    <span className={cn("font-medium", isSimulating ? "text-gray-400 animate-pulse" : "text-gray-500")}>
                                      {isSimulating ? "Calculating..." : `${formatCurrency(result.coveredAmount)} covered`}
                                    </span>
                                    <span className={cn("font-semibold", isSimulating ? "text-gray-400" : (result.gap > 0 ? "text-red-500" : "text-green-500"))}>
                                      {isSimulating ? "..." : (result.gap > 0 ? `Gap: ${formatCurrency(result.gap)}` : 'Fully Covered')}
                                    </span>
                                  </div>
                                </div>
                              </>
                            )}

                            {/* Product Tags & Plan Name */}
                            <div className={cn("flex flex-col gap-2 mt-4", isEven ? "sm:items-end" : "items-start")}>
                              <div className={cn("flex flex-wrap gap-2", isEven ? "sm:justify-end" : "justify-start")}>
                                {result.recommendedProducts.map(cat => (
                                  <span 
                                    key={cat} 
                                    className="text-[9px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md border"
                                    style={{ 
                                      color: CATEGORY_COLORS[cat] ?? '#666',
                                      borderColor: CATEGORY_COLORS[cat] ? `${CATEGORY_COLORS[cat]}30` : '#ccc',
                                      backgroundColor: CATEGORY_COLORS[cat] ? `${CATEGORY_COLORS[cat]}08` : '#f3f4f6'
                                    }}
                                  >
                                    {CATEGORY_META[cat]?.label ?? cat}
                                  </span>
                                ))}
                              </div>
                              <div className={cn("text-[10px] text-gray-500", isEven ? "sm:text-right" : "text-left")}>
                                {result.recommendedProductName ? (
                                  <>Recommended: <span className="font-semibold text-brand-navy">{result.recommendedProductName}</span></>
                                ) : (
                                  <>Simulated via <span className="font-semibold text-brand-navy">Core Engine</span></>
                                )}
                              </div>
                            </div>

                          </div>
                        </div>
                      </motion.div>
                    )
                  })}
                </div>
                
                {/* End of timeline marker */}
                <div className="relative flex items-center mt-16 sm:justify-center">
                  <div className="absolute left-0 sm:left-1/2 w-3 h-3 rounded-full bg-gray-300 transform sm:-translate-x-1/2 z-10" />
                  <div className="ml-10 sm:ml-0 sm:absolute sm:right-1/2 sm:pr-8 text-right w-full sm:w-auto">
                    <span className="text-gray-400 text-[10px] font-bold uppercase tracking-widest">Age 80+</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
