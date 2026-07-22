import { useState, useRef, useEffect, useMemo } from 'react'
import { useAppStore } from '../../store'
import { motion } from 'framer-motion'
import { cn, formatCurrency } from '../../lib/utils'
import type { SimulationResult, LifeGoal, UserProfile, WhatIfParams } from '../../types'

interface SmartKidGoalCardProps {
  result: SimulationResult
  goal: LifeGoal
  profile: UserProfile
  event: any
  isEven: boolean
  catColor: string
  isSimulating: boolean
  whatIfParams: any
}

export default function SmartKidGoalCard({
  result,
  goal,
  profile,
  event,
  isEven,
  catColor,
  isSimulating,
  whatIfParams,
}: SmartKidGoalCardProps) {
  const setWhatIfParams = useAppStore(state => state.setWhatIfParams);
  const globalWhatIfParams = useAppStore(state => state.whatIfParams);

  const setCardInvestment = useAppStore(state => state.setCardInvestment);
  const setCardPayout = useAppStore(state => state.setCardPayout);
  const setCardInvestmentSchedule = useAppStore(state => state.setCardInvestmentSchedule);
  const setCardPayoutSchedule = useAppStore(state => state.setCardPayoutSchedule);

  // Local state for interactive UI mirroring the ICICI calculator
  // Initialized from AI recommendation
  const initialAnnualPremium = (result.monthlyPremium || 5000) * 12
  
  const today = new Date();
  const formattedDate = `${today.getDate().toString().padStart(2, '0')}/${(today.getMonth() + 1).toString().padStart(2, '0')}/${today.getFullYear()}`;
  
  const [annualInvestment, setAnnualInvestment] = useState<number>(
    Math.max(10000, Math.min(10000000, initialAnnualPremium))
  )
  const [ppt, setPpt] = useState<number>(12) // Pay For (Years)
  const [policyTerm, setPolicyTerm] = useState<number>(25) // Policy Term (Years)
  const [investmentFrequency, setInvestmentFrequency] = useState<'Yearly' | 'Half-Yearly' | 'Monthly'>('Yearly')
  const [payoutFrequency, setPayoutFrequency] = useState<'Equal Income' | 'Increasing Income'>('Increasing Income')
  const [selectedPayoutIdx, setSelectedPayoutIdx] = useState<number>(0) // Default to 1st payout

  // Auto-adjust investment amount when frequency changes to preserve the annual total.
  // Without this, switching from Yearly ₹60K to Monthly treats ₹60K as per-month (₹7.2L/yr).
  const prevFrequencyRef = useRef(investmentFrequency)
  useEffect(() => {
    if (prevFrequencyRef.current !== investmentFrequency) {
      const prevInstallments = prevFrequencyRef.current === 'Monthly' ? 12 : prevFrequencyRef.current === 'Half-Yearly' ? 2 : 1
      const newInstallments = investmentFrequency === 'Monthly' ? 12 : investmentFrequency === 'Half-Yearly' ? 2 : 1
      const annualTotal = annualInvestment * prevInstallments
      setAnnualInvestment(Math.round(annualTotal / newInstallments))
      prevFrequencyRef.current = investmentFrequency
    }
  }, [investmentFrequency])
  
  // What they actually pay over the year
  const installmentsPerYear = investmentFrequency === 'Monthly' ? 12 : investmentFrequency === 'Half-Yearly' ? 2 : 1;
  const actualAnnualPaid = annualInvestment * installmentsPerYear;
  const totalPaid = actualAnnualPaid * ppt;

  // The base premium used to calculate returns (penalized by modal loading)
  const modalFactor = investmentFrequency === 'Monthly' ? (1 / 12) : investmentFrequency === 'Half-Yearly' ? 0.51 : 1.0;
  const baseAnnualPremiumForReturns = annualInvestment / modalFactor;
  const baseTotalPaid = baseAnnualPremiumForReturns * ppt;
  
  // Actuarial Calculation: 4.15% strict IRR (Time Value of Money)
  const rate = 0.0415;
  
  // 1. Calculate FV of all premiums paid at Maturity
  const fvAtPpt = baseAnnualPremiumForReturns * ((Math.pow(1 + rate, ppt) - 1) / rate) * (1 + rate);
  const remainingYears = Math.max(0, policyTerm - ppt);
  const fvPremiumsAtMaturity = fvAtPpt * Math.pow(1 + rate, remainingYears);

  const lifeCover = baseAnnualPremiumForReturns * 10; // 10x Base Premium is standard
  
  // 2. Determine raw payouts based on user's selected structure
  let payout1 = 0, payout2 = 0, payout3 = 0, payout4 = 0;
  if (payoutFrequency === 'Increasing Income') {
    const multiplier = ppt / 10;
    payout1 = baseTotalPaid * 0.15 * multiplier;
    payout2 = baseTotalPaid * 0.20 * multiplier;
    payout3 = baseTotalPaid * 0.30 * multiplier;
    payout4 = baseTotalPaid * 0.35 * multiplier;
  } else {
    // Equal Income formula
    const multiplier = ppt / 5;
    const equalPayout = (baseTotalPaid * 0.25) * multiplier;
    payout1 = equalPayout;
    payout2 = equalPayout;
    payout3 = equalPayout;
    payout4 = equalPayout;
  }

  // 3. Calculate FV of these payouts at Maturity (Assuming they happen in the final 4 years)
  const fvPayoutsAtMaturity = 
    payout1 * Math.pow(1 + rate, 3) + 
    payout2 * Math.pow(1 + rate, 2) + 
    payout3 * Math.pow(1 + rate, 1) + 
    payout4 * 1;

  // 4. Calculate exact maturity benefit to perfectly balance the IRR equation
  const maturityBenefit = Math.max(0, fvPremiumsAtMaturity - fvPayoutsAtMaturity);
  
  // 5. Sum it up to show the final nominal Total Benefit to the user
  const sumOfPayouts = payout1 + payout2 + payout3 + payout4;
  const totalBenefit = sumOfPayouts + maturityBenefit;

  const payouts = [
    { label: `30 yr`, amount: payout1, isMaturity: false, detail: 'On 10th, 12th schooling expense' },
    { label: `31 yr`, amount: payout2, isMaturity: false, detail: 'For college admission / preparation support' },
    { label: `32 yr`, amount: payout3, isMaturity: false, detail: 'For higher studies/ career support' },
    { label: `33 yr`, amount: payout4, isMaturity: false, detail: 'Final year support before maturity' },
  ]
  
  // Find max payout to scale the bars (including maturity for scale calculation if needed, but bars are only for payouts)
  const maxPayout = Math.max(...payouts.map(p => p.amount))

  useEffect(() => {
    if (result?.goalId || goal?.id) {
      const id = result?.goalId || goal?.id;
      setCardInvestment(id, totalPaid);
      setCardPayout(id, totalBenefit);
      const baseAge = (goal?.id && whatIfParams?.goalStartAges?.[goal.id]) ?? profile?.age ?? 30;
      const schedule = [
        { age: baseAge + policyTerm - 3, amount: payout1, label: 'SmartKid Payout 1' },
        { age: baseAge + policyTerm - 2, amount: payout2, label: 'SmartKid Payout 2' },
        { age: baseAge + policyTerm - 1, amount: payout3, label: 'SmartKid Payout 3' },
        { age: baseAge + policyTerm, amount: payout4, label: 'SmartKid Payout 4' },
      ];
      if (maturityBenefit > 0) {
        schedule.push({ age: baseAge + policyTerm, amount: maturityBenefit, label: 'SmartKid Maturity' });
      }
      setCardPayoutSchedule(id, schedule);
      
      const invSchedule = [];
      for (let i = 0; i < ppt; i++) {
        invSchedule.push({ age: baseAge + i, amount: actualAnnualPaid, label: `SmartKid Premium Yr ${i + 1}` });
      }
      setCardInvestmentSchedule(id, invSchedule);
    }
  }, [totalPaid, totalBenefit, policyTerm, payout1, payout2, payout3, payout4, maturityBenefit, profile?.age, whatIfParams?.goalStartAges, ppt, actualAnnualPaid, result?.goalId, goal?.id, setCardInvestment, setCardPayout, setCardPayoutSchedule, setCardInvestmentSchedule]);

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
          
            {/* Dynamic Coverage Banner */}
            <div className="bg-emerald-50 p-3 border-b border-emerald-100 flex justify-between items-center">
               <div>
                 <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider mb-0.5">Coverage</p>
                 <p className="text-sm font-display font-bold text-gray-900">{formatCurrency(totalBenefit)}</p>
               </div>
               <div className="text-right">
                 <div className="bg-emerald-500 text-white text-[10px] font-bold px-2 py-1 rounded-full shadow-sm">
                   {((globalWhatIfParams?.goalTargetAmounts && globalWhatIfParams.goalTargetAmounts[result?.goalId || goal?.id]) || goal?.corpusNeeded || 0) > 0 ? Math.round((totalBenefit / ((globalWhatIfParams?.goalTargetAmounts && globalWhatIfParams.goalTargetAmounts[result?.goalId || goal?.id]) || goal?.corpusNeeded || 0)) * 100) : 0}% of Target
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
            <div className="grid grid-cols-2 gap-4 mb-6 bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
              
              {/* Row 1 */}
              <div className="col-span-2 sm:col-span-1">
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">
                  I want to invest
                </label>
                <input 
                  type="number"
                  value={annualInvestment}
                  disabled={isSimulating}
                  onChange={(e) => setAnnualInvestment(Number(e.target.value))}
                  className="w-full border border-gray-300 rounded-lg p-2 px-3 text-sm font-bold text-gray-800 bg-white h-10 outline-none focus:border-brand-orange focus:ring-1 focus:ring-brand-orange transition-all"
                />
              </div>

              <div className="col-span-2 sm:col-span-1">
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">
                  Investment Frequency
                </label>
                <select 
                  className="w-full border border-gray-300 rounded-lg p-2 px-3 text-sm font-bold text-gray-700 h-10 outline-none focus:border-brand-orange focus:ring-1 focus:ring-brand-orange bg-white transition-all"
                  value={investmentFrequency}
                  onChange={(e) => setInvestmentFrequency(e.target.value as any)}
                  disabled={isSimulating}
                >
                  <option value="Yearly">Yearly</option>
                  <option value="Half-Yearly">Half-Yearly</option>
                  <option value="Monthly">Monthly</option>
                </select>
              </div>

              {/* Row 2 */}
              <div className="col-span-2 sm:col-span-1">
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">
                  Pay For
                </label>
                <select 
                  className="w-full border border-gray-300 rounded-lg p-2 px-3 text-sm font-bold text-gray-700 h-10 outline-none focus:border-brand-orange focus:ring-1 focus:ring-brand-orange bg-white transition-all"
                  value={ppt}
                  onChange={(e) => setPpt(Number(e.target.value))}
                  disabled={isSimulating}
                >
                  <option value={5}>5 Years</option>
                  <option value={7}>7 Years</option>
                  <option value={10}>10 Years</option>
                  <option value={12}>12 Years</option>
                  <option value={15}>15 Years</option>
                </select>
              </div>

              <div className="col-span-2 sm:col-span-1">
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">
                  Policy Term
                </label>
                <select 
                  className="w-full border border-gray-300 rounded-lg p-2 px-3 text-sm font-bold text-gray-700 h-10 outline-none focus:border-brand-orange focus:ring-1 focus:ring-brand-orange bg-white transition-all"
                  value={policyTerm}
                  onChange={(e) => setPolicyTerm(Number(e.target.value))}
                  disabled={isSimulating}
                >
                  {Array.from({ length: 14 }, (_, i) => i + 17).map((term) => (
                    <option key={term} value={term}>{term} Years</option>
                  ))}
                </select>
              </div>

              {/* Row 3 - Payout Frequency */}
              <div className="col-span-2 flex items-center justify-between border-t border-gray-100 pt-4 mt-2">
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                  Payout Frequency
                </label>
                <div className="flex bg-gray-100 p-1 rounded-lg">
                  <button 
                    className={cn("px-4 py-1.5 text-xs font-bold rounded-md transition-all", payoutFrequency === 'Equal Income' ? "bg-white text-gray-800 shadow-sm" : "text-gray-500")}
                    onClick={() => setPayoutFrequency('Equal Income')}
                  >
                    Equal Income
                  </button>
                  <button 
                    className={cn("px-4 py-1.5 text-xs font-bold rounded-md transition-all", payoutFrequency === 'Increasing Income' ? "bg-[#a32a29] text-white shadow-sm" : "text-gray-500 hover:text-gray-700")}
                    onClick={() => setPayoutFrequency('Increasing Income')}
                  >
                    Increasing Income
                  </button>
                </div>
              </div>
            </div>

            {/* Summary Highlights */}
            <div className="flex justify-between items-center bg-brand-navy text-white rounded-xl p-4 mb-6 shadow-md relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-10 -mt-10 blur-xl" />
              
              <div>
                <p className="text-[10px] text-brand-orange font-bold uppercase tracking-wider mb-1">Total Invested</p>
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
                      <div className="text-[11px] font-bold text-gray-800">{formattedDate}</div>
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
              <div className="relative pt-16 pb-4 overflow-x-auto hide-scrollbar">
                <div className="flex justify-between items-end h-40 gap-4 relative z-10 px-2 sm:px-8 min-w-[500px]">
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
                     <p className="text-xs text-gray-400">Guaranteed Benefit (Payouts + Maturity)</p>
                   </div>
                   <div className="text-xl font-display font-bold text-emerald-600">
                     {formatCurrency(totalBenefit)}
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
