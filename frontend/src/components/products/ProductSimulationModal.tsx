import { useMemo } from 'react'
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
  const simulation = useMemo(() => {
    if (!product || !profile) return null

    // 1. Basic assumptions based on profile and product
    const age = profile.age || 30
    
    // Parse tenure (fallback to 15 if not a number, or handle "Up to age 99")
    let tenure = 15
    if (product.tenure.includes('age 99')) {
      tenure = 99 - age
    } else {
      const match = product.tenure.match(/\d+/)
      if (match) tenure = parseInt(match[0], 10)
    }

    const annualPremium = product.minPremium
    const totalPremiumPaid = annualPremium * tenure

    // 2. Determine Return Rate
    let returnRate = 0.06 // default guaranteed rate
    if (product.category === 'ulip' || product.returnType === 'market-linked') {
      if (profile.riskAppetite === 'aggressive') returnRate = 0.12
      else if (profile.riskAppetite === 'moderate') returnRate = 0.10
      else returnRate = 0.08
    } else if (product.category === 'participating' || product.returnType === 'bonus-based') {
      returnRate = 0.08
    }

    // 3. Calculate Projected Fund Value at Maturity (FV of Annuity)
    // Formula: P * [ ((1 + r)^t - 1) / r ] * (1 + r)
    const maturityValue = annualPremium * ((Math.pow(1 + returnRate, tenure) - 1) / returnRate) * (1 + returnRate)

    // 4. Life Cover
    const lifeCover = product.coverageUpTo > 0 ? product.coverageUpTo : annualPremium * 10

    // 5. Tax Benefits (Assumption: 30% tax bracket, max 1.5L under 80C)
    const eligible80C = Math.min(annualPremium, 150000)
    const taxSavedYearly = eligible80C * 0.30
    const totalTaxSaved = taxSavedYearly * tenure

    return {
      age,
      tenure,
      annualPremium,
      totalPremiumPaid,
      returnRate,
      maturityValue,
      lifeCover,
      taxSavedYearly,
      totalTaxSaved
    }
  }, [product, profile])

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
                
                {/* Summary Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="card bg-white border-brand-orange/20 p-4">
                    <IndianRupee size={16} className="text-brand-orange mb-2" />
                    <p className="text-[10px] font-semibold uppercase text-gray-400 tracking-wider mb-1">Total Premium</p>
                    <p className="text-lg font-display font-bold text-gray-900">{formatCurrency(simulation.totalPremiumPaid)}</p>
                    <p className="text-[10px] text-gray-500 mt-1">{formatCurrency(simulation.annualPremium)} / year</p>
                  </div>
                  
                  <div className="card bg-white border-green-500/20 p-4">
                    <TrendingUp size={16} className="text-green-500 mb-2" />
                    <p className="text-[10px] font-semibold uppercase text-gray-400 tracking-wider mb-1">Projected Maturity</p>
                    <p className="text-lg font-display font-bold text-green-600">{formatCurrency(Math.round(simulation.maturityValue))}</p>
                    <p className="text-[10px] text-gray-500 mt-1">@{Math.round(simulation.returnRate * 100)}% est. return</p>
                  </div>

                  <div className="card bg-white border-brand-navy/20 p-4">
                    <Shield size={16} className="text-brand-navy mb-2" />
                    <p className="text-[10px] font-semibold uppercase text-gray-400 tracking-wider mb-1">Life Cover</p>
                    <p className="text-lg font-display font-bold text-brand-navy">{formatCurrency(simulation.lifeCover)}</p>
                    <p className="text-[10px] text-gray-500 mt-1">From Day 1</p>
                  </div>

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
                        <span className="text-[10px] text-gray-400">Maturity</span>
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
