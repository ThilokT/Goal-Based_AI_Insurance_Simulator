import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { cn, formatCurrency } from '../../lib/utils'
import type { SimulationResult, LifeGoal, UserProfile } from '../../types'

interface SmartKidGoalCardProps {
  result: SimulationResult
  goal: LifeGoal
  profile: UserProfile
  event: any
  isEven: boolean
  catColor: string
  isSimulating: boolean
}

export default function SmartKidGoalCard({
  result,
  goal,
  profile,
  event,
  isEven,
  catColor,
  isSimulating,
}: SmartKidGoalCardProps) {
  // Local state for interactive UI mirroring the ICICI calculator
  // Initialized from AI recommendation
  const initialAnnualPremium = (result.monthlyPremium || 5000) * 12
  
  const [annualInvestment, setAnnualInvestment] = useState<number>(
    Math.max(10000, Math.min(10000000, initialAnnualPremium))
  )
  const [ppt, setPpt] = useState<number>(12) // Pay For (Years)
  const [selectedPayoutIdx, setSelectedPayoutIdx] = useState<number>(0) // Default to 1st payout
  
  // The policy term is typically longer than PPT, say PPT + 10 years or up to child turning 21
  const policyTerm = Math.max(15, ppt + 13) // e.g. 25 years as in screenshot
  
  // Financial Calculations based on ICICI screenshot approximation
  const totalPaid = annualInvestment * ppt
  const lifeCover = annualInvestment * 10 // 10x Annual Premium is standard
  
  // To mimic the screenshot: 60L investment -> 1.21Cr expected benefit (8% assumed rate)
  const expectedMultiplier = 2.016 // 60L * 2.016 = 1.21 Cr
  const totalBenefit = totalPaid * expectedMultiplier
  
  // Payout breakdown (Guaranteed / 4% rate shown in chart)
  // At 5L annual investment, screenshot shows 12L, 18L, 30L and 60.58L Maturity
  const payout1 = annualInvestment * 2.4 // 5L * 2.4 = 12L
  const payout2 = annualInvestment * 3.6 // 5L * 3.6 = 18L
  const payout3 = annualInvestment * 6.0 // 5L * 6.0 = 30L
  const maturityBenefit = annualInvestment * 12.116 // 5L * 12.116 = 60.58L
  
  const payouts = [
    { label: `30 yr`, amount: payout1, isMaturity: false, detail: 'On 10th, 12th schooling expense' },
    { label: `31 yr`, amount: payout2, isMaturity: false, detail: 'For college admission / preparation support' },
    { label: `32 yr`, amount: payout3, isMaturity: false, detail: 'For higher studies/ career support' },
  ]
  
  // Find max payout to scale the bars (including maturity for scale calculation if needed, but bars are only for payouts)
  const maxPayout = Math.max(...payouts.map(p => p.amount))

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
          <div className="bg-gradient-to-r from-orange-50 to-orange-100/50 p-5 border-b border-orange-100">
            <div className={cn("flex items-center gap-3", isEven ? "sm:flex-row-reverse" : "")}>
              <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center text-2xl shrink-0 shadow-sm border border-orange-200 text-brand-orange">
                {goal?.icon}
              </div>
              <div className={cn(isEven ? "sm:text-right" : "text-left")}>
                <span className="text-[10px] font-bold tracking-wider text-orange-600 uppercase">Age {event.age} • Guaranteed Savings</span>
                <h3 className="font-display font-bold text-gray-900 text-lg leading-tight mt-0.5">{goal?.label}</h3>
                <p className="text-xs text-orange-800/80 font-medium">{result.recommendedProductName}</p>
              </div>
            </div>
          </div>

          <div className="p-5">
            {/* Calculator Controls */}
            <div className="grid grid-cols-2 gap-4 mb-6 bg-gray-50 p-4 rounded-xl border border-gray-100">
              <div className="col-span-2 sm:col-span-1">
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">
                  Annual Investment
                </label>
                <div className="font-display text-lg font-bold text-brand-navy mb-2">
                  {formatCurrency(annualInvestment)}
                </div>
                <input 
                  type="range"
                  min={10000}
                  max={1000000}
                  step={10000}
                  value={annualInvestment}
                  disabled={isSimulating}
                  onChange={(e) => setAnnualInvestment(Number(e.target.value))}
                  className="w-full accent-brand-orange h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
              </div>
              
              <div className="col-span-2 sm:col-span-1 flex flex-col justify-between">
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">
                  Premium Payment Term (PPT)
                </label>
                <select 
                  className="w-full bg-white border border-gray-200 rounded-lg p-2 text-sm text-gray-700 font-medium focus:ring-2 focus:ring-brand-orange focus:border-brand-orange outline-none"
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
            </div>

            {/* Summary Highlights */}
            <div className="flex justify-between items-center bg-brand-navy text-white rounded-xl p-4 mb-6 shadow-md relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-10 -mt-10 blur-xl" />
              
              <div>
                <p className="text-[10px] text-brand-orange font-bold uppercase tracking-wider mb-1">Total Paid</p>
                <p className="text-sm font-semibold">{formatCurrency(totalPaid)}</p>
              </div>
              <div className="text-center">
                <p className="text-[10px] text-white/60 font-bold uppercase tracking-wider mb-1">Life Cover</p>
                <p className="text-sm font-semibold text-white/90">{formatCurrency(lifeCover)}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-green-400 font-bold uppercase tracking-wider mb-1">Total Benefit</p>
                <p className="text-lg font-display font-bold text-white">{formatCurrency(totalBenefit)}</p>
              </div>
            </div>

            {/* Visual Payout Chart */}
            <div className="bg-[#fcfbf9] border border-orange-200 rounded-xl p-5 shadow-inner">
              <h4 className="text-[13px] font-bold text-gray-800 mb-4">How does your Plan look like</h4>
              
              {/* Chart Header */}
              <div className="flex items-center justify-between border-b border-gray-200 pb-4 mb-6">
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-white shadow-sm border border-orange-100 flex items-center justify-center text-lg">📅</div>
                    <div className="text-left">
                      <div className="text-[9px] text-gray-500 uppercase tracking-wide">Policy Starts on</div>
                      <div className="text-[11px] font-bold text-gray-800">12/07/2026</div>
                    </div>
                  </div>
                  <div className="w-px h-8 bg-gray-200"></div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-white shadow-sm border border-orange-100 flex items-center justify-center text-lg">🧒</div>
                    <div className="text-left">
                      <div className="text-[9px] text-gray-500 uppercase tracking-wide">Child's age</div>
                      <div className="text-[11px] font-bold text-gray-800">17 years old</div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 border-l border-gray-200 pl-6">
                   <div className="text-[10px] text-gray-500 font-medium leading-tight text-right w-12">Payout<br/>Option</div>
                   <div className="flex gap-1.5">
                     <div className="w-7 h-7 bg-[#a32a29] text-white rounded flex items-center justify-center text-xs font-bold shadow-md">3</div>
                     <div className="w-7 h-7 border border-gray-300 bg-white rounded flex items-center justify-center text-xs text-gray-400 shadow-sm">4</div>
                   </div>
                </div>
              </div>

              {/* Chart Area */}
              <div className="relative pt-8 pb-4">
                <div className="flex justify-between items-end h-40 gap-4 relative z-10 px-2 sm:px-8">
                  {/* The 3 Payout Bars */}
                  {payouts.map((payout, idx) => {
                    const heightPct = Math.max(15, (payout.amount / maxPayout) * 100)
                    const isSelected = selectedPayoutIdx === idx

                    return (
                      <div key={idx} className="flex flex-col items-center gap-0 flex-1 group cursor-pointer h-full justify-end relative" onClick={() => setSelectedPayoutIdx(idx)}>
                        {/* Bubble above selected */}
                        <div className={cn("text-[11px] font-bold border-2 rounded-full px-3 py-1 bg-white whitespace-nowrap mb-2 shadow-sm transition-all duration-300 absolute z-30 pointer-events-none", isSelected ? "border-brand-orange text-gray-800 opacity-100 transform translate-y-0" : "border-transparent opacity-0 transform translate-y-2")} style={{ bottom: `${heightPct}%`, marginBottom: '32px' }}>
                          {formatCurrency(payout.amount)}
                          {isSelected && <div className="absolute -bottom-1.5 left-1/2 transform -translate-x-1/2 w-2.5 h-2.5 bg-white border-b-2 border-r-2 border-brand-orange rotate-45"></div>}
                        </div>
                        
                        {/* Bar */}
                        <div 
                          className={cn(
                            "w-full max-w-[32px] rounded-t-lg transition-all duration-500 relative z-20 border-t border-l border-r",
                            isSelected 
                              ? "bg-brand-orange border-brand-orange shadow-md" 
                              : "bg-white border-orange-300 hover:border-orange-400"
                          )}
                          style={{ 
                            height: `${heightPct}%`,
                            backgroundImage: isSelected ? 'none' : 'repeating-linear-gradient(45deg, transparent, transparent 2px, #fed7aa 2px, #fed7aa 4px)'
                          }}
                        >
                        </div>
                        
                        {/* Circle on timeline */}
                        <div className={cn(
                          "text-[10px] font-bold rounded-full w-9 h-9 flex items-center justify-center border-2 z-20 bg-white mt-1.5 relative transition-colors shadow-sm",
                          isSelected ? "border-brand-orange text-gray-800" : "border-orange-300 text-gray-600 hover:border-orange-400"
                        )}>
                          {payout.label}
                        </div>
                      </div>
                    )
                  })}

                  {/* Static Maturity Box on the right */}
                  <div className="flex flex-col items-center flex-1 h-full justify-end group">
                     <div className="bg-orange-50 border border-orange-100 rounded-xl p-3 text-center shadow-sm w-full min-w-[100px] relative z-20">
                       <div className="text-2xl mb-1 filter drop-shadow-sm leading-none text-brand-orange">💰</div>
                       <div className="text-[9px] text-gray-600 leading-tight">Maturity benefit at end of the policy</div>
                       <div className="text-[11px] font-bold text-gray-900 mt-1">{formatCurrency(maturityBenefit)}</div>
                     </div>
                     
                     <div className="flex flex-col items-center mt-3 relative z-20">
                       <div className="w-5 h-5 rounded-full bg-[#a32a29] text-white flex items-center justify-center text-[12px] shadow-sm font-bold leading-none">+</div>
                     </div>
                  </div>
                </div>
                
                {/* Dashed timeline */}
                <div className="absolute bottom-[22px] left-8 right-8 h-px border-b border-dashed border-orange-400 z-0" />
              </div>

              {/* Detail Box */}
              <div className="mt-6 border border-gray-200 rounded-xl p-4 flex items-center justify-between bg-white shadow-sm transition-all">
                 <div className="flex items-center gap-3">
                   <div className="w-10 h-10 bg-orange-50 rounded-full flex items-center justify-center text-xl border border-orange-100">🎓</div>
                   <div>
                     <div className="text-[11px] font-medium text-gray-600">{payouts[selectedPayoutIdx].detail}</div>
                   </div>
                 </div>
                 <div className="w-px h-8 bg-gray-200"></div>
                 <div className="text-left">
                   <div className="text-[9px] text-gray-500 uppercase tracking-wide mb-0.5">Amount Received</div>
                   <div className="text-[13px] font-bold text-gray-900">{formatCurrency(payouts[selectedPayoutIdx].amount)}</div>
                 </div>
                 <div className="w-px h-8 bg-gray-200"></div>
                 <div className="text-left pr-4">
                   <div className="text-[9px] text-gray-500 uppercase tracking-wide mb-0.5">Child's age</div>
                   <div className="text-[13px] font-bold text-gray-900">{payouts[selectedPayoutIdx].label.replace(' yr', ' years old')}</div>
                 </div>
              </div>

            </div>

          </div>
        </div>
      </div>
    </motion.div>
  )
}
