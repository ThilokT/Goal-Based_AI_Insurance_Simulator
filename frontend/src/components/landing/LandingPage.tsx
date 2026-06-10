import { motion, useScroll, useTransform } from 'framer-motion'
import { useRef } from 'react'
import {
  ArrowRight, Shield, TrendingUp, Target, BarChart3,
  MessageSquare, Sparkles, ChevronDown, CheckCircle2
} from 'lucide-react'
import { useAppStore } from '../../store'

const STATS = [
  { value: '5Cr+', label: 'Lives insured' },
  { value: '40+', label: 'Years of trust' },
  { value: '₹2.5L Cr', label: 'AUM managed' },
  { value: '98.5%', label: 'Claim settlement' },
]

const HOW_IT_WORKS = [
  { step: '01', icon: MessageSquare, title: 'Share your life context', desc: 'Tell our AI advisor your age, income, family situation, and life goals through a natural conversation.' },
  { step: '02', icon: Target,        title: 'Map your milestones',    desc: "We calculate the corpus needed for each goal — your child's education, home, retirement — accounting for inflation." },
  { step: '03', icon: Sparkles,      title: 'Get matched products',   desc: 'LifeMap recommends the right mix of Term, ULIP, Participating, Non-Par, and Annuity plans from ICICI Prudential.' },
  { step: '04', icon: BarChart3,     title: 'Visualise your journey', desc: 'See your complete Life Journey on an interactive timeline. Run what-if scenarios and download your personalised report.' },
]

const PRODUCT_CHIPS = [
  { label: 'Term Protection', color: 'bg-orange-100 text-brand-orange' },
  { label: 'ULIP',            color: 'bg-blue-100 text-brand-navy' },
  { label: 'Participating',   color: 'bg-yellow-100 text-yellow-800' },
  { label: 'Non-Participating', color: 'bg-green-100 text-green-700' },
  { label: 'Annuity',         color: 'bg-purple-100 text-purple-700' },
]

