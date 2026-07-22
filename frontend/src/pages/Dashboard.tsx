import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowRight, MessageSquare, TrendingUp, Package, Sliders, Target, IndianRupee, Users, Shield, Loader2 } from 'lucide-react'
import { useAppStore } from '../store'
import { formatCurrency } from '../lib/utils'
import { api } from '../lib/apiClient'
import type { BackendProductListResponse } from '../types/api'
import { MOCK_PRODUCTS } from '../mocks/products'

const QUICK_ACTIONS = [
  { id: 'chat',     label: 'Talk to AI Advisor',   icon: MessageSquare, desc: 'Share your goals in a conversation', color: 'gradient-navy' },
  { id: 'timeline', label: 'Life Journey Timeline', icon: TrendingUp,    desc: 'See your milestones visualised',    color: 'gradient-orange' },
  { id: 'simulate', label: 'Run What-If Scenarios', icon: Sliders,       desc: 'Adjust retirement age, inflation', color: 'bg-purple-600' },
  { id: 'products', label: 'Explore Products',      icon: Package,       desc: 'Products across 5 categories',     color: 'bg-green-600' },
]

export default function Dashboard() {
  const { user, profile, goals, simulationResults, setActiveTab, productCount, setProductCount, setIsProfileModalOpen, isProfileLoading } = useAppStore()
  const [isProductsLoading, setIsProductsLoading] = useState(true)

  // Fetch live product count on mount
  useEffect(() => {
    async function fetchCount() {
      setIsProductsLoading(true)
      try {
        const res = await api.get<BackendProductListResponse>('/api/products')
        setProductCount(res.total || res.products.length)
      } catch {
        // Fallback to mock data count
        if (productCount === 0) setProductCount(MOCK_PRODUCTS.length)
      } finally {
        setIsProductsLoading(false)
      }
    }
    if (productCount === 0) fetchCount()
    else setIsProductsLoading(false)
  }, [])

  const totalGap = simulationResults.reduce((s, r) => s + r.gap, 0)
  const totalCovered = simulationResults.reduce((s, r) => s + r.coveredAmount, 0)
  const totalCorpus = simulationResults.reduce((s, r) => s + r.corpusNeeded, 0)
  const overallPct = totalCorpus > 0 ? Math.round((totalCovered / totalCorpus) * 100) : 0

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="card gradient-hero text-white">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-white/60 text-sm mb-1">Welcome back</p>
            <h1 className="text-2xl font-display font-bold mb-1">{user?.name ?? 'Explorer'}</h1>
            {isProfileLoading ? (
               <div className="flex items-center gap-2 mt-1">
                 <Loader2 size={12} className="animate-spin text-white/70" />
                 <span className="text-white/70 text-sm">Loading profile...</span>
               </div>
            ) : profile ? (
              <p className="text-white/70 text-sm capitalize">
                Age {profile.age || '—'} · {profile.city || 'Add City'} · {profile.riskAppetite ? profile.riskAppetite + ' risk' : 'Add Risk'} · {goals.length} goal{goals.length !== 1 ? 's' : ''} planned
              </p>
            ) : (
              <p className="text-white/70 text-sm">Start by chatting with your AI advisor</p>
            )}
          </div>

        </div>


      </motion.div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {QUICK_ACTIONS.map(({ id, label, icon: Icon, desc, color }, i) => (
          <motion.button
            key={id}
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + i * 0.07 }}
            onClick={() => setActiveTab(id)}
            className="card text-left group hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-200"
          >
            <div className={`w-10 h-10 ${color} rounded-xl flex items-center justify-center mb-3 shadow-sm group-hover:scale-110 transition-transform`}>
              <Icon size={18} className="text-white" />
            </div>
            <p className="text-sm font-semibold text-gray-900 leading-tight mb-1">{label}</p>
            <p className="text-[11px] text-gray-400">{desc}</p>
            <div className="flex items-center gap-1 mt-3 text-brand-orange text-[11px] font-medium opacity-0 group-hover:opacity-100 transition-opacity">
              Open <ArrowRight size={11} />
            </div>
          </motion.button>
        ))}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { icon: Target, label: 'Goals mapped', value: goals.length, sub: 'life milestones', color: 'text-brand-orange', isLoading: isProfileLoading },
          { icon: IndianRupee, label: 'Monthly income', value: profile?.income ? `₹${(profile.income / 1000).toFixed(0)}K` : 'Add Income', sub: 'household income', color: 'text-brand-navy', isLoading: isProfileLoading },
          { icon: Users, label: 'Family size', value: profile?.familySize ?? 'Add Dependents', sub: 'dependants', color: 'text-purple-600', isLoading: isProfileLoading },
          { icon: Shield, label: 'Products matched', value: productCount || MOCK_PRODUCTS.length, sub: 'across 5 categories', color: 'text-green-600', isLoading: isProductsLoading },
        ].map(({ icon: Icon, label, value, sub, color, isLoading }, i) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 + i * 0.06 }}
            className="card flex flex-col justify-between"
          >
            <div>
              <Icon size={16} className={`${color} mb-2`} />
              <p className="section-label mb-1">{label}</p>
            </div>
            {isLoading ? (
              <div className="h-[32px] flex items-center">
                <Loader2 size={18} className={`animate-spin ${color}`} />
              </div>
            ) : (
              <p className={`text-2xl font-display font-bold ${color}`}>{value}</p>
            )}
            <p className="text-[10px] text-gray-400 mt-0.5">{sub}</p>
          </motion.div>
        ))}
      </div>

      {/* Featured products */}
      {!profile && (
        <div className="card bg-brand-cream border-brand-orange/20">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-display font-semibold text-brand-navy text-sm">Get started</h3>
          </div>
          <p className="text-xs text-gray-600 mb-4">
            You have not set up your profile yet. Talk to the AI advisor or set up your profile directly to generate your personalised Life Journey.
          </p>
          <div className="flex gap-3">
            <button onClick={() => setActiveTab('chat')} className="btn-primary text-xs py-2 px-4">
              <MessageSquare size={13} /> Start AI chat
            </button>
            <button onClick={() => setIsProfileModalOpen(true)} className="btn-outline text-xs py-2 px-4">
              Setup Profile
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
