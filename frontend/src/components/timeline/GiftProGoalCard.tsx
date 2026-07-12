import { useState, useEffect } from 'react'
import { useAppStore } from '../../store'
import { motion } from 'framer-motion'
import { cn, formatCurrency } from '../../lib/utils'
import type { SimulationResult, LifeGoal, UserProfile, WhatIfParams } from '../../types'

interface GiftProGoalCardProps {
  result: SimulationResult
  goal: LifeGoal
  profile: UserProfile
  whatIfParams: WhatIfParams
  event: any
  isEven: boolean
  catColor: string
  isSimulating: boolean
  updateGoalTargetAmount: (goalId: string, targetAmount: number) => void
}

export default function GiftProGoalCard({
  result,
  goal,
  profile,
  whatIfParams,
  event,
  isEven,
  catColor,
  isSimulating,
  updateGoalTargetAmount
}: GiftProGoalCardProps) {
  const setCardInvestment = useAppStore(state => state.setCardInvestment);

  
  // Base Investment Input
  const [investment, setInvestment] = useState(360000)
  
  // Toggles and Selects
  const [incomeType, setIncomeType] = useState<'Level' | 'Increasing'>('Level')
  const [payForYears, setPayForYears] = useState(7)
  const [getIncomeForYears, setGetIncomeForYears] = useState(30)
  const [incomeStartsFrom, setIncomeStartsFrom] = useState(8)
  const [moneybackOption, setMoneybackOption] = useState(true)
  const [specificDateOption, setSpecificDateOption] = useState(true)
  const [moneyBackPercent, setMoneyBackPercent] = useState(100)
  const [moneyBackYear, setMoneyBackYear] = useState(35)
  
  // Dynamic bounds for Money Back Year
  const minMoneyBackYear = Math.max(1, incomeStartsFrom - 1)
  const maxMoneyBackYear = minMoneyBackYear + payForYears

  // Ensure moneyBackYear is always valid when dependencies change
  const validMoneyBackYear = Math.min(Math.max(moneyBackYear, minMoneyBackYear), maxMoneyBackYear)
  
  // Rider
  const riderCost = 1449
  
  // Math logic (Based on Screenshot: Invest 3.6L/yr for 7 years -> Income 1.8L for 30 yrs -> MoneyBack 25.96L -> Total 79.85L)
  // --- ACTUARIAL MATH ENGINE ---
  // ICICI uses a dynamic Internal Rate of Return (IRR) that scales based on the policy term.
  // Longer payment terms and longer income terms yield higher IRRs (bonuses).
  let rate = 0.035 // Base IRR of 3.5%
  
  // Bonus for longer Pay For terms
  if (payForYears >= 10) rate += 0.012
  else if (payForYears >= 7) rate += 0.004
  
  // Bonus for longer Get Income For terms
  if (getIncomeForYears >= 15) rate += 0.010
  else if (getIncomeForYears >= 10) rate += 0.006
  else if (getIncomeForYears >= 7) rate += 0.002
  
  // Bonus for deferment (waiting period before income starts)
  const defermentGap = incomeStartsFrom - payForYears - 1
  if (defermentGap > 0) rate += (defermentGap * 0.0005)
  
  // Slight IRR boost for selecting the Money Back option (since capital is retained longer)
  if (moneybackOption) rate += 0.001

  const totalInvestment = investment * payForYears
  
  // 1. Calculate accumulated corpus at the start of the income phase
  let corpus = 0
  for (let i = 1; i <= payForYears; i++) {
     // Money invested in year i grows until income starts
     const yearsToGrow = Math.max(0, incomeStartsFrom - i)
     corpus += investment * Math.pow(1 + rate, yearsToGrow)
  }

  // 2. Money Back Calculation
  // 100% money back base is total premiums * 1.03
  const moneyBackBase = totalInvestment * 1.03
  const moneyBack = moneybackOption ? (moneyBackBase * (moneyBackPercent / 100)) : 0
  
  // 3. Discount Money Back to Present Value (at start of income phase)
  const moneyBackDiscountYears = Math.max(0, validMoneyBackYear - (incomeStartsFrom - 1))
  const pvMoneyBack = moneyBack / Math.pow(1 + rate, moneyBackDiscountYears)
  
  const corpusForIncome = corpus - pvMoneyBack
  
  // 4. Calculate Yearly Income
  let yearlyIncome = 0
  const isIncreasing = incomeType === 'Increasing'
  
  if (isIncreasing) {
     let pvFactorSum = 0
     for (let i = 1; i <= getIncomeForYears; i++) {
        const increaseMultiplier = 1 + (i - 1) * 0.05
        pvFactorSum += increaseMultiplier / Math.pow(1 + rate, i)
     }
     yearlyIncome = Math.max(0, corpusForIncome / pvFactorSum)
  } else {
     const annuityFactor = (1 - Math.pow(1 + rate, -getIncomeForYears)) / rate
     yearlyIncome = Math.max(0, corpusForIncome / annuityFactor)
  }
  
  // 5. Total Income Sum
  let totalIncome = 0
  if (isIncreasing) {
    totalIncome = yearlyIncome * getIncomeForYears * (1 + (getIncomeForYears - 1) * 0.025)
  } else {
    totalIncome = yearlyIncome * getIncomeForYears
  }
  
  // 6. Overall Returns
  const overallReturns = totalIncome + moneyBack
  

  // Format helpers
  const formatLakhs = (val: number) => (val / 100000).toFixed(2)
  const formatExactRupee = (val: number) => val.toLocaleString('en-IN')

  useEffect(() => {
    if (result?.goalId || goal?.id) {
      setCardInvestment(result?.goalId || goal?.id, totalInvestment);
    }
  }, [totalInvestment, result?.goalId || goal?.id, setCardInvestment]);

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
        <div className="w-full max-w-4xl bg-white rounded-2xl shadow-md border border-gray-100 relative overflow-y-auto max-h-[550px]">
          
          <div className="p-5 flex flex-col">
            {/* Header */}
            <div className="flex justify-between items-start mb-5 pb-5 border-b border-gray-100">
              <div>
                <p className="text-[10px] font-bold text-gray-500 tracking-wider uppercase mb-1">
                  Age {event?.age || 30} • {result.recommendedProductCategory || 'Guaranteed Income'}
                </p>
                <h3 className="font-display font-bold text-gray-900 text-xl leading-tight">{goal?.label}</h3>
                <p className="text-sm text-gray-500 mt-1">{result.recommendedProductName || 'ICICI Pru Gift Pro'}</p>
              </div>
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-xl shrink-0" style={{ backgroundColor: `${catColor}15`, color: catColor }}>
                {goal?.icon ?? '🎁'}
              </div>
            </div>

            {/* Top Section - Customise your plan */}
            <div className="w-full bg-gray-50 rounded-xl p-5 border border-gray-200 mb-5 relative">
               
               {/* Tiny floating info texts are common in ICICI design */}
               <h3 className="text-gray-700 font-bold mb-4">Customise your plan</h3>
               
               {/* Income Type Toggle */}
               <div className="flex bg-white rounded-lg border border-gray-200 overflow-hidden mb-5">
                 <button 
                  onClick={() => setIncomeType('Level')}
                  className={cn("flex-1 py-2 text-xs font-bold flex items-center justify-center gap-1", incomeType === 'Level' ? "bg-[#e46434] text-white" : "text-gray-600")}
                 >
                   Level Income <span className="text-[10px] w-3 h-3 rounded-full border border-current flex items-center justify-center opacity-70">i</span>
                 </button>
                 <button 
                  onClick={() => setIncomeType('Increasing')}
                  className={cn("flex-1 py-2 text-xs font-bold flex items-center justify-center gap-1", incomeType === 'Increasing' ? "bg-[#e46434] text-white" : "text-gray-600")}
                 >
                   Increasing Income <span className="text-[10px] w-3 h-3 rounded-full border border-current flex items-center justify-center opacity-70">i</span>
                 </button>
               </div>
               
               {/* I want to invest */}
               <div className="mb-4">
                 <label className="text-[11px] text-gray-600 font-bold mb-1 block">I want to invest <span className="text-[9px] text-gray-400 font-normal">(in ₹ excl. GST)</span></label>
                 <div className="flex border border-gray-300 rounded-lg overflow-hidden bg-white">
                   <div className="flex-1 flex items-center px-3 border-r border-gray-200">
                     <span className="text-gray-500 mr-1 text-xs">₹</span>
                     <input 
                       type="number" 
                       value={investment}
                       onChange={(e) => setInvestment(Number(e.target.value))}
                       className="w-full outline-none text-gray-800 font-bold text-sm bg-transparent"
                     />
                     <span className="text-gray-400 text-xs ml-1">📝</span>
                   </div>
                   <select className="w-24 text-[11px] font-bold text-gray-700 bg-gray-50 px-2 outline-none cursor-pointer">
                     <option>Yearly</option>
                     <option>Monthly</option>
                   </select>
                 </div>
                 <p className="text-[9px] text-[#e46434] mt-1 font-bold italic">Three Lakh Sixty Thousand only</p>
               </div>
               
               {/* Pay For */}
               <div className="mb-4">
                 <label className="text-[11px] text-gray-600 font-bold mb-1 block">Pay For</label>
                 <select 
                  value={payForYears}
                  onChange={(e) => {
                    const newPay = Number(e.target.value);
                    setPayForYears(newPay);
                    if (incomeStartsFrom <= newPay) setIncomeStartsFrom(newPay + 1);
                  }}
                  className="w-full border border-gray-300 rounded-lg p-2 text-xs text-gray-800 font-bold bg-white outline-none cursor-pointer"
                 >
                   {[5, 6, 7, 8, 9, 10, 11, 12].map(y => <option key={y} value={y}>{y} Years</option>)}
                 </select>
               </div>

               {/* Get Income For */}
               <div className="mb-4">
                 <label className="text-[11px] text-gray-600 font-bold mb-1 block">Get Income For</label>
                 <div className="flex gap-2">
                   <select 
                    value={getIncomeForYears}
                    onChange={(e) => setGetIncomeForYears(Number(e.target.value))}
                    className="flex-1 border border-gray-300 rounded-lg p-2 text-xs text-gray-800 font-bold bg-white outline-none cursor-pointer"
                   >
                     {[5, 7, 10, 12, 15, 20, 25, 30].map(y => <option key={y} value={y}>{y} Years</option>)}
                   </select>
                   <select className="w-24 border border-gray-300 rounded-lg p-2 text-xs text-gray-700 font-bold bg-white outline-none cursor-pointer">
                     <option>Yearly</option>
                     <option>Monthly</option>
                   </select>
                 </div>
               </div>

               {/* Income Starts From */}
               <div className="mb-4">
                 <label className="text-[11px] text-gray-600 font-bold mb-1 block">Income Starts From</label>
                 <select 
                  value={incomeStartsFrom}
                  onChange={(e) => setIncomeStartsFrom(Number(e.target.value))}
                  className="w-full border border-gray-300 rounded-lg p-2 text-xs text-gray-800 font-bold bg-white outline-none cursor-pointer"
                 >
                   {[0, 1, 2, 3, 4, 5].map(i => {
                     const y = payForYears + 1 + i
                     return <option key={y} value={y}>{y}th Year</option>
                   })}
                 </select>
               </div>
               
               {/* Banner */}
               <div className="bg-yellow-50 border border-yellow-200/50 rounded-lg text-[9px] p-2 text-yellow-800 text-center mb-4 font-bold shadow-sm">
                 Avail Better Returns by holding Corpus for additional years
               </div>
               
               {/* Toggles */}
               <div className="flex justify-between items-center mb-4">
                 <label className="text-[10px] text-gray-600 font-bold flex items-center gap-1">
                   Want Moneyback Option ? <span className="w-3.5 h-3.5 bg-[#e46434] text-white rounded-full flex items-center justify-center text-[8px] ml-1">i</span>
                 </label>
                 <div className="flex border border-gray-300 rounded overflow-hidden shadow-sm">
                   <button onClick={() => setMoneybackOption(true)} className={cn("px-4 py-1 text-[10px] font-bold", moneybackOption ? "bg-[#e46434] text-white" : "bg-white text-gray-600")}>Yes</button>
                   <button onClick={() => setMoneybackOption(false)} className={cn("px-4 py-1 text-[10px] font-bold", !moneybackOption ? "bg-[#e46434] text-white" : "bg-white text-gray-600")}>No</button>
                 </div>
               </div>
               
               <div className="flex justify-between items-center mb-1">
                 <label className="text-[10px] text-gray-600 font-bold flex items-center gap-1">
                   Want Income on Specific Date ? <span className="w-3.5 h-3.5 bg-[#e46434] text-white rounded-full flex items-center justify-center text-[8px] ml-1 opacity-0">i</span>
                 </label>
                 <div className="flex border border-gray-300 rounded overflow-hidden shadow-sm">
                   <button onClick={() => setSpecificDateOption(true)} className={cn("px-4 py-1 text-[10px] font-bold", specificDateOption ? "bg-[#e46434] text-white" : "bg-white text-gray-600")}>Yes</button>
                   <button onClick={() => setSpecificDateOption(false)} className={cn("px-4 py-1 text-[10px] font-bold", !specificDateOption ? "bg-[#e46434] text-white" : "bg-white text-gray-600")}>No</button>
                 </div>
               </div>
               {specificDateOption && (
                 <div className="w-1/3">
                   <input type="date" className="w-full border border-gray-300 rounded p-1 text-[10px] text-gray-600 outline-none bg-white cursor-pointer" />
                 </div>
               )}

            </div>
            
            {/* Bottom Section - Results */}
            <div className="w-full flex flex-col justify-between">
              
              <div>
                <div className="bg-[#fff9f4] rounded-xl p-5 mb-5 text-center relative overflow-hidden">
                  <h2 className="text-[18px] font-bold text-gray-800 mb-1">
                    Overall Returns <span className="text-[#e46434] text-2xl ml-1">₹{formatLakhs(overallReturns)} Lakh</span>
                  </h2>
                  <p className="text-[11px] text-gray-600 font-medium">
                    By investing just ₹{formatLakhs(investment)} Lakh Yearly for {payForYears} years.
                  </p>
                </div>
                
                <div className="flex gap-2 mb-6">
                  {/* Yearly Income */}
                  <div className="flex-[1.2] bg-white border border-gray-200 rounded-xl p-4 flex flex-col justify-center shadow-sm relative z-10">
                    <div className="bg-[#e46434] text-white text-[9px] font-bold px-2 py-0.5 rounded inline-block self-start mb-2 uppercase tracking-wide">
                      Starts {incomeStartsFrom}th Year
                    </div>
                    <p className="text-[10px] text-gray-500 font-bold mb-1">Guaranteed Every Year Payout</p>
                    <p className="text-xl font-bold text-[#e46434] mb-1">₹{formatLakhs(yearlyIncome)} Lakh</p>
                    <p className="text-[10px] text-gray-600 font-bold">For {getIncomeForYears} years</p>
                    {isIncreasing && (
                      <p className="text-[8px] text-gray-500 mt-1.5 leading-tight">Income increases every year at a simple interest of 5%</p>
                    )}
                  </div>
                  
                  {moneybackOption && (
                    <>
                      <div className="flex items-center justify-center shrink-0 w-6 h-6 rounded-full bg-brand-orange text-white text-xs font-bold self-center shadow-sm z-20 -mx-3 ring-2 ring-white">
                        +
                      </div>
                      
                      {/* Money Back */}
                      <div className="flex-[1.4] bg-white border border-gray-200 rounded-xl p-3 flex flex-col justify-center shadow-sm pl-4 relative z-10">
                        <p className="text-[10px] text-gray-500 font-bold mb-2">Get Money Back</p>
                        <div className="flex gap-1 mb-2">
                          <select 
                            value={moneyBackPercent}
                            onChange={(e) => setMoneyBackPercent(Number(e.target.value))}
                            className="border border-gray-300 rounded px-1.5 py-0.5 text-[9px] text-gray-700 bg-white font-bold outline-none cursor-pointer"
                          >
                            {[200, 175, 150, 125, 100, 75, 50, 25].map(p => <option key={p} value={p}>{p}%</option>)}
                          </select>
                          <select 
                            value={validMoneyBackYear}
                            onChange={(e) => setMoneyBackYear(Number(e.target.value))}
                            className="border border-gray-300 rounded px-1.5 py-0.5 text-[9px] text-gray-700 bg-white font-bold outline-none cursor-pointer"
                          >
                            {Array.from(
                              { length: maxMoneyBackYear - minMoneyBackYear + 1 }, 
                              (_, i) => minMoneyBackYear + i
                            ).map(y => <option key={y} value={y}>{y}th year</option>)}
                          </select>
                        </div>
                        <p className="text-[13px] font-bold text-[#e46434]">₹{formatLakhs(moneyBack)} Lakh</p>
                      </div>
                    </>
                  )}
              </div>
              
              </div>
              
              {/* Total Invested Summary */}
              <div className="bg-gray-50 flex justify-between items-center border-t border-gray-200 mt-6 p-4 rounded-xl">
                <div>
                  <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1">Total Amount Invested</p>
                  <p className="text-xs text-gray-600 font-medium">Over {payForYears} years</p>
                </div>
                <div className="text-lg font-display font-bold text-gray-900">
                  ₹{formatLakhs(totalInvestment)} Lakh
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
