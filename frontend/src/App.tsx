import { AnimatePresence, motion } from 'framer-motion'
import { useAppStore } from './store'
import AuthPage from './components/auth/AuthPage'
import Layout from './components/layout/Layout'
import Dashboard from './pages/Dashboard'
import ChatPanel from './components/chat/ChatPanel'
import OnboardingFlow from './components/onboarding/OnboardingFlow'
import ProductsPage from './components/products/ProductsPage'
import LifeJourneyTimeline from './components/timeline/LifeJourneyTimeline'
import WhatIfPanel from './components/simulation/WhatIfPanel'
import ScenarioComparison from './components/products/ScenarioComparison'
import LandingPage from './components/landing/LandingPage'

const PAGE_TITLES: Record<string, string> = {
  dashboard: 'Dashboard',
  chat:      'AI Advisor',
  onboard:   'Profile Setup',
  products:  'Products',
  timeline:  'Life Journey',
  simulate:  'What-If Simulator',
  compare:   'Compare Products',
  report:    'My Report',
}

function AppContent() {
  const { activeTab } = useAppStore()
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.2 }}
      >
        {activeTab === 'dashboard' && <Dashboard />}
        {activeTab === 'chat'      && <ChatPanel />}
        {activeTab === 'onboard'   && <OnboardingFlow />}
        {activeTab === 'products'  && <ProductsPage />}
        {activeTab === 'timeline'  && <LifeJourneyTimeline />}
        {activeTab === 'simulate'  && <WhatIfPanel />}
        {activeTab === 'compare'   && <ScenarioComparison />}
        {activeTab === 'report'    && (
          <div className="card text-center py-20">
            <p className="text-gray-400 text-sm">PDF report generation will be wired to the backend API in Phase 4.</p>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  )
}

export default function App() {
  const { user, activeTab } = useAppStore()

  // Show landing if user wants to see it explicitly
  if (activeTab === 'landing') return <LandingPage />

  // Not authenticated
  if (!user) return <AuthPage />

  return (
    <Layout>
      <div className="mb-4">
        <h2 className="text-lg font-display font-bold text-gray-900">
          {PAGE_TITLES[activeTab] ?? 'LifeMap'}
        </h2>
      </div>
      <AppContent />
    </Layout>
  )
}
