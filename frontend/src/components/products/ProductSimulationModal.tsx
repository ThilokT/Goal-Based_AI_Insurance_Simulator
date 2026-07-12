import { useMemo, useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, TrendingUp, Shield, IndianRupee, Landmark } from 'lucide-react'
import type { Product, UserProfile } from '../../types'
import { formatCurrency } from '../../lib/utils'

interface ProductSimulationModalProps {
  product: Product | null
  profile: UserProfile | null
  isOpen: boolean
  onClose: () => void
}

export default function ProductSimulationModal({ product, profile, isOpen, onClose }: ProductSimulationModalProps) {
  const [params, setParams] = useState({
    age: 30,
    annualPremium: 50000,
    ppt: 10,
    tenure: 15,
  })

  useEffect(() => {
    if (!product || !profile || !isOpen) return

    let defaultAge = profile.age || 30
    let defaultTenure = 15
    if (product.tenure.includes('age 99')) {
      defaultTenure = 99 - defaultAge
    } else {
      const match = product.tenure.match(/\d+/)
      if (match) defaultTenure = parseInt(match[0], 10)
    }
    let defaultPremium = product.minPremium || 50000
    let defaultPpt = defaultTenure

    if (product.id.includes('signature-assure')) {
      defaultPpt = 10
      defaultTenure = 20
      defaultPremium = 144000
    } else if (product.id.includes('gift-pro')) {
      defaultPpt = 12
      defaultTenure = 15
      defaultPremium = 1500000
    } else if (product.id.includes('protect-n-gain')) {
      defaultPpt = 12
      defaultTenure = 30
      defaultPremium = 86148
    } else if (product.id.includes('smartkid-360')) {
      defaultPpt = 12
      defaultTenure = 25
      defaultPremium = 500000
    } else if (product.id.includes('gpp-flexi') || product.category === 'annuity') {
      defaultPpt = 7
      defaultTenure = 45
      defaultPremium = 300000
    } else if (product.id.includes('iprotect') || product.category === 'protection') {
      defaultPpt = 24
      defaultTenure = 24
      defaultPremium = 6000
    } else if (product.id.includes('wish')) {
      defaultPpt = 10
      defaultTenure = 15
      defaultPremium = 10380
    }

    setParams({
      age: defaultAge,
      annualPremium: defaultPremium,
      ppt: defaultPpt,
      tenure: defaultTenure
    })
  }, [product, profile, isOpen])

  const simulation = useMemo(() => {
    if (!product || !profile) return null

    const { age, annualPremium, ppt, tenure } = params

    // 2. Determine Return Rate
    let returnRate = 0.06 // default guaranteed rate
    
    let isAnnuity = false
    let isProtection = false
    let annualPension = 0
    let healthCover = 0
    let premiumRefund = 0
    
    if (product.id.includes('signature-assure')) {
      if (profile.riskAppetite === 'aggressive') returnRate = 0.1249
      else if (profile.riskAppetite === 'moderate') returnRate = 0.08
      else returnRate = 0.04
    } else if (product.id.includes('gift-pro')) {
      returnRate = 0.05256
    } else if (product.id.includes('protect-n-gain')) {
      if (profile.riskAppetite === 'aggressive') returnRate = 0.0943
      else if (profile.riskAppetite === 'moderate') returnRate = 0.0528
      else returnRate = 0.04
    } else if (product.id.includes('smartkid-360')) {
      returnRate = 0.05719
    } else if (product.category === 'annuity' || product.id.includes('gpp-flexi')) {
      isAnnuity = true
      annualPension = (annualPremium * ppt) * 0.1333
    } else if (product.category === 'protection' || product.id.includes('iprotect')) {
      isProtection = true
      premiumRefund = product.id.includes('return') ? annualPremium * ppt : 0
    } else if (product.id.includes('wish')) {
      isProtection = true
      healthCover = 3500000
    } else if (product.category === 'ulip' || product.returnType === 'market-linked') {
      if (profile.riskAppetite === 'aggressive') returnRate = 0.12
      else if (profile.riskAppetite === 'moderate') returnRate = 0.10
      else returnRate = 0.08
    } else if (product.category === 'participating' || product.returnType === 'bonus-based') {
      returnRate = 0.08
    }

    const totalPremiumPaid = annualPremium * ppt

    // 3. Calculate Projected Fund Value at Maturity
    let maturityValue = 0

    if (product.category === 'ulip' || product.returnType === 'market-linked') {
      // Month-by-month recursive formula based on regulatory insurance deductions
      let U = 0
      const P = annualPremium / 12
      const t1 = ppt
      const t2 = tenure
      const r = returnRate
      const FMC = 0.0135
      // Signature Assure has 10x Annual Premium as life cover
      const SA = product.id.includes('signature-assure') ? annualPremium * 10 : (product.coverageUpTo > 0 ? product.coverageUpTo : annualPremium * 10)

      for (let m = 1; m <= t2 * 12; m++) {
        // Premium Allocation Charge: typically front-loaded
        const PAC = m <= 5 * 12 ? 0.05 : 0.0
        // Policy Administration Charge: flat monthly fee
        const Admin = 100
        
        // Mortality Charge: based on Sum at Risk
        const sumAtRisk = Math.max(0, SA - U)
        const mortalityRate = 0.0012 / 12 // ~1.2 per 1000 annually
        const MC = sumAtRisk * mortalityRate
        
        const currentP = m <= t1 * 12 ? P : 0
        
        // Recursive step
        U = (U + currentP * (1 - PAC) - MC - Admin) * (1 + (r - FMC) / 12)
      }
      
      maturityValue = U
    } else if (product.id.includes('gift-pro')) {
      // Algebraic Formula for ICICI Pru GIFT Pro (Lump Sum option)
      // Phase 1: Annuity Due (Accumulation Phase)
      // Phase 2: Lock-in Phase (Compounding without contributions)
      // MV = P * [ ((1 + r)^n - 1) / r ] * (1 + r)^(m - n + 1)
      const P = annualPremium
      const n = ppt
      const m = tenure
      const r = returnRate // Expected around 0.05256 for this product
      
      const fvAnnuity = P * ((Math.pow(1 + r, n) - 1) / r) * (1 + r)
      maturityValue = fvAnnuity * Math.pow(1 + r, m - n)
    } else if (product.id.includes('protect-n-gain')) {
      // Algebraic Formula for Monthly SIP over PPT, compounded over PT
      // FV(r/12, n*12, -P, 0, 1) * (1 + r/12)^((m - n)*12)
      const P = annualPremium / 12
      const n = ppt
      const m = tenure
      const r = returnRate // 0.0528 or 0.0943
      const monthlyR = r / 12
      
      const fvAnnuity = P * ((Math.pow(1 + monthlyR, n * 12) - 1) / monthlyR) * (1 + monthlyR)
      maturityValue = fvAnnuity * Math.pow(1 + monthlyR, (m - n) * 12)
    } else if (product.id.includes('smartkid-360')) {
      // Algebraic Formula for SmartKid 360 (Increasing Income Option)
      const P = annualPremium
      const SA = P * 10
      const r = returnRate
      
      const p1 = SA * 0.18
      const p2 = p1 + (SA * 0.08)
      const p3 = p2 + (SA * 0.08)
      const p4 = p3 + (SA * 0.08)
      
      let fvPremiums = 0
      for (let t = 1; t <= ppt; t++) {
        fvPremiums += P * Math.pow(1 + r, tenure - t)
      }
      
      let fvPayouts = 0
      fvPayouts += p1 * Math.pow(1 + r, tenure - 13)
      fvPayouts += p2 * Math.pow(1 + r, tenure - 14)
      fvPayouts += p3 * Math.pow(1 + r, tenure - 15)
      fvPayouts += p4 * Math.pow(1 + r, tenure - 16)
      
      const finalMaturity = fvPremiums - fvPayouts
      maturityValue = p1 + p2 + p3 + p4 + finalMaturity
    } else {
      // Standard generic formula for non-ULIPs (assuming PPT = Tenure for simplicity here)
      maturityValue = annualPremium * ((Math.pow(1 + returnRate, tenure) - 1) / returnRate) * (1 + returnRate)
    }

    // 4. Life Cover
    let lifeCover = product.coverageUpTo > 0 ? product.coverageUpTo : annualPremium * 10
    if (product.id.includes('signature-assure')) lifeCover = annualPremium * 10
    if (product.id.includes('protect-n-gain')) lifeCover = 10000000 // 1 Crore
    if (product.id.includes('iprotect') || product.category === 'protection') lifeCover = 20000000 // 2 Crore as per screenshot
    if (product.category === 'annuity' || product.id.includes('gpp-flexi')) lifeCover = annualPremium * ppt // Return of Premium

    // 5. Tax Benefits (Assumption: 30% tax bracket, max 1.5L under 80C)
    const eligible80C = Math.min(annualPremium, 150000)
    const taxSavedYearly = eligible80C * 0.30
    const totalTaxSaved = taxSavedYearly * ppt

    return {
      age,
      tenure,
      annualPremium,
      totalPremiumPaid,
      returnRate,
      maturityValue,
      lifeCover,
      taxSavedYearly,
      totalTaxSaved,
      isAnnuity,
      isProtection,
      annualPension,
      healthCover,
      premiumRefund
    }
  }, [product, profile, params])

  if (!isOpen || !product) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white rounded-2xl shadow-xl w-full max-w-3xl flex flex-col max-h-[90vh] overflow-hidden"
        >
          <div className="flex items-center justify-between p-5 border-b border-gray-100 bg-brand-cream/30">
            <div>
              <h2 className="font-display font-bold text-brand-navy text-lg leading-tight">Life Simulation</h2>
              <p className="text-xs text-gray-500 mt-1 flex items-center gap-2">
                Projected for: <span className="font-semibold text-brand-orange">{product.name}</span>
                <span className="text-[10px] uppercase tracking-wider bg-brand-orange/10 text-brand-orange px-1.5 py-0.5 rounded-full">{product.category}</span>
              </p>
            </div>
            <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 text-gray-400">
              <X size={20} />
            </button>
          </div>

          <div className="p-5 overflow-y-auto bg-gray-50/50">
            {!profile ? (
              <div className="text-center py-10 text-gray-500">
                <p>Please complete your profile to run a simulation.</p>
              </div>
            ) : simulation ? (
              <div className="space-y-6">
                
                {/* Interactive Inputs */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                  <div>
                    <label className="flex justify-between text-xs font-semibold text-brand-navy mb-2">
                      <span>Annual Premium</span>
                      <span className="text-brand-orange">{formatCurrency(params.annualPremium)}</span>
                    </label>
                    <input 
                      type="range" 
                      min={product.minPremium || 10000} 
                      max={product.category === 'protection' ? 100000 : 5000000} 
                      step={5000}
                      value={params.annualPremium}
                      onChange={e => setParams(p => ({ ...p, annualPremium: Number(e.target.value) }))}
                      className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-brand-orange"
                    />
                  </div>
                  
                  {product.category !== 'annuity' && (
                    <div>
                      <label className="flex justify-between text-xs font-semibold text-brand-navy mb-2">
                        <span>Policy Term (Years)</span>
                        <span className="text-brand-orange">{params.tenure} yrs</span>
                      </label>
                      <input 
                        type="range" 
                        min={5} 
                        max={60} 
                        step={1}
                        value={params.tenure}
                        onChange={e => setParams(p => ({ ...p, tenure: Number(e.target.value) }))}
                        className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-brand-orange"
                      />
                    </div>
                  )}
                  <div>
                    <label className="flex justify-between text-xs font-semibold text-brand-navy mb-2">
                      <span>Premium Payment Term</span>
                      <span className="text-brand-orange">{params.ppt} yrs</span>
                    </label>
                    <input 
                      type="range" 
                      min={1} 
                      max={params.tenure} 
                      step={1}
                      value={params.ppt}
                      onChange={e => setParams(p => ({ ...p, ppt: Number(e.target.value) }))}
                      className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-brand-orange"
                    />
                  </div>
                  <div>
                    <label className="flex justify-between text-xs font-semibold text-brand-navy mb-2">
                      <span>Current Age</span>
                      <span className="text-brand-orange">{params.age} yrs</span>
                    </label>
                    <input 
                      type="range" 
                      min={18} 
                      max={65} 
                      step={1}
                      value={params.age}
                      onChange={e => setParams(p => ({ ...p, age: Number(e.target.value) }))}
                      className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-brand-orange"
                    />
                  </div>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="card bg-white border-brand-orange/20 p-4">
                    <IndianRupee size={16} className="text-brand-orange mb-2" />
                    <p className="text-[10px] font-semibold uppercase text-gray-400 tracking-wider mb-1">Total Premium</p>
                    <p className="text-lg font-display font-bold text-gray-900">{formatCurrency(simulation.totalPremiumPaid)}</p>
                    <p className="text-[10px] text-gray-500 mt-1">{formatCurrency(simulation.annualPremium)} / year</p>
                  </div>
                  
                  {simulation.isAnnuity && (
                    <div className="card bg-white border-green-500/20 p-4">
                      <TrendingUp size={16} className="text-green-500 mb-2" />
                      <p className="text-[10px] font-semibold uppercase text-gray-400 tracking-wider mb-1">Annual Pension</p>
                      <p className="text-lg font-display font-bold text-green-600">{formatCurrency(Math.round(simulation.annualPension))}</p>
                      <p className="text-[10px] text-gray-500 mt-1">Lifelong Payout</p>
                    </div>
                  )}

                  {!simulation.isProtection && !simulation.isAnnuity && (
                    <div className="card bg-white border-green-500/20 p-4">
                      <TrendingUp size={16} className="text-green-500 mb-2" />
                      <p className="text-[10px] font-semibold uppercase text-gray-400 tracking-wider mb-1">Projected Maturity</p>
                      <p className="text-lg font-display font-bold text-green-600">{formatCurrency(Math.round(simulation.maturityValue))}</p>
                      <p className="text-[10px] text-gray-500 mt-1">@{Math.round(simulation.returnRate * 100)}% est. return</p>
                    </div>
                  )}

                  {simulation.isProtection && simulation.premiumRefund > 0 ? (
                    <div className="card bg-white border-brand-navy/20 p-4">
                      <Landmark size={16} className="text-brand-navy mb-2" />
                      <p className="text-[10px] font-semibold uppercase text-gray-400 tracking-wider mb-1">Premium Refund</p>
                      <p className="text-lg font-display font-bold text-brand-navy">{formatCurrency(simulation.premiumRefund)}</p>
                      <p className="text-[10px] text-gray-500 mt-1">At Maturity</p>
                    </div>
                  ) : (
                    <div className="card bg-white border-brand-navy/20 p-4">
                      <Shield size={16} className="text-brand-navy mb-2" />
                      <p className="text-[10px] font-semibold uppercase text-gray-400 tracking-wider mb-1">
                        {simulation.isAnnuity ? 'Death Benefit' : 'Life Cover'}
                      </p>
                      <p className="text-lg font-display font-bold text-brand-navy">{formatCurrency(simulation.lifeCover)}</p>
                      <p className="text-[10px] text-gray-500 mt-1">
                        {simulation.isAnnuity ? 'Return of Premium' : 'From Day 1'}
                      </p>
                    </div>
                  )}

                  <div className="card bg-white border-purple-500/20 p-4">
                    <Landmark size={16} className="text-purple-500 mb-2" />
                    <p className="text-[10px] font-semibold uppercase text-gray-400 tracking-wider mb-1">Tax Saved</p>
                    <p className="text-lg font-display font-bold text-purple-600">{formatCurrency(simulation.totalTaxSaved)}</p>
                    <p className="text-[10px] text-gray-500 mt-1">Over {simulation.tenure} years</p>
                  </div>
                </div>

                {/* Timeline Visualization */}
                <div className="card bg-white">
                  <h3 className="font-display font-semibold text-gray-900 text-sm mb-4">Your Projected Journey</h3>
                  <div className="relative pt-6 pb-2">
                    {/* Progress Bar */}
                    <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-brand-orange to-green-400 w-full" />
                    </div>

                    {/* Timeline Points */}
                    <div className="relative flex justify-between">
                      <div className="flex flex-col items-center">
                        <div className="w-4 h-4 rounded-full bg-brand-orange ring-4 ring-white z-10" />
                        <span className="text-[10px] font-bold text-brand-navy mt-2">Age {simulation.age}</span>
                        <span className="text-[10px] text-gray-400">Policy Starts</span>
                      </div>
                      
                      <div className="flex flex-col items-center">
                        <div className="w-4 h-4 rounded-full bg-brand-navy ring-4 ring-white z-10" />
                        <span className="text-[10px] font-bold text-brand-navy mt-2">Age {simulation.age + Math.floor(simulation.tenure / 2)}</span>
                        <span className="text-[10px] text-gray-400">Mid-Term</span>
                      </div>

                      <div className="flex flex-col items-center">
                        <div className="w-4 h-4 rounded-full bg-green-500 ring-4 ring-white z-10" />
                        <span className="text-[10px] font-bold text-brand-navy mt-2">Age {simulation.age + simulation.tenure}</span>
                        <span className="text-[10px] text-gray-400">
                          {simulation.isAnnuity ? 'Lifelong Payouts' : 'Maturity'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Caveat */}
                <p className="text-[10px] text-gray-400 text-center px-4">
                  *The calculations are based on standard financial assumptions derived from your profile ({profile.riskAppetite} risk appetite). Actual returns may vary depending on market performance and specific product brochures. Tax benefits are subject to changes in tax laws.
                </p>

              </div>
            ) : null}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