export default function LandingPage() {
  const { setActiveTab, setUser } = useAppStore()
  const heroRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ target: heroRef })
  const heroY = useTransform(scrollYProgress, [0, 1], ['0%', '30%'])

  function goToApp() {
    // For demo, set a demo user and go to dashboard
    setUser({ id: 'demo@lifemap.in', email: 'demo@lifemap.in', name: 'Priya Sharma', avatarInitials: 'PS' })
    setActiveTab('chat')
  }

  return (
    <div className="min-h-screen bg-white overflow-x-hidden">
      {/* Navbar */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 gradient-orange rounded-lg flex items-center justify-center shadow-orange">
              <span className="text-white font-bold text-sm">LM</span>
            </div>
            <div>
              <p className="font-display font-bold text-brand-navy text-sm leading-tight">LifeMap</p>
              <p className="text-[10px] text-gray-400">by ICICI Prudential</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button className="btn-ghost text-sm hidden sm:inline-flex">How it works</button>
            <button onClick={goToApp} className="btn-primary text-sm">
              Get Started <ArrowRight size={15} />
            </button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section ref={heroRef} className="relative min-h-screen flex items-center gradient-hero overflow-hidden pt-16">
        <motion.div
          style={{ y: heroY }}
          className="absolute inset-0 opacity-10"
        >
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="absolute rounded-full border border-white/30"
              style={{
                width: `${200 + i * 120}px`,
                height: `${200 + i * 120}px`,
                left: `${-10 + i * 8}%`,
                top: `${-20 + i * 15}%`,
              }}
            />
          ))}
        </motion.div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-20 grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <motion.div
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
              className="inline-flex items-center gap-2 bg-white/10 rounded-full px-4 py-1.5 mb-6 border border-white/20"
            >
              <Sparkles size={13} className="text-brand-orange" />
              <span className="text-xs text-white/80 font-medium">GenAI-Powered Financial Simulator</span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
              className="text-5xl sm:text-6xl font-display font-bold text-white leading-tight mb-6 text-balance"
            >
              Plan your life,<br />
              <span className="text-brand-orange">not just a policy.</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
              className="text-white/70 text-lg leading-relaxed mb-8 max-w-lg"
            >
              LifeMap converts your real-life aspirations into a personalised insurance roadmap —
              from your child's education to your retirement — powered by ICICI Prudential's full product suite.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
              className="flex flex-wrap gap-3 mb-10"
            >
              <button onClick={goToApp} className="btn-primary text-base px-8 py-3">
                Start planning free <ArrowRight size={17} />
              </button>
              <button className="btn-outline text-base px-8 py-3 border-white/30 text-white hover:bg-white/10 hover:text-white">
                Watch demo
              </button>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}
              className="flex flex-wrap gap-2"
            >
              {PRODUCT_CHIPS.map(c => (
                <span key={c.label} className={`badge ${c.color} text-xs`}>{c.label}</span>
              ))}
            </motion.div>
          </div>

          {/* Floating card mockup */}
          <motion.div
            initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5, type: 'spring' }}
            className="hidden lg:block"
          >
            <div className="relative">
              <div className="bg-white/10 backdrop-blur-sm rounded-3xl border border-white/20 p-6 shadow-2xl">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-9 h-9 rounded-full gradient-orange flex items-center justify-center">
                    <span className="text-white text-xs font-bold">PS</span>
                  </div>
                  <div>
                    <p className="text-white text-sm font-semibold">Priya Sharma, 32</p>
                    <p className="text-white/50 text-xs">Bengaluru · ₹1.2L/month</p>
                  </div>
                  <span className="ml-auto badge-green text-[10px]">Plan ready</span>
                </div>

                <div className="space-y-3 mb-5">
                  {[
                    { label: "Aanya's Education", amount: '₹62L', cover: '₹62L', pct: 100, color: 'bg-green-400' },
                    { label: 'Retirement at 58',  amount: '₹4.2Cr', cover: '₹3.1Cr', pct: 74, color: 'bg-brand-orange' },
                    { label: 'Family Protection', amount: '₹2Cr', cover: '₹2Cr', pct: 100, color: 'bg-green-400' },
                  ].map(g => (
                    <div key={g.label} className="bg-white/10 rounded-xl p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-white/80 text-xs font-medium">{g.label}</span>
                        <span className="text-white text-xs font-bold">{g.cover} / {g.amount}</span>
                      </div>
                      <div className="w-full bg-white/10 rounded-full h-1.5">
                        <div className={`${g.color} h-1.5 rounded-full transition-all`} style={{ width: `${g.pct}%` }} />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="bg-brand-orange/20 rounded-xl p-3 border border-brand-orange/30">
                  <p className="text-white text-xs font-semibold mb-1">Recommended plan</p>
                  <p className="text-white/70 text-[11px]">iProtect Smart + Smart Life ULIP + Guaranteed Pension</p>
                  <p className="text-brand-orange text-xs font-bold mt-1">₹12,400/month combined premium</p>
                </div>
              </div>

              <motion.div
                animate={{ y: [0, -8, 0] }} transition={{ repeat: Infinity, duration: 3 }}
                className="absolute -top-4 -right-4 bg-white rounded-2xl shadow-card-hover px-4 py-3"
              >
                <p className="text-[10px] text-gray-500">Retirement gap covered</p>
                <p className="text-brand-navy font-bold text-sm">+₹1.1 Cr</p>
              </motion.div>
            </div>
          </motion.div>
        </div>

        <div className="absolute bottom-6 left-1/2 -translate-x-1/2">
          <motion.div animate={{ y: [0, 6, 0] }} transition={{ repeat: Infinity, duration: 1.5 }}>
            <ChevronDown size={24} className="text-white/40" />
          </motion.div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-12 bg-white border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-4 grid grid-cols-2 sm:grid-cols-4 gap-8">
          {STATS.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }} viewport={{ once: true }}
              className="text-center"
            >
              <p className="text-3xl font-display font-bold text-brand-navy">{s.value}</p>
              <p className="text-sm text-gray-500 mt-1">{s.label}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 bg-surface-subtle">
        <div className="max-w-6xl mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }} className="text-center mb-14"
          >
            <p className="section-label mb-2">How LifeMap works</p>
            <h2 className="text-3xl sm:text-4xl font-display font-bold text-gray-900 text-balance">
              From conversation to comprehensive plan
            </h2>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {HOW_IT_WORKS.map(({ step, icon: Icon, title, desc }, i) => (
              <motion.div
                key={step}
                initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }} viewport={{ once: true }}
                className="card relative overflow-hidden group"
              >
                <div className="absolute top-4 right-4 text-5xl font-display font-bold text-gray-50 select-none">{step}</div>
                <div className="w-10 h-10 gradient-orange rounded-xl flex items-center justify-center mb-4 shadow-orange">
                  <Icon size={18} className="text-white" />
                </div>
                <h3 className="font-display font-semibold text-gray-900 mb-2 text-sm">{title}</h3>
                <p className="text-xs text-gray-500 leading-relaxed">{desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 gradient-hero">
        <div className="max-w-2xl mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl sm:text-4xl font-display font-bold text-white mb-4">
              Your life plan is 5 minutes away.
            </h2>
            <p className="text-white/70 mb-8">
              No forms. No agents. Just a conversation that builds your complete financial roadmap.
            </p>
            <button onClick={goToApp} className="btn-primary text-base px-10 py-3.5">
              Start your LifeMap <ArrowRight size={17} />
            </button>
            <p className="text-white/40 text-xs mt-4">Free to use. IRDAI regulated. No spam, ever.</p>
          </motion.div>
        </div>
      </section>

      <footer className="bg-brand-navy-dark text-white/50 text-xs py-6 px-4 text-center">
        <p>ICICI Prudential Life Insurance Company Limited | IRDAI Reg. No. 105</p>
        <p className="mt-1">CIN: L66010MH2000PLC127837 | ARN: LifeMap Demo — Not a solicitation</p>
      </footer>
    </div>
  )
}
