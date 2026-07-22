import { useState, useEffect } from 'react'
import { useAppStore } from '../../store'
import { motion } from 'framer-motion'
import { cn, formatCurrency } from '../../lib/utils'
import type { SimulationResult, LifeGoal, UserProfile } from '../../types'

interface GppFlexiGoalCardProps {
  result: SimulationResult
  goal: LifeGoal
  profile: UserProfile
  event: any
  isEven: boolean
  catColor: string
  isSimulating: boolean
  whatIfParams: any
}

export default function GppFlexiGoalCard({
  result,
  goal,
  profile,
  event,
  isEven,
  catColor,
  isSimulating,
  whatIfParams,
}: GppFlexiGoalCardProps) {
  const setWhatIfParams = useAppStore(state => state.setWhatIfParams);
  const globalWhatIfParams = useAppStore(state => state.whatIfParams);

  const setCardInvestment = useAppStore(state => state.setCardInvestment);
  const setCardInvestmentSchedule = useAppStore(state => state.setCardInvestmentSchedule);
  const setCardPayout = useAppStore(state => state.setCardPayout);
  const setCardPayoutSchedule = useAppStore(state => state.setCardPayoutSchedule);

  // Local state for interactive UI mirroring the ICICI calculator
  const initialAnnualPremium = (result.monthlyPremium || 25000) * 12
  
  const [investmentAmount, setInvestmentAmount] = useState<number>(
    Math.max(50000, Math.min(10000000, initialAnnualPremium))
  )
  const [ppt, setPpt] = useState<number>(7) // Pay For (Years)
  const [deferment, setDeferment] = useState<number>(15) // Receive annuity after (Years)
  const [withRop, setWithRop] = useState<boolean>(true) // Toggle for ROP
  
  // Financial Calculations
  const totalPaid = investmentAmount * ppt
  
  // Annuity Rate Calculation exactly mimicking screenshot for 15 yr deferment:
  // With ROP -> 14.37%, Without ROP -> 14.00%
  // Capped at 20% for extreme deferment ranges
  const calculateRate = (base: number) => Math.min(0.20, base + (deferment * 0.0055))
  const annuityRateWithRop = calculateRate(0.0611785)
  const annuityAmountWithRop = totalPaid * annuityRateWithRop
  
  const annuityRateWithoutRop = calculateRate(0.0575238)
  const annuityAmountWithoutRop = totalPaid * annuityRateWithoutRop
  
  // Tax Savings Calculation:
  // Assuming 30% tax bracket on up to 1.5L section 80C per year.
  // The screenshot shows 3.28 Lakh total tax savings on 21L. 
  // Let's just use: (investmentAmount * 31.2% tax rate) cap at 46,800 per year * ppt.
  const yearlyTaxSavings = Math.min(investmentAmount, 150000) * 0.312
  const totalTaxSavings = yearlyTaxSavings * ppt
  
  const baseAge = (goal?.id && whatIfParams?.goalStartAges?.[goal.id]) ?? profile?.age ?? 30;

  // Life Expectancy Calculation
  const assumedLifeExpectancy = 85
  // Payout starts after deferment.
  const payoutStartAge = baseAge + deferment
  const payoutYears = Math.max(0, assumedLifeExpectancy - payoutStartAge + 1)
  const totalPensionWithRop = (annuityAmountWithRop * payoutYears) + totalPaid
  const totalPensionWithoutRop = annuityAmountWithoutRop * payoutYears

  const formatExactRupee = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const formatLakhsExact = (amount: number) => {
    return `₹ ${(amount / 100000).toFixed(2)} Lakh`
  }

  useEffect(() => {
    if (result?.goalId || goal?.id) {
      const id = result?.goalId || goal?.id;
      setCardInvestment(id, totalPaid);
      const activeAnnuity = withRop ? annuityAmountWithRop : annuityAmountWithoutRop;
      setCardPayout(id, withRop ? totalPensionWithRop : totalPensionWithoutRop);
      // Build yearly annuity schedule from payoutStartAge through 85
      const schedule: { age: number, amount: number, label: string }[] = [];
      for (let age = payoutStartAge; age <= 85; age++) {
        schedule.push({ age, amount: activeAnnuity, label: `GPP Flexi Pension Yr ${age - payoutStartAge + 1}` });
      }
      if (withRop) {
        schedule.push({ age: 85, amount: totalPaid, label: 'GPP Flexi Return of Premium' });
      }
      setCardPayoutSchedule(id, schedule);
      
      const invSchedule = [];
      for (let i = 0; i < ppt; i++) {
        invSchedule.push({ age: baseAge + i, amount: investmentAmount, label: `GPP Flexi Premium Yr ${i + 1}` });
      }
      setCardInvestmentSchedule(id, invSchedule);
    }
  }, [totalPaid, totalPensionWithRop, totalPensionWithoutRop, withRop, annuityAmountWithRop, annuityAmountWithoutRop, payoutStartAge, profile?.age, whatIfParams?.goalStartAges, ppt, investmentAmount, result?.goalId, goal?.id, setCardInvestment, setCardPayout, setCardPayoutSchedule, setCardInvestmentSchedule]);

  return (
    <motion.div 
      key={result.goalId} 
      initial={{ opacity: 0, y: 30 }} 
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      className={cn(
        "relative flex w-full group mb-12",
        isEven ? "sm:flex-row-reverse" : "sm:flex-row"
      )}
    >
      <div className="hidden sm:block sm:w-1/2" />

      {/* Timeline Dot */}
      <div 
        className="absolute left-0 sm:left-1/2 top-10 w-5 h-5 rounded-full ring-[6px] ring-white transform sm:-translate-x-1/2 -translate-y-1/2 z-10 transition-transform group-hover:scale-125 shadow-md"
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
        "ml-10 sm:ml-0 w-full sm:w-1/2 flex items-center",
        isEven ? "sm:justify-end sm:pr-8" : "sm:justify-start sm:pl-8"
      )}>
        <div className="w-full bg-white rounded-2xl shadow-sm border border-gray-100 hover:shadow-lg transition-all duration-300 overflow-hidden">
          
          {/* Header */}
          <div className="bg-gradient-to-r from-purple-50 to-purple-100/50 p-5 border-b border-purple-100 flex justify-between items-center">
            <div className={cn("flex items-center gap-3", isEven ? "sm:flex-row-reverse" : "")}>
              <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center text-2xl shrink-0 shadow-sm border border-purple-200 text-purple-600">
                {goal?.icon}
              </div>
              <div className={cn(isEven ? "sm:text-right" : "text-left")}>
                <span className="text-[10px] font-bold tracking-wider text-purple-600 uppercase">Age {event.age} • {result.recommendedProductCategory || 'Guaranteed Savings'}</span>
                <h3 className="font-display font-bold text-gray-900 text-lg leading-tight mt-0.5">{goal?.label}</h3>
                <p className="text-xs text-purple-800/80 font-medium">{result.recommendedProductName}</p>
              </div>
            </div>
            {/* Tag from screenshot */}
            <div className="hidden sm:block border border-purple-200 bg-white px-3 py-1 rounded-full text-[10px] font-semibold text-purple-600 shadow-sm">
              Single Life
            </div>
          </div>
          
            {/* Dynamic Coverage Banner */}
            <div className="bg-emerald-50 p-3 border-b border-emerald-100 flex justify-between items-center">
               <div>
                 <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider mb-0.5">Coverage</p>
                 <p className="text-sm font-display font-bold text-gray-900">₹{Math.round(withRop ? totalPensionWithRop : totalPensionWithoutRop).toLocaleString('en-IN')}</p>
               </div>
               <div className="text-right">
                 <div className="bg-emerald-500 text-white text-[10px] font-bold px-2 py-1 rounded-full shadow-sm">
                   {((globalWhatIfParams?.goalTargetAmounts && globalWhatIfParams.goalTargetAmounts[result?.goalId || goal?.id]) || goal?.corpusNeeded || 0) > 0 ? Math.round(((withRop ? totalPensionWithRop : totalPensionWithoutRop) / ((globalWhatIfParams?.goalTargetAmounts && globalWhatIfParams.goalTargetAmounts[result?.goalId || goal?.id]) || goal?.corpusNeeded || 0)) * 100) : 0}% of Target
                 </div>
               </div>
            </div>

            {/* Corpus Needed Input */}
            <div className="bg-orange-50/40 p-3 border-b border-orange-100 flex justify-between items-center">
              <label className="text-xs font-bold text-gray-700">Corpus Needed / Target Amount</label>
              <div className="flex items-center gap-2">
                <span className="text-gray-500 text-sm">₹</span>
                <input 
                  type="number" 
                  value={(globalWhatIfParams?.goalTargetAmounts && globalWhatIfParams.goalTargetAmounts[result?.goalId || goal?.id]) || goal?.corpusNeeded || 0}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setWhatIfParams({
                      ...globalWhatIfParams,
                      goalTargetAmounts: {
                        ...(globalWhatIfParams?.goalTargetAmounts || {}),
                        [result?.goalId || goal?.id]: val
                      }
                    });
                  }}
                  className="bg-white border border-gray-300 rounded px-2 py-1 text-sm font-bold text-gray-800 w-32 outline-none"
                />
              </div>
            </div>

          <div className="p-5">
            {/* Calculator Controls */}
            <div className="grid grid-cols-2 gap-4 mb-6 bg-gray-50 p-4 rounded-xl border border-gray-100">
              <div className="col-span-2">
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">
                  Investment Amount (Yearly)
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-gray-500 font-bold text-lg">₹</span>
                  <input
                    type="number"
                    value={investmentAmount}
                    disabled={isSimulating}
                    onChange={(e) => setInvestmentAmount(Number(e.target.value))}
                    className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-lg font-display font-bold text-gray-900 outline-none focus:border-purple-600 focus:ring-1 focus:ring-purple-600 transition-all"
                  />
                </div>
              </div>
              
              <div className="col-span-1 flex flex-col justify-between">
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">
                  Pay for
                </label>
                <select 
                  className="w-full bg-white border border-gray-200 rounded-lg p-2 text-sm text-gray-700 font-medium focus:ring-2 focus:ring-purple-600 focus:border-purple-600 outline-none"
                  value={ppt}
                  onChange={(e) => setPpt(Number(e.target.value))}
                  disabled={isSimulating}
                >
                  <option value={5}>5 Years</option>
                  <option value={7}>7 Years</option>
                  <option value={10}>10 Years</option>
                  <option value={12}>12 Years</option>
                </select>
              </div>

              <div className="col-span-1 flex flex-col justify-between">
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">
                  Receive annuity after
                </label>
                <select 
                  className="w-full bg-white border border-gray-200 rounded-lg p-2 text-sm text-gray-700 font-medium focus:ring-2 focus:ring-purple-600 focus:border-purple-600 outline-none"
                  value={deferment}
                  onChange={(e) => setDeferment(Number(e.target.value))}
                  disabled={isSimulating}
                >
                  <option value={5}>5 Years</option>
                  <option value={10}>10 Years</option>
                  <option value={15}>15 Years</option>
                  <option value={20}>20 Years</option>
                </select>
              </div>
            </div>

            {/* You PAY */}
            <div className="bg-orange-50/50 rounded-xl p-3 mb-4 border border-orange-100 text-center">
              <span className="text-xs text-gray-600 font-medium">You PAY </span>
              <span className="text-sm font-bold text-brand-orange">{formatCurrency(investmentAmount)} yearly</span>
              <span className="text-xs text-gray-600 font-medium"> for {ppt} years. Total: {formatCurrency(totalPaid)}</span>
            </div>

            {/* You GET - Render both ROP Options */}
            <div className="space-y-4">
              
              {/* Option 1: With ROP */}
              <div 
                className={cn("border-2 rounded-xl overflow-hidden cursor-pointer relative transition-all", withRop ? "border-orange-200 shadow-sm" : "border-gray-200 opacity-70 hover:opacity-100 hover:border-gray-300")}
                onClick={() => setWithRop(true)}
              >
                <div className={cn("absolute top-4 right-4 w-4 h-4 rounded-full border-[4px]", withRop ? "border-brand-orange bg-white shadow-sm" : "border-gray-300 bg-transparent")} />
                
                <div className={cn("p-4", withRop ? "bg-orange-50/30" : "bg-white")}>
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <div className={cn("text-white text-[9px] font-bold px-2 py-0.5 rounded inline-block self-start mb-2 uppercase tracking-wide", withRop ? "bg-brand-orange" : "bg-gray-400")}>
                        Starts {deferment + 1}th Year
                      </div>
                      <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider mb-1">Guaranteed Every Year Payout</p>
                      <p className={cn("text-xl font-display font-bold", withRop ? "text-brand-orange" : "text-gray-900")}>{formatExactRupee(annuityAmountWithRop)} <span className="text-sm font-medium">/year</span></p>
                      <p className={cn("text-[10px] font-bold mt-1", withRop ? "text-orange-700" : "text-gray-500")}>{(annuityRateWithRop * 100).toFixed(2)}% Annuity rate</p>
                    </div>
                    
                    <div className="w-1/2 pr-6">
                      <p className="text-xs font-semibold text-gray-700 leading-snug">
                        Single life with Return of Premium(ROP) to nominee on Critical Illness (CI) / Permanent disability (PD) or death
                      </p>
                    </div>
                  </div>

                  {withRop && (
                    <div className="flex gap-4 border-t border-orange-100 pt-3">
                      <div className="text-[10px] text-gray-600">
                        <span className="inline-block w-1 h-1 rounded-full bg-gray-400 mr-1 align-middle" />
                        Life Expectancy <span className="font-bold">{assumedLifeExpectancy}yrs</span>
                      </div>
                      <div className="text-[10px] text-gray-600">
                        <span className="inline-block w-1 h-1 rounded-full bg-gray-400 mr-1 align-middle" />
                        Total Pension received <span className="font-bold">{formatCurrency(totalPensionWithRop)}</span>
                      </div>
                    </div>
                  )}
                </div>

              </div>

              {/* Option 2: Without ROP */}
              <div 
                className={cn("border-2 rounded-xl overflow-hidden cursor-pointer relative transition-all", !withRop ? "border-orange-200 shadow-sm" : "border-gray-200 opacity-70 hover:opacity-100 hover:border-gray-300")}
                onClick={() => setWithRop(false)}
              >
                <div className={cn("absolute top-4 right-4 w-4 h-4 rounded-full border-[4px]", !withRop ? "border-brand-orange bg-white shadow-sm" : "border-gray-300 bg-transparent")} />
                
                <div className={cn("p-4", !withRop ? "bg-orange-50/30" : "bg-white")}>
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <div className={cn("text-white text-[9px] font-bold px-2 py-0.5 rounded inline-block self-start mb-2 uppercase tracking-wide", !withRop ? "bg-brand-orange" : "bg-gray-400")}>
                        Starts {deferment + 1}th Year
                      </div>
                      <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider mb-1">Guaranteed Every Year Payout</p>
                      <p className={cn("text-xl font-display font-bold", !withRop ? "text-brand-orange" : "text-gray-900")}>{formatExactRupee(annuityAmountWithoutRop)} <span className="text-sm font-medium">/year</span></p>
                      <p className={cn("text-[10px] font-bold mt-1", !withRop ? "text-orange-700" : "text-gray-500")}>{(annuityRateWithoutRop * 100).toFixed(2)}% Annuity rate</p>
                    </div>
                    
                    <div className="w-1/2 pr-6">
                      <p className="text-xs font-semibold text-gray-700 leading-snug">
                        Single life without Return of Premium (ROP)
                      </p>
                    </div>
                  </div>

                  {!withRop && (
                    <div className="flex gap-4 border-t border-orange-100 pt-3">
                      <div className="text-[10px] text-gray-600">
                        <span className="inline-block w-1 h-1 rounded-full bg-gray-400 mr-1 align-middle" />
                        Life Expectancy <span className="font-bold">{assumedLifeExpectancy}yrs</span>
                      </div>
                      <div className="text-[10px] text-gray-600">
                        <span className="inline-block w-1 h-1 rounded-full bg-gray-400 mr-1 align-middle" />
                        Total Pension received <span className="font-bold">{formatCurrency(totalPensionWithoutRop)}</span>
                      </div>
                    </div>
                  )}
                </div>

              </div>

            </div>

            {/* Total Invested and Payout Summary */}
            <div className="bg-gray-50 flex flex-col gap-3 border-t border-gray-200 mt-6 p-4 rounded-xl">
               <div className="flex justify-between items-center">
                 <div>
                   <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-0.5">Total Amount Invested</p>
                   <p className="text-xs text-gray-400">Over {ppt} years</p>
                 </div>
                 <div className="text-xl font-display font-bold text-gray-900">
                   {formatCurrency(totalPaid)}
                 </div>
               </div>
               <div className="border-t border-gray-200 w-full" />
               <div className="flex justify-between items-center">
                 <div>
                   <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-0.5">Total Payout</p>
                   <p className="text-xs text-gray-400">Total Pension Received</p>
                 </div>
                 <div className="text-xl font-display font-bold text-emerald-600">
                   {formatCurrency(withRop ? totalPensionWithRop : totalPensionWithoutRop)}
                 </div>
               </div>
            </div>

          </div>
        </div>
      </div>
    </motion.div>
  )
}
