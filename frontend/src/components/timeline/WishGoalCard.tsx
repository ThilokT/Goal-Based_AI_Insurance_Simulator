import { useState } from 'react'
import { motion } from 'framer-motion'
import { cn, formatCurrency } from '../../lib/utils'
import type { SimulationResult, LifeGoal, UserProfile, WhatIfParams } from '../../types'

interface WishGoalCardProps {
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

export default function WishGoalCard({
  result,
  goal,
  profile,
  whatIfParams,
  event,
  isEven,
  catColor,
  isSimulating,
  updateGoalTargetAmount
}: WishGoalCardProps) {
  // Use what-if target or default goal corpus
  const targetCover = whatIfParams.goalTargetAmounts?.[goal.id] ?? goal.corpusNeeded
  
  // UI States
  const [paymentTerm, setPaymentTerm] = useState<8 | 10 | 15>(10)
  const [maternityEnabled, setMaternityEnabled] = useState(false)
  const [covTerm8, setCovTerm8] = useState(8)
  const [covTerm15, setCovTerm15] = useState(30)
  const [covTerm10, setCovTerm10] = useState(20)
  const [showCIModal, setShowCIModal] = useState(false)
  const [showSurgicalModal, setShowSurgicalModal] = useState(false)
  const [showMaternityModal, setShowMaternityModal] = useState(false)

  // Math models mirroring ICICI screenshot
  // Base rates for 20L cover:
  const baseRates = {
    8: 517, // For 8 yr cov
    15: 1389, // For 30 yr cov (2084 for 30L)
    10: 1099 // For 20 yr cov
  }

  // Scale relative to 20L
  const scale = Math.max(0.1, targetCover / 20_00_000)
  
  // Calculate premium based on coverage term
  const calcPremium = (payTerm: 8|10|15, selectedCovTerm: number) => {
    const base = baseRates[payTerm]
    const defaultCovTerm = payTerm === 8 ? 8 : (payTerm === 15 ? 30 : 20)
    // Scale up/down based on the coverage term vs the default term
    const covMultiplier = Math.pow(selectedCovTerm / defaultCovTerm, 0.85)
    return Math.round(base * scale * covMultiplier)
  }

  const premium8 = calcPremium(8, covTerm8)
  const premium15 = calcPremium(15, covTerm15)
  const premium10 = calcPremium(10, covTerm10)

  // Active base premium depends on selection
  const activeBasePremium = paymentTerm === 8 ? premium8 : (paymentTerm === 15 ? premium15 : premium10)
  
  // Addons
  const maternityCostScaled = Math.round(1345 * scale)
  const maternityCost = maternityEnabled ? maternityCostScaled : 0
  const finalPremium = activeBasePremium + maternityCost

  // Maternity Cover Amount dynamically scaled
  const maternityCoverLakhs = ((5_00_000 * scale) / 100000).toFixed(2)

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
        <div className="w-full max-w-xl bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden relative">
          
          <div className="p-5">
            {/* Header */}
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-[10px] font-bold text-gray-400 tracking-wider uppercase mb-1">
                  Age {event.age} • Health Protection
                </p>
                <h3 className="font-display font-bold text-gray-900 text-xl leading-tight">ICICI Pru Wish</h3>
                <p className="text-sm text-gray-500 mt-1">Here is a customised plan for you</p>
              </div>
              <div className="w-12 h-12 rounded-full flex items-center justify-center text-2xl shrink-0 bg-red-50 text-brand-orange border border-red-100 shadow-sm">
                {goal.icon}
              </div>
            </div>

            {/* Red Bordered Box (Vital + Surgical + Addon) */}
            <div className="border-2 border-red-800 rounded-xl overflow-hidden mb-6 relative bg-[#fdfaf5]">
              {/* Need higher health cover badge */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 bg-red-800 text-white text-[10px] font-bold px-3 py-1 rounded-b-lg flex items-center gap-1 z-10">
                <span className="w-3 h-3 bg-white rounded-full text-red-800 flex items-center justify-center text-[8px]">!</span>
                Need higher health cover? <span className="underline cursor-pointer">Check</span>
              </div>
              
              <div className="p-4 pt-8 grid grid-cols-[1fr_auto_1fr] items-center gap-4 border-b border-red-800/20">
                {/* Vital Care */}
                <div>
                  <h4 className="text-xs font-bold text-gray-800 mb-1">Vital Care Cover</h4>
                  <p className="text-[10px] text-gray-500 mb-2">
                    Covers critical illnesses. <span className="text-brand-orange cursor-pointer hover:underline" onClick={() => setShowCIModal(true)}>View List</span>
                  </p>
                  
                  <div className="bg-white border border-gray-300 rounded-lg p-2 flex justify-between items-center relative">
                     <span className="font-bold text-gray-900">₹{(targetCover / 100000).toFixed(2)} Lakh</span>
                     <span className="text-gray-400 text-sm">📝</span>
                     {/* Overlay select for interaction */}
                     <select 
                      value={targetCover}
                      disabled={isSimulating}
                      onChange={(e) => updateGoalTargetAmount(goal.id, Number(e.target.value))}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    >
                      <option value={1000000}>10.00 Lakh</option>
                      <option value={2000000}>20.00 Lakh</option>
                      <option value={3000000}>30.00 Lakh</option>
                      <option value={4000000}>40.00 Lakh</option>
                      <option value={5000000}>50.00 Lakh</option>
                    </select>
                  </div>
                  <p className="text-[9px] text-gray-400 mt-1 italic">{(targetCover / 100000)} Lakh Only</p>
                </div>
                
                {/* Plus Icon */}
                <div className="w-6 h-6 rounded-full bg-brand-orange text-white flex items-center justify-center font-bold text-lg shadow-sm">
                  +
                </div>
                
                {/* Surgical Care */}
                <div>
                  <h4 className="text-xs font-bold text-gray-800 mb-1">Surgical Care Cover <span className="text-gray-500 font-normal">(Additional)</span></h4>
                  <p className="text-[10px] text-gray-500 mb-2">
                    Covers surgical procedures <span className="text-brand-orange cursor-pointer hover:underline" onClick={() => setShowSurgicalModal(true)}>View List</span>
                  </p>
                  <div className="bg-gray-100 border border-gray-200 rounded-lg p-2 text-center">
                     <span className="font-bold text-gray-900">₹{((targetCover / 2) / 100000).toFixed(2)} Lakh</span>
                  </div>
                </div>
              </div>
              
              {/* Add-on Box */}
              <div className="p-4 bg-[#f8f3e9]">
                 <div className="flex justify-between items-start">
                   <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="bg-brand-orange text-white text-[10px] font-bold px-2 py-0.5 rounded-full">Add-On</span>
                        <h4 className="text-xs font-bold text-gray-800">Maternity care cover</h4>
                      </div>
                      <p className="text-[10px] text-gray-500 mb-1">
                        Covers Pregnancy & New-born Congenital illnesses. <span className="text-brand-orange cursor-pointer hover:underline" onClick={() => setShowMaternityModal(true)}>View List</span>
                      </p>
                      <p className="text-[14px] font-bold text-gray-800">₹{maternityCoverLakhs} Lakh for 20 years</p>
                      <p className="text-[12px] text-[#e46434] mt-0.5">@ ₹{maternityCostScaled} monthly</p>
                   </div>
                   <div 
                    className={cn("w-5 h-5 rounded border cursor-pointer flex items-center justify-center transition-colors", maternityEnabled ? "bg-brand-orange border-brand-orange" : "bg-white border-gray-300")}
                    onClick={() => setMaternityEnabled(!maternityEnabled)}
                   >
                     {maternityEnabled && <span className="text-white text-xs">✓</span>}
                   </div>
                 </div>
              </div>
            </div>

            {/* Premium Payment Term Selection */}
            <div className="mb-6">
              <h4 className="text-xs font-bold text-gray-700 mb-3">Choose Premium Payment Term</h4>
              <div className="grid grid-cols-3 gap-2">
                
                {/* 8 Yrs */}
                <div 
                  onClick={() => setPaymentTerm(8)}
                  className={cn(
                    "border rounded-xl p-3 cursor-pointer transition-all flex flex-col justify-between h-[110px] relative",
                    paymentTerm === 8 ? "border-brand-orange ring-1 ring-brand-orange bg-orange-50/10 shadow-sm" : "border-gray-200 hover:border-gray-300 bg-white"
                  )}
                >
                  {paymentTerm === 8 && <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-brand-orange text-white flex items-center justify-center text-[10px]">✓</div>}
                  {paymentTerm !== 8 && <div className="absolute top-2 right-2 w-4 h-4 rounded-full border border-gray-200 bg-gray-50" />}
                  
                  <div>
                    <h5 className="text-[11px] font-bold text-gray-800">Regular Pay</h5>
                    <p className="text-[9px] text-gray-500">Pay for 8 Years</p>
                  </div>
                  <div className="font-display font-bold text-brand-navy text-lg">₹{premium8}</div>
                  <div>
                     <p className="text-[9px] text-gray-500">Coverage term</p>
                     <div className="relative inline-block">
                       <span className="text-[11px] font-bold text-gray-800">{covTerm8} years ▼</span>
                       <select 
                         value={covTerm8} 
                         onChange={(e) => setCovTerm8(Number(e.target.value))}
                         onClick={(e) => e.stopPropagation()}
                         className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                       >
                         {[8,10,15,20,25,30].map(y => <option key={y} value={y}>{y} years</option>)}
                       </select>
                     </div>
                  </div>
                </div>

                {/* 15 Yrs */}
                <div 
                  onClick={() => setPaymentTerm(15)}
                  className={cn(
                    "border rounded-xl p-3 cursor-pointer transition-all flex flex-col justify-between h-[110px] relative",
                    paymentTerm === 15 ? "border-brand-orange ring-1 ring-brand-orange bg-orange-50/10 shadow-sm" : "border-gray-200 hover:border-gray-300 bg-white"
                  )}
                >
                  {paymentTerm === 15 && <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-brand-orange text-white flex items-center justify-center text-[10px]">✓</div>}
                  {paymentTerm !== 15 && <div className="absolute top-2 right-2 w-4 h-4 rounded-full border border-gray-200 bg-gray-50" />}
                  
                  <div>
                    <h5 className="text-[11px] font-bold text-gray-800">Limited Pay</h5>
                    <p className="text-[9px] text-gray-500">Pay for 15 Years</p>
                  </div>
                  <div className="font-display font-bold text-brand-navy text-lg">₹{premium15}</div>
                  <div>
                     <p className="text-[9px] text-gray-500">Coverage term</p>
                     <div className="relative inline-block">
                       <span className="text-[11px] font-bold text-gray-800">{covTerm15} years ▼</span>
                       <select 
                         value={covTerm15} 
                         onChange={(e) => setCovTerm15(Number(e.target.value))}
                         onClick={(e) => e.stopPropagation()}
                         className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                       >
                         {[15,20,25,30].map(y => <option key={y} value={y}>{y} years</option>)}
                       </select>
                     </div>
                  </div>
                </div>

                {/* 10 Yrs */}
                <div 
                  onClick={() => setPaymentTerm(10)}
                  className={cn(
                    "border rounded-xl p-3 cursor-pointer transition-all flex flex-col justify-between h-[110px] relative",
                    paymentTerm === 10 ? "border-brand-orange ring-1 ring-brand-orange bg-orange-50/10 shadow-sm" : "border-gray-200 hover:border-gray-300 bg-white"
                  )}
                >
                  {paymentTerm === 10 && <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-brand-orange text-white flex items-center justify-center text-[10px]">✓</div>}
                  {paymentTerm !== 10 && <div className="absolute top-2 right-2 w-4 h-4 rounded-full border border-gray-200 bg-gray-50" />}
                  
                  <div>
                    <h5 className="text-[11px] font-bold text-gray-800">Limited Pay</h5>
                    <p className="text-[9px] text-gray-500">Pay for 10 Years</p>
                  </div>
                  <div className="font-display font-bold text-brand-navy text-lg">₹{premium10}</div>
                  <div>
                     <p className="text-[9px] text-gray-500">Coverage term</p>
                     <div className="relative inline-block">
                       <span className="text-[11px] font-bold text-gray-800">{covTerm10} years ▼</span>
                       <select 
                         value={covTerm10} 
                         onChange={(e) => setCovTerm10(Number(e.target.value))}
                         onClick={(e) => e.stopPropagation()}
                         className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                       >
                         {[15,20,25,30].map(y => <option key={y} value={y}>{y} years</option>)}
                       </select>
                     </div>
                  </div>
                </div>

              </div>
            </div>
            
            {/* EBI Checkbox */}
            <div className="flex gap-2 items-start mb-6">
              <input type="checkbox" defaultChecked className="mt-1 accent-brand-orange" />
              <p className="text-[9px] text-gray-500 leading-tight">
                By selecting this checkbox, I agree and confirm that I have read and understood the Electronic Benefit Illustration (EBI) and wish to proceed to purchase the policy.
              </p>
              <div className="shrink-0 flex flex-col items-center ml-2">
                 <span className="text-red-500 text-xs">📄</span>
                 <span className="text-[8px] text-brand-orange font-bold whitespace-nowrap">Download EBI</span>
              </div>
            </div>

          </div>
          
          {/* Bottom Sticky Bar */}
          <div className="border-t border-gray-200 p-4 bg-gray-50 flex items-center justify-between">
            <div>
              <p className="text-[11px] text-gray-500 font-bold mb-0.5">Your Premium</p>
              <div className="flex items-end gap-2">
                 <p className="text-2xl font-display font-bold text-brand-orange leading-none">
                    ₹{finalPremium.toLocaleString('en-IN')}
                 </p>
                 <span className="bg-red-800 text-white text-[8px] font-bold px-1.5 py-0.5 rounded">0% GST</span>
              </div>
              <p className="text-[9px] text-brand-orange underline mt-1 cursor-pointer">(View Break Up)</p>
            </div>
            
            <div className="flex items-center gap-3">
              <button className="bg-gradient-to-r from-orange-500 to-brand-orange text-white font-bold text-sm px-6 py-2 rounded shadow-md hover:shadow-lg transition-all">
                Proceed
              </button>
            </div>
          </div>

        </div>
      </div>
      
      {/* CI Modal */}
      {showCIModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4" onClick={() => setShowCIModal(false)}>
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-5 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white z-10">
              <h2 className="text-base font-bold text-gray-900">Critical Illness (CI) Covered</h2>
              <button onClick={() => setShowCIModal(false)} className="w-6 h-6 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 text-xs font-bold">
                ✕
              </button>
            </div>
            
            <div className="p-0">
              {/* Row 1 */}
              <div className="flex flex-col sm:flex-row border-b border-gray-200">
                <div className="sm:w-[60%] p-5 bg-white border-b sm:border-b-0 sm:border-r border-gray-200">
                  <ul className="list-disc pl-4 text-[11px] text-gray-600 space-y-1.5">
                    <li>Carcinoma in situ of the Breast</li>
                    <li>Carcinoma in situ of the Cervix Uteri</li>
                    <li>Osteoporotic fractures of the hip and vertebra treated with surgery</li>
                  </ul>
                </div>
                <div className="sm:w-[40%] p-5 bg-gray-50 flex flex-col justify-center">
                  <p className="text-[11px] font-bold text-gray-800 mb-1">Lower of:</p>
                  <p className="text-[11px] text-gray-600 font-medium">50% of Vital Care Sum Assured</p>
                  <p className="text-[11px] text-gray-600 font-medium mt-1">100% of Vital Care Sum Assured less any claims already paid for Minor Conditions</p>
                </div>
              </div>
              
              {/* Row 2 */}
              <div className="flex flex-col sm:flex-row border-b border-gray-200">
                <div className="sm:w-[60%] p-5 bg-white border-b sm:border-b-0 sm:border-r border-gray-200">
                  <ul className="list-disc pl-4 text-[11px] text-gray-600 space-y-1.5">
                    <li>Urinary Incontinence requiring Surgical Repair</li>
                    <li>Uterine Prolapse</li>
                    <li>Pelvic floor dysfunction treated with Hysterectomy</li>
                    <li>Thyroid disorders causing Thyroid Storm treated in ICU</li>
                  </ul>
                </div>
                <div className="sm:w-[40%] p-5 bg-gray-50 flex flex-col justify-center">
                  <p className="text-[11px] font-bold text-gray-800 mb-1">Lower of:</p>
                  <p className="text-[11px] text-gray-600 font-medium">10% of Vital Care Sum Assured</p>
                  <p className="text-[11px] text-gray-600 font-medium mt-1">100% of Vital Care Sum Assured less any claims already paid for Minor Conditions</p>
                </div>
              </div>
              
              {/* Row 3 */}
              <div className="flex flex-col sm:flex-row">
                <div className="sm:w-[60%] p-5 bg-white border-b sm:border-b-0 sm:border-r border-gray-200">
                  <ul className="list-disc pl-4 text-[11px] text-gray-600 space-y-1.5">
                    <li>Systemic Lupus Erythematosus with Lupus Nephritis</li>
                    <li>Rheumatoid Arthritis</li>
                    <li>Major cancers (of Breast, Cervix Uteri, Uterus, Fallopian tube, Ovary, Vagina, Vulva)</li>
                    <li>Stroke resulting in permanent symptoms</li>
                    <li>Myocardial Infarction (First Heart Attack of specific severity)</li>
                  </ul>
                </div>
                <div className="sm:w-[40%] p-5 bg-gray-50 flex flex-col justify-center">
                  <p className="text-[11px] font-bold text-gray-800 mb-1">Lower of:</p>
                  <p className="text-[11px] text-gray-600 font-medium">100% of Vital Care Sum Assured</p>
                  <p className="text-[11px] text-gray-600 font-medium mt-1">less any Minor Critical Illness claims already paid</p>
                </div>
              </div>
            </div>
            
            <div className="p-4 border-t border-gray-100 flex justify-center bg-white sticky bottom-0 z-10">
              <button onClick={() => setShowCIModal(false)} className="bg-[#e46434] text-white font-bold text-sm px-12 py-2 rounded shadow hover:shadow-md transition-all">
                Okay
              </button>
            </div>
          </motion.div>
        </div>
      )}
      
      {/* Surgical Modal */}
      {showSurgicalModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4" onClick={() => setShowSurgicalModal(false)}>
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-5 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white z-10">
              <h2 className="text-base font-bold text-gray-900">Surgical procedures covered</h2>
              <button onClick={() => setShowSurgicalModal(false)} className="w-6 h-6 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 text-xs font-bold">
                ✕
              </button>
            </div>
            
            <div className="p-0">
              {/* Row 1 */}
              <div className="flex flex-col sm:flex-row border-b border-gray-200">
                <div className="sm:w-[60%] p-5 bg-white border-b sm:border-b-0 sm:border-r border-gray-200">
                  <ul className="list-disc pl-4 text-[11px] text-gray-600 space-y-1.5">
                    <li>Breast Reconstructive Surgery following a Mastectomy</li>
                    <li>Skin grafting due to major burns</li>
                    <li>Radical Vulvectomy required due to a malignant / Invasive condition</li>
                    <li>Radical hysterectomy required due to a malignant / Invasive condition</li>
                    <li>Total Pelvic Exenteration required due to a malignant / Invasive condition</li>
                  </ul>
                </div>
                <div className="sm:w-[40%] p-5 bg-white flex flex-col justify-center">
                  <p className="text-[11px] text-gray-800 font-bold">100% of Surgical Care Sum Assured</p>
                </div>
              </div>
              
              {/* Row 2 */}
              <div className="flex flex-col sm:flex-row">
                <div className="sm:w-[60%] p-5 bg-white border-b sm:border-b-0 sm:border-r border-gray-200">
                  <ul className="list-disc pl-4 text-[11px] text-gray-600 space-y-1.5">
                    <li>Hysterectomy required due to a malignant / Invasive condition</li>
                    <li>Mastectomy required due to a malignant / Invasive condition</li>
                    <li>Complicated repair of a Vaginal Fistula</li>
                    <li>Bilateral or Unilateral Breast Lumpectomy due to a malignant condition or carcinoma in situ</li>
                  </ul>
                </div>
                <div className="sm:w-[40%] p-5 bg-white flex flex-col justify-center">
                  <p className="text-[11px] text-gray-800 font-bold">40% of Surgical Care Sum Assured</p>
                </div>
              </div>
            </div>
            
            <div className="p-4 border-t border-gray-100 flex justify-center bg-white sticky bottom-0 z-10">
              <button onClick={() => setShowSurgicalModal(false)} className="bg-[#e46434] text-white font-bold text-sm px-12 py-2 rounded shadow hover:shadow-md transition-all">
                Okay
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Maternity Modal */}
      {showMaternityModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4" onClick={() => setShowMaternityModal(false)}>
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-5 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white z-10">
              <h2 className="text-base font-bold text-gray-900">Maternity Care List</h2>
              <button onClick={() => setShowMaternityModal(false)} className="w-6 h-6 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 text-xs font-bold">
                ✕
              </button>
            </div>
            
            <div className="p-0">
              {/* Row 1 */}
              <div className="flex flex-col sm:flex-row border-b border-gray-200">
                <div className="sm:w-[60%] p-5 bg-white border-b sm:border-b-0 sm:border-r border-gray-200">
                  <h4 className="text-[12px] font-bold text-gray-800 mb-2">Pregnancy complications</h4>
                  <ul className="list-disc pl-4 text-[11px] text-gray-600 space-y-1.5">
                    <li>Uterine rupture</li>
                    <li>Ectopic pregnancy</li>
                    <li>Eclampsia</li>
                    <li>Molar pregnancy</li>
                    <li>Disseminated Intravascular Coagulation</li>
                    <li>Postpartum Haemorrhage requiring Hysterectomy</li>
                    <li>Placenta increta</li>
                    <li>Placenta Percreta</li>
                    <li>HELLP syndrome</li>
                    <li>Choriocarcinoma</li>
                  </ul>
                </div>
                <div className="sm:w-[40%] p-5 bg-white flex flex-col justify-center">
                  <p className="text-[11px] text-gray-800 font-bold">100% of Maternity Care Sum Assured</p>
                </div>
              </div>
              
              {/* Row 2 */}
              <div className="flex flex-col sm:flex-row">
                <div className="sm:w-[60%] p-5 bg-white border-b sm:border-b-0 sm:border-r border-gray-200">
                  <h4 className="text-[12px] font-bold text-gray-800 mb-2">Congenital illness or Newborn Complications</h4>
                  <ul className="list-disc pl-4 text-[11px] text-gray-600 space-y-1.5">
                    <li>Down's syndrome</li>
                    <li>Spina bifida</li>
                    <li>Oesophageal atresia and tracheoesophageal fistula</li>
                    <li>Anal atresia</li>
                    <li>Cleft palate</li>
                    <li>Club feet</li>
                    <li>Tetralogy of fallot</li>
                    <li>Transposition of great vessels</li>
                    <li>Patent ductus arteriosus</li>
                    <li>Total anomalous pulmonary venous return (TAPVR)</li>
                    <li>Tricuspid atresia</li>
                    <li>Atrial Septal Defect</li>
                    <li>Ventricular Septal Defect</li>
                  </ul>
                </div>
                <div className="sm:w-[40%] p-5 bg-white flex flex-col justify-center">
                  <p className="text-[11px] text-gray-800 font-bold">100% of Maternity Care Sum Assured</p>
                </div>
              </div>
            </div>
            
            <div className="p-4 border-t border-gray-100 flex justify-center bg-white sticky bottom-0 z-10">
              <button onClick={() => setShowMaternityModal(false)} className="bg-[#e46434] text-white font-bold text-sm px-12 py-2 rounded shadow hover:shadow-md transition-all">
                Okay
              </button>
            </div>
          </motion.div>
        </div>
      )}

    </motion.div>
  )
}
