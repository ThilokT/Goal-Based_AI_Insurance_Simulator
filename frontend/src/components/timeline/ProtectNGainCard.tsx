import { useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { cn } from '../../lib/utils'
import type { SimulationResult, LifeGoal, UserProfile, WhatIfParams } from '../../types'

interface ProtectNGainCardProps {
  result: SimulationResult
  goal: LifeGoal
  profile: UserProfile
  whatIfParams: WhatIfParams
  event: any
  isEven: boolean
  catColor: string
  isSimulating: boolean
  updateGoalTargetAmount: (goalId: string, targetAmount: number) => void
  updateGoalTargetAmount: (goalId: string, targetAmount: number) => void
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
        className="w-full border border-gray-300 rounded p-1.5 text-xs font-bold text-gray-800 bg-white shadow-sm flex justify-between items-center"
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

export default function ProtectNGainCard({
  result,
  goal,
  profile,
  whatIfParams,
  event,
  isEven,
  catColor
}: ProtectNGainCardProps) {
  
  // State
  const [lifeCover, setLifeCover] = useState(10000000)
  const [policyTerm, setPolicyTerm] = useState(30)
  const [payFor, setPayFor] = useState(12)
  const [paymentFrequency, setPaymentFrequency] = useState('Monthly')
  const [assumedRate, setAssumedRate] = useState(0.08)
  const [pastPerformance, setPastPerformance] = useState(3) // 3, 5, 10
  
  // Advanced ULIP Actuarial Interpolation
  // ICICI Protect N Gain has non-linear charges based on Life Cover.
  // We use piecewise linear interpolation mapped perfectly to real data points.
  const c = lifeCover / 10000000;
  let baseInvestable = 0;
  
  if (c <= 0.5) {
    baseInvestable = 29775 * (c / 0.5);
  } else if (c <= 1.0) {
    baseInvestable = 29775 + ((46808 - 29775) / 0.5) * (c - 0.5);
  } else if (c <= 2.5) {
    baseInvestable = 46808 + ((122103 - 46808) / 1.5) * (c - 1.0);
  } else {
    baseInvestable = 122103 + ((354100 - 122103) / 4.5) * (c - 2.5);
  }
  
  let freqMultiplier = 1.0 // Yearly baseline
  if (paymentFrequency === 'Half-Yearly') freqMultiplier = 0.985
  if (paymentFrequency === 'Monthly') freqMultiplier = 0.97
  
  const investablePremium = baseInvestable * freqMultiplier;
  
  // ULIP Compound Interest Engine
  const calculateReturn = (rate: number) => {
    // FV of Annuity Due for the payment term
    const fvAfterPay = investablePremium * ((Math.pow(1 + rate, payFor) - 1) / rate) * (1 + rate)
    // Compounded for the remainder of the policy term
    const waitYears = policyTerm - payFor
    return fvAfterPay * Math.pow(1 + rate, waitYears)
  }
  
  const assumedReturnAmount = calculateReturn(assumedRate)
  
  let pastPerformanceRate = 0.1249
  if (pastPerformance === 5) pastPerformanceRate = 0.1224
  if (pastPerformance === 10) pastPerformanceRate = 0.1238
  
  const pastPerformanceAmount = calculateReturn(pastPerformanceRate)
  
  // Formatting helpers
  const formatLakhs = (val: number) => (val / 100000).toFixed(2)
  const formatCrores = (val: number) => (val / 10000000).toFixed(2)
  
  const formatAmount = (val: number) => {
    if (val >= 10000000) return `₹${formatCrores(val)} Crore`
    return `₹${formatLakhs(val)} Lakh`
  }

  // Generate Dropdown Options
  const lifeCoverOptions = []
  for (let i = 50; i <= 700; i += 25) {
    lifeCoverOptions.push(i * 100000)
  }
  
  const policyTermOptions = Array.from({ length: 31 }, (_, i) => i + 10) // 10 to 40
  const payForOptions = [5, 6, 7, 8, 9, 10, 11, 12]

  return (
    <motion.div 
      key={result.goalId} 
      initial={{ opacity: 0, y: 30 }} 
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.5 }}
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
        "ml-10 sm:ml-0 w-full flex items-center",
        isEven ? "sm:justify-end sm:pr-10" : "sm:justify-start sm:pl-10",
        "sm:w-1/2"
      )}>
        <div className="w-full bg-[#fcf9f5] p-5 rounded-2xl shadow-sm border border-gray-200 hover:shadow-lg transition-all duration-300 relative overflow-hidden flex flex-col gap-5">
          
          {/* Header */}
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] font-bold text-red-600 tracking-wider uppercase mb-1">
                Age {event?.age ?? profile?.age ?? 30} • Protect N Gain
              </p>
              <h3 className="font-display font-bold text-gray-900 text-xl leading-tight">ICICI Pru Protect N Gain</h3>
              <p className="text-sm text-gray-500 mt-1">High Life Cover + Market Linked Return</p>
            </div>
            <div className="w-10 h-10 rounded-full flex items-center justify-center text-xl shrink-0 bg-red-50 text-brand-orange border border-red-100 shadow-sm">
              {goal?.icon ?? '🎯'}
            </div>
          </div>
          
          {/* LEFT PANEL - CONTROLS */}
          <div className="flex-1 flex flex-col pt-1">
            

            
            {/* Form Grid */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-4 mb-6">
              <div>
                <label className="text-[10px] text-gray-500 font-medium mb-1 block flex items-center gap-1">Life Cover <span className="text-[9px] w-3 h-3 bg-orange-500 text-white rounded-full flex items-center justify-center">i</span></label>
                <CustomSelect 
                  value={lifeCover}
                  onChange={setLifeCover}
                  options={lifeCoverOptions}
                  formatOption={(val) => val >= 10000000 
                    ? `₹ ${(val / 10000000).toFixed(2).replace(/\.00$/, '')} Crore` 
                    : `₹ ${(val / 100000).toFixed(0)} Lakh`
                  }
                />
                <span className="text-[8px] text-gray-400 italic block mt-1 text-center pr-2">One Crore only</span>
              </div>
              <div>
                <label className="text-[10px] text-gray-500 font-medium mb-1 block">Policy Term (For)</label>
                <CustomSelect 
                  value={policyTerm}
                  onChange={setPolicyTerm}
                  options={policyTermOptions}
                  formatOption={(val) => `${val} Years`}
                />
              </div>
              <div>
                <label className="text-[10px] text-gray-500 font-medium mb-1 block">Payment Frequency</label>
                <CustomSelect 
                  value={paymentFrequency}
                  onChange={setPaymentFrequency}
                  options={['Monthly', 'Half-Yearly', 'Yearly']}
                />
              </div>
              <div>
                <label className="text-[10px] text-gray-500 font-medium mb-1 block">Pay For</label>
                <CustomSelect 
                  value={payFor}
                  onChange={setPayFor}
                  options={payForOptions}
                  formatOption={(val) => `${val} Years`}
                />
              </div>
            </div>
            
            {/* Additional Riders */}
            <div className="bg-[#f5ece1] rounded-lg p-3 border border-orange-100/50 mt-auto shadow-sm relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-[#df5a35]" />
              <h4 className="text-[11px] font-bold text-gray-800 mb-2.5 ml-2">Additional Riders included</h4>
              <div className="space-y-1.5 ml-2">
                <div className="flex justify-between items-center text-[10px]">
                  <span className="text-gray-600 flex items-center gap-1">Accidental Death Rider <span className="w-3 h-3 bg-orange-500 text-white rounded-full flex items-center justify-center text-[7px]">i</span></span>
                  <span className="font-bold text-gray-800">{formatAmount(lifeCover)}</span>
                </div>
                <div className="flex justify-between items-center text-[10px]">
                  <span className="text-gray-600 flex items-center gap-1">Accidental Disability Rider <span className="w-3 h-3 bg-orange-500 text-white rounded-full flex items-center justify-center text-[7px]">i</span></span>
                  <span className="font-bold text-gray-800">{formatAmount(lifeCover * 0.8)}</span>
                </div>
                <div className="flex justify-between items-center text-[10px]">
                  <span className="text-gray-600 flex items-center gap-1">Term Booster Rider <span className="w-3 h-3 bg-orange-500 text-white rounded-full flex items-center justify-center text-[7px]">i</span></span>
                  <span className="font-bold text-gray-800">{formatAmount(lifeCover * 0.2)}</span>
                </div>
              </div>
            </div>
            
          </div>
          
          {/* RIGHT PANEL - RESULTS */}
          <div className="flex-1 flex flex-col bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
            
            {/* Top Maturity Banner */}
            <div className="bg-[#fff8ee] p-3.5 border-b border-[#f3e7d8] flex justify-between items-center">
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-4 bg-[#df5a35] rounded-full flex items-center justify-center">
                  <span className="text-[10px] text-white">💧</span>
                </div>
                <span className="text-[11px] font-extrabold text-gray-800">Get Tax-Free Maturity* + Life Cover¹</span>
              </div>
              <span className="text-[13px] font-extrabold text-gray-900">{formatAmount(lifeCover)}</span>
            </div>
            
            {/* Assumed Rate of Return */}
            <div className="p-4 pt-5 border-b border-gray-100 border-dashed relative">
              <div className="absolute top-[-1px] left-0 w-full flex justify-center">
                 <div className="w-8 h-px bg-white" />
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[11px] text-gray-600 font-medium">Based on assumed rate of return</span>
                <div className="flex bg-white border border-gray-300 rounded overflow-hidden shadow-sm">
                  <button 
                    onClick={() => setAssumedRate(0.08)}
                    className={cn("px-2.5 py-0.5 text-[10px] font-bold transition-colors", assumedRate === 0.08 ? "bg-[#b73238] text-white" : "text-gray-500 hover:bg-gray-50")}
                  >8%</button>
                  <div className="w-px bg-gray-300" />
                  <button 
                    onClick={() => setAssumedRate(0.04)}
                    className={cn("px-2.5 py-0.5 text-[10px] font-bold transition-colors", assumedRate === 0.04 ? "bg-[#b73238] text-white" : "text-gray-500 hover:bg-gray-50")}
                  >4%</button>
                </div>
              </div>
              <div className="mt-2 text-right sm:text-center">
                <span className="text-xl font-extrabold text-[#b73238]">{formatAmount(assumedReturnAmount)}</span>
              </div>
            </div>
            
            {/* Past Performance */}
            <div className="p-4 pt-5 border-b border-gray-100 bg-[#fdf9f4]">
              <div className="flex justify-between items-start">
                <div className="flex flex-col gap-2.5">
                  <span className="text-[11px] text-gray-600 font-medium">Based on actual past performance^</span>
                  <div className="flex gap-1.5">
                    {[3, 5, 10].map(yr => (
                      <button
                        key={yr}
                        onClick={() => setPastPerformance(yr)}
                        className={cn(
                          "px-3 py-0.5 text-[10px] rounded-full border transition-all shadow-sm",
                          pastPerformance === yr 
                            ? "bg-[#df5a35] text-white border-[#df5a35] font-bold" 
                            : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50 font-medium"
                        )}
                      >
                        {yr} Yr
                      </button>
                    ))}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xl font-extrabold text-[#b73238]">{formatAmount(pastPerformanceAmount)}</div>
                  <div className="text-[10px] text-gray-700 font-bold mt-0.5 flex flex-col items-end">
                    <span>@{(pastPerformanceRate * 100).toFixed(2)}%</span>
                    <span className="font-medium text-[8px] text-gray-400">as on 10-Jul-2026</span>
                  </div>
                </div>
              </div>
            </div>
            

            

            
          </div>

        </div>
      </div>
    </motion.div>
  )
}
