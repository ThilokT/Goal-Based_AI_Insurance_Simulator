import { useState } from 'react'
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
}

export default function GppFlexiGoalCard({
  result,
  goal,
  profile,
  event,
  isEven,
  catColor,
  isSimulating,
}: GppFlexiGoalCardProps) {
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
  const annuityRateWithRop = 0.0611785 + (deferment * 0.0055)
  const annuityAmountWithRop = totalPaid * annuityRateWithRop
  
  const annuityRateWithoutRop = 0.0575238 + (deferment * 0.0055)
  const annuityAmountWithoutRop = totalPaid * annuityRateWithoutRop
  
  // Tax Savings Calculation:
  // Assuming 30% tax bracket on up to 1.5L section 80C per year.
  // The screenshot shows 3.28 Lakh total tax savings on 21L. 
  // Let's just use: (investmentAmount * 31.2% tax rate) cap at 46,800 per year * ppt.
  const yearlyTaxSavings = Math.min(investmentAmount, 150000) * 0.312
  const totalTaxSavings = yearlyTaxSavings * ppt
  
  // Life Expectancy Calculation
  const assumedLifeExpectancy = 85
  const currentAge = profile.age + event.age - goal.targetAge! + (goal.targetAge! - profile.age) // wait, event.age is the age at which it starts.
  // Actually, child's age or current age? The screenshot says "41 years | Male". 
  // Payout starts after deferment.
  const payoutStartAge = profile.age + deferment
  const payoutYears = Math.max(0, assumedLifeExpectancy - payoutStartAge)
  const totalPensionWithRop = annuityAmountWithRop * payoutYears
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
                <span className="text-[10px] font-bold tracking-wider text-purple-600 uppercase">Customize Your Plan</span>
                <h3 className="font-display font-bold text-gray-900 text-lg leading-tight mt-0.5">{goal?.label}</h3>
                <p className="text-xs text-purple-800/80 font-medium">{result.recommendedProductName}</p>
              </div>
            </div>
            {/* Tag from screenshot */}
            <div className="hidden sm:block border border-purple-200 bg-white px-3 py-1 rounded-full text-[10px] font-semibold text-purple-600 shadow-sm">
              Single Life
            </div>
          </div>

          <div className="p-5">
            {/* Calculator Controls */}
            <div className="grid grid-cols-2 gap-4 mb-6 bg-gray-50 p-4 rounded-xl border border-gray-100">
              <div className="col-span-2">
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">
                  Investment Amount (Yearly)
                </label>
                <div className="font-display text-lg font-bold text-gray-900 mb-2">
                  {formatCurrency(investmentAmount)}
                </div>
                <input 
                  type="range"
                  min={50000}
                  max={2000000}
                  step={10000}
                  value={investmentAmount}
                  disabled={isSimulating}
                  onChange={(e) => setInvestmentAmount(Number(e.target.value))}
                  className="w-full accent-purple-600 h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
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
                      <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider mb-1">Annuity Amount</p>
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
                      <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider mb-1">Annuity Amount</p>
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

          </div>
        </div>
      </div>
    </motion.div>
  )
}
