import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, MessageSquare, Package, BarChart3, TrendingUp,
  Sliders, FileText, Settings, Shield, X
} from 'lucide-react'
import { useAppStore } from '../../store'
import { cn } from '../../lib/utils'

const NAV_ITEMS = [
  { id: 'dashboard',  label: 'Dashboard',    icon: LayoutDashboard },
  { id: 'chat',       label: 'AI Advisor',   icon: MessageSquare },
  { id: 'timeline',   label: 'Life Journey', icon: TrendingUp },
  { id: 'simulate',   label: 'What-If',      icon: Sliders },
  { id: 'products',   label: 'Products',     icon: Package },
  { id: 'compare',    label: 'Compare',      icon: BarChart3 },
  { id: 'report',     label: 'My Report',    icon: FileText },
]

export default function Sidebar() {
  const { sidebarOpen, setSidebarOpen, activeTab, setActiveTab } = useAppStore()

  const NavContent = () => (
    <div className="flex flex-col h-full">
      <div className="p-4 mb-2">
        <div className="section-label mb-3">Navigation</div>
        <nav className="space-y-0.5">
          {NAV_ITEMS.map(item => {
            const Icon = item.icon
            const active = activeTab === item.id
            return (
              <button
                key={item.id}
                onClick={() => { setActiveTab(item.id); setSidebarOpen(false) }}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150',
                  active
                    ? 'bg-brand-orange text-white shadow-orange'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-brand-navy'
                )}
              >
                <Icon size={17} />
                <span>{item.label}</span>
                {item.id === 'chat' && (
                  <span className="ml-auto w-2 h-2 rounded-full bg-green-400" />
                )}
              </button>
            )
          })}
        </nav>
      </div>

      <div className="mt-auto p-4 border-t border-gray-100">
        <div className="bg-brand-cream rounded-xl p-3 border border-brand-orange/20">
          <div className="flex items-center gap-2 mb-1">
            <Shield size={14} className="text-brand-orange" />
            <span className="text-xs font-semibold text-brand-navy">IRDAI Compliant</span>
          </div>
          <p className="text-[10px] text-gray-500 leading-relaxed">
            All products are regulated by IRDAI. Recommendations are illustrative and not financial advice.
          </p>
        </div>
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col fixed left-0 top-16 bottom-0 w-60 bg-white border-r border-gray-100 z-30">
        <NavContent />
      </aside>

      {/* Mobile overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setSidebarOpen(false)}
              className="fixed inset-0 bg-black/40 z-40 lg:hidden"
            />
            <motion.aside
              initial={{ x: -240 }} animate={{ x: 0 }} exit={{ x: -240 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="fixed left-0 top-0 bottom-0 w-60 bg-white z-50 lg:hidden shadow-xl"
            >
              <div className="flex items-center justify-between p-4 border-b border-gray-100">
                <span className="font-display font-bold text-brand-navy">LifeMap</span>
                <button onClick={() => setSidebarOpen(false)} className="p-1.5 rounded-lg hover:bg-gray-100">
                  <X size={18} />
                </button>
              </div>
              <NavContent />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
