import { useState } from 'react'
import { motion } from 'framer-motion'
import { cn, formatCurrency } from '../../lib/utils'
import type { SimulationResult, LifeGoal, UserProfile } from '../../types'

interface IProtectGoalCardProps {
  result: SimulationResult
  goal: LifeGoal
  profile: UserProfile
  event: any
  isEven: boolean
  catColor: string
  isSimulating: boolean
}

export default function IProtectGoalCard({
  result,
  goal,
  profile,
  event,
  isEven,
  catColor,
  isSimulating,
}: IProtectGoalCardProps) {
  // Local state for interactive UI mirroring the ICICI calculator
  const initialLifeCover = goal.corpusNeeded || 10000000
  
  const [lifeCover, setLifeCover] = useState<number>(Math.max(5000000, initialLifeCover))
  const [coverTillAge, setCoverTillAge] = useState<number>(65)
  const [refundPremium, setRefundPremium] = useState<boolean>(false)
  
  const [ciCover, setCiCover] = useState<number>(1500000)
  const [adcCover, setAdcCover] = useState<number>(5000000)
  const [atpdCover, setAtpdCover] = useState<number>(0)
  const [wop, setWop] = useState<boolean>(false)

  const [paymentTerm, setPaymentTerm] = useState<'regular' | 'limited10' | 'limited15' | 'limited39'>('limited10')

  // ----- Calculations -----
  // Base rate assumption: 1Cr cover base premium is actually ~₹513/mo (the 1191 in screenshot 1 includes add-ons)
  const baseMonthlyPerLakh = 5.13
  const coverInLakhs = lifeCover / 100000
  let baseMonthly = coverInLakhs * baseMonthlyPerLakh

  // Cover Till Age adjustment (rough proxy)
  if (coverTillAge === 60) baseMonthly *= 0.9
  if (coverTillAge === 70) baseMonthly *= 1.15
  
  // Refund Premium adjustment
  if (refundPremium) baseMonthly *= 1.45

  // Add-ons (scaled based on chosen cover amount)
  const ciCost = (ciCover / 100000) * 13.2
  const adcCost = (adcCover / 100000) * 5.04
  const atpdCost = (atpdCover / 100000) * 3.78
  // WOP scales roughly at 5% of (Base + CI + ATPD) since it waives them
  const wopCost = wop ? (baseMonthly + ciCost + atpdCost) * 0.05 : 0
  
  const totalAddonsMonthly = ciCost + adcCost + atpdCost + wopCost
  
  const subTotalMonthly = baseMonthly + totalAddonsMonthly

  // Payment Term Multipliers
  const regularYears = coverTillAge - profile.age
  const regularOutflow = subTotalMonthly * 12 * regularYears

  const paymentTermMultipliers = {
    limited10: { mult: 2.35, label: 'Limited Pay', desc: `Pay till age ${profile.age + 10}`, subDesc: '(for 10 years)', years: 10, isRecommended: true },
    regular: { mult: 1, label: 'Regular Pay', desc: `Pay till age ${coverTillAge}`, subDesc: `(for ${regularYears} years)`, years: regularYears, isRecommended: false },
    limited39: { mult: 1.016, label: 'Limited Pay', desc: `Pay till age ${profile.age + 39}`, subDesc: '(for 39 years)', years: 39, isRecommended: false },
    limited15: { mult: 1.88, label: 'Limited Pay', desc: `Pay till age ${profile.age + 15}`, subDesc: '(for 15 years)', years: 15, isRecommended: false }
  }

  const finalMonthly = subTotalMonthly * paymentTermMultipliers[paymentTerm].mult
  
  const formatExactCurrency = (num: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(num)
  }

  const activeAddonsCount = [ciCover > 0, adcCover > 0, atpdCover > 0, wop].filter(Boolean).length

  // Helper for generating dropdown options up to the base life cover
  const getCoverOptions = () => {
    const options = []
    for (let val = 500000; val <= lifeCover; val += 500000) {
      options.push(val)
    }
    return options
  }
  const coverOptions = getCoverOptions()

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
        <div className="w-full bg-white rounded-2xl shadow-sm border border-gray-100 hover:shadow-lg transition-all duration-300 overflow-hidden flex flex-col">
          
          {/* Header */}
          <div className="bg-[#fdfaf6] p-5 border-b border-gray-100">
            <div className={cn("flex items-center gap-3 mb-4", isEven ? "sm:flex-row-reverse" : "")}>
              <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center text-2xl shrink-0 shadow-sm border border-orange-200 text-brand-orange">
                {goal?.icon}
              </div>
              <div className={cn(isEven ? "sm:text-right" : "text-left")}>
                <span className="text-[10px] font-bold tracking-wider text-orange-600 uppercase">Age {event.age} • Pure Protection</span>
                <h3 className="font-display font-bold text-gray-900 text-lg leading-tight mt-0.5">{goal?.label}</h3>
                <p className="text-xs text-gray-500 font-medium">{result.recommendedProductName}</p>
              </div>
            </div>

            {/* Main Inputs */}
            <div className="flex flex-col sm:flex-row gap-4 bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
              <div className="flex-1">
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">
                  Life Cover
                </label>
                <div className="font-display text-lg font-bold text-gray-900 mb-2">
                  {formatCurrency(lifeCover)}
                </div>
                <input 
                  type="range"
                  min={5000000}
                  max={50000000}
                  step={1000000}
                  value={lifeCover}
                  disabled={isSimulating}
                  onChange={(e) => setLifeCover(Number(e.target.value))}
                  className="w-full accent-brand-orange h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
              </div>
              
              <div className="flex-1 flex flex-col justify-between">
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">
                  Cover Till Age
                </label>
                <select 
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2 text-sm text-gray-700 font-medium focus:ring-2 focus:ring-brand-orange focus:border-brand-orange outline-none"
                  value={coverTillAge}
                  onChange={(e) => setCoverTillAge(Number(e.target.value))}
                  disabled={isSimulating}
                >
                  <option value={60}>60 Years</option>
                  <option value={65}>65 Years</option>
                  <option value={70}>70 Years</option>
                </select>
              </div>
            </div>
            
            {/* Refund Premium Toggle */}
            <div className="flex justify-between items-center bg-[#466a87] text-white p-3 rounded-lg mt-3 shadow-inner">
              <div className="text-xs font-medium">You can exit the policy at age 60 years and get 100% Premium Refund</div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider">100% Premium Refund</span>
                <button 
                  onClick={() => !isSimulating && setRefundPremium(!refundPremium)}
                  className={cn(
                    "relative inline-flex h-5 w-9 items-center rounded-full transition-colors",
                    refundPremium ? "bg-brand-orange" : "bg-gray-400"
                  )}
                >
                  <span className={cn("inline-block h-3 w-3 transform rounded-full bg-white transition-transform", refundPremium ? "translate-x-5" : "translate-x-1")} />
                </button>
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="p-5 flex-1 bg-white">
            
            {/* Built-in Benefits */}
            <div className="bg-orange-50 border border-orange-100 rounded-lg p-3 mb-5 flex justify-between items-center">
              <span className="text-xs font-bold text-brand-orange">Built-in Benefits <span className="text-gray-500 font-normal">All @ 0 cost!</span></span>
              <div className="flex gap-3 text-[10px] font-medium text-gray-600">
                <span className="flex items-center gap-1"><span className="text-brand-orange">♥</span> Terminal Illness</span>
                <span className="flex items-center gap-1"><span className="text-brand-orange">♥</span> 12-mo Break</span>
              </div>
            </div>

            {/* Add-ons */}
            <div className="mb-5">
              <div className="flex justify-between items-center mb-3">
                <h4 className="text-sm font-bold text-[#003366] bg-[#003366] text-white px-3 py-1 rounded-r-full -ml-5">Selected add-ons ({activeAddonsCount}/4)</h4>
              </div>
              <div className="grid grid-cols-2 gap-3">
                
                {/* Critical Illness Cover */}
                <div className={cn("border rounded-lg p-3 relative transition-colors", ciCover > 0 ? "border-brand-orange bg-orange-50/20" : "border-gray-200 hover:border-orange-200")}>
                  <div className="flex justify-between items-start mb-2 cursor-pointer" onClick={() => setCiCover(ciCover > 0 ? 0 : 1500000)}>
                    <span className="text-[10px] font-bold text-gray-700 leading-tight pr-4">Critical Illness Cover</span>
                    <div className={cn("w-3 h-3 rounded text-[8px] flex items-center justify-center border", ciCover > 0 ? "bg-brand-orange border-brand-orange text-white" : "border-gray-300")}>
                      {ciCover > 0 && "✓"}
                    </div>
                  </div>
                  <div className="flex justify-between items-end">
                    <select 
                      disabled={ciCover === 0}
                      value={ciCover} 
                      onChange={(e) => setCiCover(Number(e.target.value))}
                      className="text-[11px] font-medium text-gray-900 bg-transparent border-b border-gray-300 focus:border-brand-orange outline-none pb-0.5"
                    >
                      {coverOptions.map(opt => <option key={opt} value={opt}>{(opt/100000).toFixed(2)} Lakh</option>)}
                    </select>
                    <span className="text-[10px] text-gray-500 font-semibold">@ ₹{Math.round(ciCost)} / mo</span>
                  </div>
                </div>

                {/* Accidental Death Cover */}
                <div className={cn("border rounded-lg p-3 relative transition-colors", adcCover > 0 ? "border-brand-orange bg-orange-50/20" : "border-gray-200 hover:border-orange-200")}>
                  <div className="flex justify-between items-start mb-2 cursor-pointer" onClick={() => setAdcCover(adcCover > 0 ? 0 : 5000000)}>
                    <span className="text-[10px] font-bold text-gray-700 leading-tight pr-4">Accidental Death Cover</span>
                    <div className={cn("w-3 h-3 rounded text-[8px] flex items-center justify-center border", adcCover > 0 ? "bg-brand-orange border-brand-orange text-white" : "border-gray-300")}>
                      {adcCover > 0 && "✓"}
                    </div>
                  </div>
                  <div className="flex justify-between items-end">
                    <select 
                      disabled={adcCover === 0}
                      value={adcCover} 
                      onChange={(e) => setAdcCover(Number(e.target.value))}
                      className="text-[11px] font-medium text-gray-900 bg-transparent border-b border-gray-300 focus:border-brand-orange outline-none pb-0.5"
                    >
                      {coverOptions.map(opt => <option key={opt} value={opt}>{(opt/100000).toFixed(2)} Lakh</option>)}
                    </select>
                    <span className="text-[10px] text-gray-500 font-semibold">@ ₹{Math.round(adcCost)} / mo</span>
                  </div>
                </div>

                {/* Accidental TPD */}
                <div className={cn("border rounded-lg p-3 relative transition-colors", atpdCover > 0 ? "border-brand-orange bg-orange-50/20" : "border-gray-200 hover:border-orange-200")}>
                  <div className="flex justify-between items-start mb-2 cursor-pointer" onClick={() => setAtpdCover(atpdCover > 0 ? 0 : 5000000)}>
                    <span className="text-[10px] font-bold text-gray-700 leading-tight pr-4">Accidental Total & Permanent Disability</span>
                    <div className={cn("w-3 h-3 rounded text-[8px] flex items-center justify-center border", atpdCover > 0 ? "bg-brand-orange border-brand-orange text-white" : "border-gray-300")}>
                      {atpdCover > 0 && "✓"}
                    </div>
                  </div>
                  <div className="flex justify-between items-end">
                    <select 
                      disabled={atpdCover === 0}
                      value={atpdCover} 
                      onChange={(e) => setAtpdCover(Number(e.target.value))}
                      className="text-[11px] font-medium text-gray-900 bg-transparent border-b border-gray-300 focus:border-brand-orange outline-none pb-0.5"
                    >
                      {coverOptions.map(opt => <option key={opt} value={opt}>{(opt/100000).toFixed(2)} Lakh</option>)}
                    </select>
                    <span className="text-[10px] text-gray-500 font-semibold">@ ₹{Math.round(atpdCost)} / mo</span>
                  </div>
                </div>

                {/* Waiver of Premium */}
                <div className={cn("border rounded-lg p-3 relative transition-colors cursor-pointer", wop ? "border-brand-orange bg-orange-50/20" : "border-gray-200 hover:border-orange-200")} onClick={() => setWop(!wop)}>
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-[10px] font-bold text-gray-700 leading-tight pr-4">Waiver of Premium(WOP)</span>
                    <div className={cn("w-3 h-3 rounded text-[8px] flex items-center justify-center border", wop ? "bg-brand-orange border-brand-orange text-white" : "border-gray-300")}>
                      {wop && "✓"}
                    </div>
                  </div>
                  <div className="flex justify-between items-end">
                    <span className="text-[11px] font-medium text-gray-900">For 15 CI & Disab.</span>
                    <span className="text-[10px] text-gray-500 font-semibold">@ ₹{wopCost} / mo</span>
                  </div>
                </div>

              </div>
            </div>

            {/* Payment Terms */}
            <div>
              <h4 className="text-sm font-bold text-gray-800 mb-3">Payment Term</h4>
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                {Object.entries(paymentTermMultipliers).map(([key, p]) => {
                  const tileMonthly = subTotalMonthly * p.mult
                  const tileOutflow = tileMonthly * 12 * p.years
                  const absoluteSavings = Math.max(0, regularOutflow - tileOutflow)
                  const percentSavings = regularOutflow > 0 ? Math.round((absoluteSavings / regularOutflow) * 100) : 0
                  
                  // Hide limited pay options if they exceed the cover term
                  if (p.years > regularYears) return null

                  return (
                    <div 
                      key={key} 
                      onClick={() => setPaymentTerm(key as any)}
                      className={cn(
                        "flex-none w-[110px] border rounded-lg p-3 cursor-pointer relative",
                        paymentTerm === key ? "border-brand-orange bg-white shadow-sm" : "border-gray-200 bg-white"
                      )}
                    >
                      {/* Checkmark icon for selected */}
                      {paymentTerm === key ? (
                        <div className="absolute top-2 right-2 w-3.5 h-3.5 rounded-full bg-brand-orange text-white flex items-center justify-center text-[8px]">
                          ✓
                        </div>
                      ) : (
                        <div className="absolute top-2 right-2 w-3.5 h-3.5 rounded-full border border-gray-300 bg-gray-50 flex items-center justify-center"></div>
                      )}
                      
                      {/* Recommended Tag */}
                      {p.isRecommended && <div className="absolute -top-2 left-0 bg-[#003366] text-white text-[8px] font-bold px-2 py-0.5 rounded-sm">Recommended</div>}
                      
                      <div className="text-[10px] font-bold text-gray-600 mb-1 mt-1">{p.label}</div>
                      <div className="text-lg font-display font-bold text-gray-900 mb-1">
                        {isSimulating ? "..." : formatExactCurrency(tileMonthly)}
                      </div>
                      <div className="text-[9px] text-gray-500 leading-tight">{p.desc}</div>
                      <div className="text-[8px] text-gray-400 mb-2">{p.subDesc}</div>
                      
                      {percentSavings > 0 && (
                        <div className="absolute bottom-0 left-0 right-0 bg-brand-orange text-white text-[8px] font-bold text-center py-0.5 rounded-b-lg">
                          Save {formatExactCurrency(absoluteSavings)} ({percentSavings}%)
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

          </div>
          
          {/* Sticky Footer */}
          <div className="bg-[#fdfaf6] border-t border-gray-200 p-4 flex justify-between items-center">
            <div className="flex flex-col">
              <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Your Premium Breakup</span>
              <div className="flex items-end gap-2 mt-1">
                <span className="text-2xl font-display font-bold text-gray-900">
                  {isSimulating ? "..." : formatExactCurrency(finalMonthly)}
                </span>
                <span className="text-xs font-semibold text-gray-600 mb-1">Monthly</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
