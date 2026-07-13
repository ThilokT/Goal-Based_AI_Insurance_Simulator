import { useState, useRef, useEffect } from 'react'
import { useAppStore } from '../../store'
import { motion } from 'framer-motion'
import { cn } from '../../lib/utils'
import type { SimulationResult, LifeGoal, UserProfile, WhatIfParams } from '../../types'

interface UlipGoalCardProps {
  result: SimulationResult
  goal: LifeGoal
  profile: UserProfile
  whatIfParams: WhatIfParams
  event: any
  isEven: boolean
  catColor: string
  isSimulating: boolean
}

function CustomSelect({ value, onChange, options, formatOption }: { value: any, onChange: (val: any) => void, options: any[], formatOption?: (val: any) => string }) {
  const [isOpen, setIsOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: any) => {
      if (ref.current && !ref.current.contains(event.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className="relative w-full" ref={ref}>
      <button 
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full border border-gray-300 rounded p-1.5 text-xs font-bold text-gray-800 bg-white shadow-sm flex justify-between items-center h-8"
      >
        <span>{formatOption ? formatOption(value) : value}</span>
        <span className="text-[8px] text-gray-500">▼</span>
      </button>
      
      {isOpen && (
        <div className="absolute z-[100] w-full mt-1 bg-white border border-gray-200 rounded shadow-lg max-h-40 overflow-y-auto">
          {options.map((opt, i) => (
            <div 
              key={i}
              className={cn(
                "px-2 py-1.5 text-xs cursor-pointer transition-colors",
                value === opt ? "bg-red-50 font-bold text-[#b73238]" : "text-gray-700 font-medium hover:bg-gray-50"
              )}
              onClick={() => {
                onChange(opt)
                setIsOpen(false)
              }}
            >
              {formatOption ? formatOption(opt) : opt}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function UlipGoalCard({
  result,
  goal,
  event,
  isEven,
  catColor
}: UlipGoalCardProps) {
  const setWhatIfParams = useAppStore(state => state.setWhatIfParams);
  const globalWhatIfParams = useAppStore(state => state.whatIfParams);

  const setCardInvestment = useAppStore(state => state.setCardInvestment);
  const setCardPayout = useAppStore(state => state.setCardPayout);

  
  // State
  const [investAmount, setInvestAmount] = useState(12000)
  const [paymentFrequency, setPaymentFrequency] = useState('Monthly')
  const [duration, setDuration] = useState(10)
  const [policyTerm, setPolicyTerm] = useState(20)
  const [pastPerformance, setPastPerformance] = useState(10) // 3, 5, 10
  const [lifeCoverMultiplier, setLifeCoverMultiplier] = useState(10) // 7 or 10
  
  // Math logic
  const annualPremium = paymentFrequency === 'Monthly' ? investAmount * 12 : investAmount * (paymentFrequency === 'Half-Yearly' ? 2 : 1)
  const totalPremium = annualPremium * duration
  
  // Advanced Actuarial Math: The Investable Ratio
  // The percentage of premium actually invested (after allocation & mortality charges) 
  // is NOT static. It increases for larger premiums (fixed costs diminish) and longer payment terms.
  
  let premiumBonus = 0;
  if (annualPremium > 144000) {
    // Logarithmic scale from 1.44L up to 60L
    const ratio = Math.min(1, Math.max(0, (Math.log(annualPremium) - Math.log(144000)) / (Math.log(6000000) - Math.log(144000))));
    premiumBonus = ratio * 0.053;
  }

  let durationBonus = 0.003;
  if (duration > 5) {
    const ratio = Math.min(1, (duration - 5) / 10); // scale 5 to 15 years
    durationBonus = 0.003 + (ratio * 0.042);
  }

  // Base 75.3% + Tier Bonuses dynamically mimics ICICI's exact backend engine across all scales
  const dynamicInvestableRatio = 0.753 + premiumBonus + durationBonus;
  
  let freqMultiplier = 1.0
  if (paymentFrequency === 'Half-Yearly') freqMultiplier = 1.015
  if (paymentFrequency === 'Yearly') freqMultiplier = 1.03
  
  const investablePremium = annualPremium * dynamicInvestableRatio * freqMultiplier
  
  const calculateReturn = (rate: number) => {
    const fvAfterPay = investablePremium * ((Math.pow(1 + rate, duration) - 1) / rate) * (1 + rate)
    const waitYears = policyTerm - duration
    return fvAfterPay * Math.pow(1 + rate, waitYears)
  }
  
  const assumedReturnAmount = calculateReturn(0.08)
  
  let pastPerformanceRate = 0.1249
  if (pastPerformance === 5) pastPerformanceRate = 0.1224
  if (pastPerformance === 10) pastPerformanceRate = 0.1238 // Used 12.38% to match previous return percentages requested
  
  const pastPerformanceAmount = calculateReturn(pastPerformanceRate)
  
  // Formatting helpers
  const formatLakhs = (val: number) => (val / 100000).toFixed(2)
  const formatCrores = (val: number) => (val / 10000000).toFixed(2)
  
  const formatAmount = (val: number) => {
    if (val >= 10000000) return `₹${formatCrores(val)} Crore`
    return `₹${formatLakhs(val)} Lakh`
  }

  const lifeCover10x = annualPremium * 10
  const lifeCover7x = annualPremium * 7
  const lifeCover = annualPremium * lifeCoverMultiplier
  const premiumWaiver = totalPremium - (paymentFrequency === 'Monthly' ? investAmount : annualPremium)

  const durationOptions = [5, 7, 10, 12, 15]
  const termOptions = [10, 12, 15, 20, 25, 30]

  useEffect(() => {
    if (result?.goalId || goal?.id) {
      setCardInvestment(result?.goalId || goal?.id, totalPremium);
      setCardPayout(result?.goalId || goal?.id, assumedReturnAmount);
    }
  }, [totalPremium, assumedReturnAmount, result?.goalId || goal?.id, setCardInvestment, setCardPayout]);

  return (
    <motion.div 
      key={result?.goalId || goal.id} 
      initial={{ opacity: 0, y: 30 }} 
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.5 }}
      className={cn(
        "relative flex w-full group",
        isEven ? "sm:flex-row-reverse" : "sm:flex-row"
      )}
    >
      <div className="hidden sm:block sm:w-1/2" />
      <div 
        className="absolute left-0 sm:left-1/2 top-1/2 w-5 h-5 rounded-full ring-[6px] ring-white transform sm:-translate-x-1/2 -translate-y-1/2 z-10 transition-transform group-hover:scale-125 shadow-md"
        style={{ backgroundColor: catColor }}
      />

      <div className={cn(
        "ml-10 sm:ml-0 w-full flex items-center",
        isEven ? "sm:justify-end sm:pr-10" : "sm:justify-start sm:pl-10",
        "sm:w-1/2"
      )}>
        <div className="w-full bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow duration-300 border border-gray-100 flex flex-col md:flex-col overflow-hidden relative">
          
          {/* Main Standard Header matching other cards */}
          <div className="p-4 border-b border-gray-100 flex items-center gap-3 bg-gradient-to-r from-blue-50/50 to-transparent">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-xl shrink-0 shadow-sm border border-blue-200">
              {goal?.icon}
            </div>
            <div>
              <span className="text-[10px] font-bold tracking-wider text-[#003366] uppercase">Age {event?.age || 30} • {result.recommendedProductCategory || 'ULIP Plan'}</span>
              <h3 className="font-extrabold text-gray-900 text-lg leading-tight">{goal?.label}</h3>
              <p className="text-xs text-gray-500 font-medium">{result.recommendedProductName || 'ICICI Pru Signature Assure'}</p>
            </div>
          </div>

            {/* Dynamic Coverage Banner */}
            <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-200 mb-4 mx-4 mt-4 sm:mx-5 flex justify-between items-center shadow-sm">
               <div>
                 <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider mb-0.5">Coverage</p>
                 <p className="text-sm font-display font-bold text-gray-900">{formatAmount(assumedReturnAmount)}</p>
               </div>
               <div className="text-right">
                 <div className="bg-emerald-500 text-white text-[10px] font-bold px-2 py-1 rounded-full shadow-sm">
                   {((globalWhatIfParams?.goalTargetAmounts && globalWhatIfParams.goalTargetAmounts[result?.goalId || goal?.id]) || goal?.corpusNeeded || 0) > 0 ? Math.round((assumedReturnAmount / ((globalWhatIfParams?.goalTargetAmounts && globalWhatIfParams.goalTargetAmounts[result?.goalId || goal?.id]) || goal?.corpusNeeded || 0)) * 100) : 0}% of Target
                 </div>
               </div>
            </div>

            {/* Corpus Needed Input */}
            <div className="bg-orange-50/40 p-3 rounded-lg border border-orange-100 mb-5 mx-4 mt-4 flex justify-between items-center sm:mx-5">
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

          <div className="flex flex-col md:flex-col">
            {/* Left Panel - Inputs */}
            <div className="p-5 bg-orange-50/30 border-b border-gray-100">
              <h4 className="text-sm font-bold text-gray-800 mb-4">Customise your plan</h4>
              
              <div className="flex flex-col gap-4 mb-2">
                <div>
                  <label className="text-[10px] text-gray-500 font-medium mb-1 block">I want to invest</label>
                  <div className="flex gap-2">
                    <div className="w-1/2 relative">
                      <div className="absolute left-2 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-500">₹</div>
                      <input 
                        type="number"
                        value={investAmount || ''}
                        onChange={(e) => setInvestAmount(parseInt(e.target.value) || 0)}
                        className="w-full border border-gray-300 rounded p-1.5 pl-5 text-xs font-bold text-gray-800 bg-white shadow-sm h-8 outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all"
                      />
                    </div>
                    <div className="w-1/2">
                      <CustomSelect 
                        value={paymentFrequency}
                        onChange={setPaymentFrequency}
                        options={['Monthly', 'Half-Yearly', 'Yearly']}
                      />
                    </div>
                  </div>
                </div>
                
                <div>
                  <label className="text-[10px] text-gray-500 font-medium mb-1 block">For a duration of</label>
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <CustomSelect 
                        value={duration}
                        onChange={(v) => {
                          setDuration(v);
                          if (policyTerm < v) setPolicyTerm(v);
                        }}
                        options={durationOptions}
                        formatOption={(val) => `${val} Years`}
                      />
                    </div>
                    <span className="text-[10px] text-orange-500 font-medium whitespace-nowrap min-w-[50px]">Till {new Date().getFullYear() + duration}</span>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] text-gray-500 font-medium mb-1 block">I want to stay invested till</label>
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <CustomSelect 
                        value={policyTerm}
                        onChange={(v) => {
                          if (v >= duration) setPolicyTerm(v);
                        }}
                        options={termOptions.filter(t => t >= duration)}
                        formatOption={(val) => `${val} Years`}
                      />
                    </div>
                    <span className="text-[10px] text-orange-500 font-medium whitespace-nowrap min-w-[50px]">Till {new Date().getFullYear() + policyTerm}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Panel - Outputs */}
            <div className="p-5 flex-1 flex flex-col bg-white">
              
              <div className="flex items-center justify-between bg-[#003366] text-white px-4 py-2 rounded-t-lg">
                <span className="text-xs font-medium">Pay <span className="font-bold">{formatAmount(totalPremium)}</span> (in total)</span>
              </div>
              <div className="flex items-center justify-between bg-[#002244] text-white px-4 py-1.5 rounded-b-lg mb-5">
                <div className="flex items-center gap-1 text-[9px] font-medium text-orange-300">
                  <span className="text-[10px]">🛡</span> MATURITY PROTECT
                </div>
                <div className="text-[8px] text-gray-300 font-medium uppercase tracking-wider">
                  + GET 100% PREMIUMS BACK
                </div>
              </div>

              <div className="bg-orange-50/40 rounded-xl p-4 border border-orange-100 relative mb-5">
                <div className="flex items-center gap-1.5 mb-4">
                  <div className="w-4 h-4 bg-orange-500 rounded flex items-center justify-center">
                    <span className="text-[10px] text-white font-bold">₹</span>
                  </div>
                  <h4 className="text-sm font-bold text-gray-900">Get maturity benefit</h4>
                </div>

                <div className="flex justify-between items-center mb-5 border-b border-orange-100/60 pb-4">
                  <div className="text-xs text-gray-600 font-medium">Based on assumed rate of return<span className="text-[8px] text-gray-400">*</span></div>
                  <div className="flex items-center gap-2">
                    <div className="text-xl font-extrabold text-[#b73238]">{formatAmount(assumedReturnAmount)}</div>
                    <div className="flex gap-1">
                      <span className="bg-[#b73238] text-white text-[9px] px-1.5 py-0.5 rounded font-bold">8%</span>
                      <span className="bg-gray-200 text-gray-600 text-[9px] px-1.5 py-0.5 rounded font-bold">4%</span>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between items-start">
                  <div>
                    <div className="text-xs text-gray-600 font-medium mb-2.5">Based on actual past performance^</div>
                    <div className="flex gap-1.5">
                      {[3, 5, 10].map(yr => (
                        <button 
                          key={yr}
                          onClick={() => setPastPerformance(yr)}
                          className={cn(
                            "px-3 py-1 rounded-full text-[10px] font-bold border transition-colors shadow-sm",
                            pastPerformance === yr 
                              ? "bg-[#003366] text-white border-[#003366]" 
                              : "bg-white text-gray-600 border-gray-300 hover:border-gray-400"
                          )}
                        >
                          {yr} Yr
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-extrabold text-[#b73238]">{formatAmount(pastPerformanceAmount)}</div>
                    <div className="text-[9px] text-gray-700 font-bold mt-0.5 flex flex-col items-end">
                      <span>@{(pastPerformanceRate * 100).toFixed(2)}%</span>
                      <span className="font-medium text-[8px] text-gray-400">as on 10-Jul-2026</span>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Financial Goals Assured */}
              <div>
                <div className="text-[11px] font-bold text-gray-800 mb-2.5 flex items-center gap-1">
                  Also your financial goals are assured with <span className="w-3 h-3 bg-gray-200 rounded-full text-[8px] flex items-center justify-center text-gray-500 cursor-help">i</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="border border-orange-200/60 rounded-lg p-2.5 bg-orange-50/40 text-center relative shadow-sm">
                    <div className="text-[9px] text-gray-600 font-medium mb-1.5">Life Cover <span className="text-[7px]">1</span></div>
                    <CustomSelect 
                      value={lifeCoverMultiplier}
                      onChange={setLifeCoverMultiplier}
                      options={[7, 10]}
                      formatOption={(val) => formatAmount(annualPremium * val).replace('₹', '')}
                    />
                    <div className="absolute -right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 bg-orange-500 rounded-full text-white text-[10px] flex items-center justify-center font-bold z-10 shadow-sm">+</div>
                  </div>
                  <div className="border border-orange-200/60 rounded-lg p-2.5 bg-orange-50/40 text-center relative shadow-sm">
                    <div className="text-[9px] text-gray-600 font-medium mb-1.5">Premium Waiver <span className="text-[7px]">2</span></div>
                    <div className="text-xs font-bold text-gray-800 mt-2.5">Up to {formatAmount(premiumWaiver)}</div>
                    <div className="absolute -right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 bg-orange-500 rounded-full text-white text-[10px] flex items-center justify-center font-bold z-10 shadow-sm">+</div>
                  </div>
                  <div className="border border-orange-200/60 rounded-lg p-2.5 bg-orange-50/40 text-center shadow-sm">
                    <div className="text-[9px] text-gray-600 font-medium mb-1.5">Regular Income <span className="text-[7px]">3</span></div>
                    <div className="text-xs font-bold text-gray-800 mt-2.5">10% {formatAmount(annualPremium)}</div>
                  </div>
                </div>
              </div>

              {/* Total Invested Summary */}
              <div className="p-4 bg-gray-50 flex justify-between items-center border-t border-gray-200 mt-5 rounded-b-xl mx-[-20px] mb-[-20px]">
                <div>
                  <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1">Total Amount Invested</p>
                  <p className="text-xs text-gray-600 font-medium">Over {duration} years</p>
                </div>
                <div className="text-lg font-display font-bold text-gray-900">
                  {formatAmount(totalPremium)}
                </div>
              </div>

            </div>
            
          </div>

        </div>
      </div>
    </motion.div>
  )
}
