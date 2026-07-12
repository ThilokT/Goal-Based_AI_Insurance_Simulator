import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useAppStore } from '../../store'
import { formatCurrency } from '../../lib/utils'
import { api } from '../../lib/apiClient'
import type { BackendProductSimulateRequest, BackendProductSimulateResponse } from '../../types/api'
import { runProductSimulation } from '../../mocks/simulation'
import SimulationProjectionChart from './SimulationProjectionChart'
import { TrendingUp, RotateCcw, AlertTriangle } from 'lucide-react'

export default function ProductSimulationView() {
  const { profile, productWhatIfParams, setProductWhatIfParams, setYearlyProjections, isOffline, isSimulating, setIsSimulating } = useAppStore()
  
  const [productData, setProductData] = useState<BackendProductSimulateResponse | null>(null)

  const runSimulation = async () => {
    if (!profile) return
    setIsSimulating(true)
    
    try {
      if (isOffline) {
        throw new Error('Offline mode')
      }
      
      const req: BackendProductSimulateRequest = {
        monthly_premium: productWhatIfParams.monthlyPremium,
        tenure_years: productWhatIfParams.tenureYears,
        user_age: profile.age || 30,
        risk_appetite: profile.riskAppetite || 'moderate'
      }
      
      const res = await api.post<BackendProductSimulateResponse>('/api/simulate/product', req)
      
      // Update store for the chart to render
      setYearlyProjections(res.yearly_projections.map(p => ({
        year: p.year,
        age: p.age,
        totalInvested: p.total_invested,
        projectedCorpus: p.projected_corpus
      })))
      
      setProductData(res)
    } catch {
      // Fallback to local
      console.warn('Using local product simulation fallback')
      const localRes = runProductSimulation(profile, productWhatIfParams)
      
      setYearlyProjections(localRes.yearly_projections.map(p => ({
        year: p.year,
        age: p.age,
        totalInvested: p.total_invested,
        projectedCorpus: p.projected_corpus
      })))
      
      setProductData(localRes)
    } finally {
      setIsSimulating(false)
    }
  }

  // Run whenever params change
  useEffect(() => {
    // Debounce to avoid spamming the API while dragging sliders
    const timeoutId = setTimeout(() => {
      runSimulation()
    }, 300)
    return () => clearTimeout(timeoutId)
  }, [productWhatIfParams, profile])

  if (!profile) return null

  return (
    <div className="grid lg:grid-cols-4 gap-6">
      {/* Left Panel: Controls */}
      <div className="lg:col-span-1 space-y-6">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="card bg-white border border-gray-100 shadow-sm sticky top-6"
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2 text-brand-navy">
              <TrendingUp size={18} />
              <h2 className="font-display font-bold text-lg">Product Engine</h2>
            </div>
            <button 
              onClick={() => setProductWhatIfParams({ monthlyPremium: 10000, tenureYears: 20 })}
              className="p-1.5 text-gray-400 hover:text-brand-orange hover:bg-orange-50 rounded-lg transition-colors"
              title="Reset defaults"
            >
              <RotateCcw size={14} />
            </button>
          </div>

          <div className="space-y-6">
            {/* Monthly Premium */}
            <div>
              <div className="flex justify-between mb-2">
                <label className="text-sm font-medium text-gray-700">Monthly Premium</label>
                <span className="text-sm font-bold text-brand-navy">{formatCurrency(productWhatIfParams.monthlyPremium)}</span>
              </div>
              <input 
                type="range" 
                min="2000" 
                max="100000" 
                step="1000"
                value={productWhatIfParams.monthlyPremium}
                onChange={(e) => setProductWhatIfParams({ monthlyPremium: Number(e.target.value) })}
                className="w-full accent-brand-orange h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>₹2K</span>
                <span>₹1L</span>
              </div>
            </div>

            {/* Tenure */}
            <div>
              <div className="flex justify-between mb-2">
                <label className="text-sm font-medium text-gray-700">Investment Tenure</label>
                <span className="text-sm font-bold text-brand-navy">{productWhatIfParams.tenureYears} Years</span>
              </div>
              <input 
                type="range" 
                min="5" 
                max="40" 
                step="1"
                value={productWhatIfParams.tenureYears}
                onChange={(e) => setProductWhatIfParams({ tenureYears: Number(e.target.value) })}
                className="w-full accent-brand-orange h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>5 Yrs</span>
                <span>40 Yrs</span>
              </div>
            </div>
            
          </div>
        </motion.div>
      </div>

      {/* Right Panel: Results & Chart */}
      <div className="lg:col-span-3 space-y-6 lg:overflow-y-auto pr-1 pb-10 relative">
        
        {/* Loading Indicator */}
        {isSimulating && (
          <div className="absolute top-0 inset-x-0 h-1 bg-orange-100 overflow-hidden rounded-full z-10">
            <motion.div 
              className="h-full bg-brand-orange w-1/3"
              animate={{ x: ["-100%", "300%"] }}
              transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
            />
          </div>
        )}
        
        {/* Recommended Product Banner */}
        {productData && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-r from-brand-navy to-[#0a4785] text-white p-6 rounded-2xl shadow-lg border border-blue-800"
          >
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <div>
                <p className="text-blue-200 text-xs font-bold uppercase tracking-wider mb-1">AI-Matched Plan For You</p>
                <h3 className="text-2xl font-display font-bold">{productData.product_name}</h3>
                <p className="text-sm text-blue-100 mt-1">Category: {productData.product_category}</p>
              </div>
              <div className="bg-white/10 px-6 py-4 rounded-xl text-center backdrop-blur-sm border border-white/10">
                <p className="text-sm text-blue-100 mb-1">Projected Corpus</p>
                <p className="text-3xl font-display font-bold text-amber-300">
                  {formatCurrency(productData.projected_corpus)}
                </p>
              </div>
            </div>
            
            {productData.product_category.toLowerCase() === 'ulip' && productData.tenure_years >= 10 && (
              <div className="mt-4 flex items-start gap-2 bg-white/5 p-3 rounded-lg border border-white/5">
                <AlertTriangle className="text-amber-300 shrink-0 mt-0.5" size={16} />
                <p className="text-xs text-blue-50">
                  <strong>Wealth Boosters Applied:</strong> This ULIP includes Loyalty Additions and Wealth Boosters automatically added to your fund value at the end of every 5-year block starting year 10.
                </p>
              </div>
            )}
          </motion.div>
        )}

        <SimulationProjectionChart />
        
      </div>
    </div>
  )
}
