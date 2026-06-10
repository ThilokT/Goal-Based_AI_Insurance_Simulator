import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight, ArrowLeft, CheckCircle2, User, MapPin, IndianRupee, Heart, Target, TrendingUp } from 'lucide-react'
import { useAppStore } from '../../store'
import type { UserProfile } from '../../types'
import { cn } from '../../lib/utils'

const STEPS = [
  { id: 'personal', label: 'Personal', icon: User },
  { id: 'financial', label: 'Financial', icon: IndianRupee },
  { id: 'family', label: 'Family', icon: Heart },
  { id: 'goals', label: 'Goals', icon: Target },
  { id: 'risk', label: 'Risk Profile', icon: TrendingUp },
]

const GOALS_OPTIONS = [
  "Child's Higher Education", "Child's Marriage", 'Buy a Home',
  'Retirement Planning', 'Leave a Legacy', 'Business Fund', 'Travel & Experiences',
]

const RISK_OPTIONS: { value: UserProfile['riskAppetite']; label: string; desc: string; color: string }[] = [
  { value: 'conservative', label: 'Conservative', desc: 'Guaranteed returns, zero market risk. I prefer safety over high growth.', color: 'border-green-400 bg-green-50' },
  { value: 'moderate',     label: 'Moderate',     desc: 'Balanced approach — some market exposure for better returns.', color: 'border-blue-400 bg-blue-50' },
  { value: 'aggressive',   label: 'Aggressive',   desc: 'High equity allocation, comfortable with short-term volatility for long-term gains.', color: 'border-brand-orange bg-orange-50' },
]

export default function OnboardingFlow() {
  const { setProfile, setActiveTab } = useAppStore()
  const [step, setStep] = useState(0)
  const [form, setForm] = useState({
    name: '', age: 30, city: '', income: 100000,
    familySize: 2, goals: [] as string[],
    riskAppetite: 'moderate' as UserProfile['riskAppetite'],
  })

  function update(field: string, value: unknown) {
    setForm(f => ({ ...f, [field]: value }))
  }

  function toggleGoal(goal: string) {
    setForm(f => ({
      ...f,
      goals: f.goals.includes(goal) ? f.goals.filter(g => g !== goal) : [...f.goals, goal],
    }))
  }

  function next() { if (step < STEPS.length - 1) setStep(s => s + 1) }
  function back() { if (step > 0) setStep(s => s - 1) }

  function finish() {
    setProfile(form)
    setActiveTab('chat')
  }

  const slides = [
    /* 0: Personal */
    <div className="space-y-4">
      <div>
        <label className="text-xs font-medium text-gray-600 mb-1 block">Your full name</label>
        <input className="input-base" placeholder="Priya Sharma" value={form.name} onChange={e => update('name', e.target.value)} />
      </div>
      <div>
        <label className="text-xs font-medium text-gray-600 mb-1 block">Your age</label>
        <div className="flex items-center gap-3">
          <input type="range" min={18} max={65} value={form.age} onChange={e => update('age', +e.target.value)} className="flex-1 accent-brand-orange" />
          <span className="text-brand-navy font-bold w-10 text-center">{form.age}</span>
        </div>
      </div>
      <div>
        <label className="text-xs font-medium text-gray-600 mb-1 block">City</label>
        <input className="input-base" placeholder="Bengaluru" value={form.city} onChange={e => update('city', e.target.value)} />
      </div>
    </div>,

    /* 1: Financial */
    <div className="space-y-5">
      <div>
        <label className="text-xs font-medium text-gray-600 mb-1 block">Monthly household income</label>
        <div className="flex items-center gap-3">
          <input type="range" min={20000} max={1000000} step={10000} value={form.income} onChange={e => update('income', +e.target.value)} className="flex-1 accent-brand-orange" />
          <span className="text-brand-navy font-bold text-sm w-16 text-right">₹{(form.income / 1000).toFixed(0)}K</span>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {[50000, 100000, 200000, 300000, 500000, 1000000].map(v => (
          <button
            key={v}
            onClick={() => update('income', v)}
            className={cn('text-xs rounded-xl py-2 border transition-all', form.income === v ? 'border-brand-orange bg-orange-50 text-brand-orange font-semibold' : 'border-gray-200 text-gray-600 hover:border-brand-orange/50')}
          >
            ₹{v >= 100000 ? `${v / 100000}L` : `${v / 1000}K`}
          </button>
        ))}
      </div>
    </div>,

    /* 2: Family */
    <div className="space-y-5">
      <div>
        <label className="text-xs font-medium text-gray-600 mb-1 block">Number of dependants (including you)</label>
        <div className="flex items-center gap-4">
          {[1, 2, 3, 4, 5, '6+'].map(v => (
            <button
              key={v}
              onClick={() => update('familySize', typeof v === 'number' ? v : 6)}
              className={cn(
                'w-10 h-10 rounded-full border-2 text-sm font-semibold transition-all',
                form.familySize === (typeof v === 'number' ? v : 6)
                  ? 'border-brand-orange bg-brand-orange text-white shadow-orange'
                  : 'border-gray-200 text-gray-600 hover:border-brand-orange/40'
              )}
            >
              {v}
            </button>
          ))}
        </div>
      </div>
    </div>,

    /* 3: Goals */
    <div>
      <p className="text-xs text-gray-500 mb-3">Select all that apply (choose at least one)</p>
      <div className="grid grid-cols-2 gap-2">
        {GOALS_OPTIONS.map(g => (
          <button
            key={g}
            onClick={() => toggleGoal(g)}
            className={cn(
              'text-left text-xs rounded-xl px-3 py-2.5 border transition-all leading-snug',
              form.goals.includes(g)
                ? 'border-brand-orange bg-orange-50 text-brand-orange font-medium'
                : 'border-gray-200 text-gray-600 hover:border-brand-orange/40'
            )}
          >
            {form.goals.includes(g) && <CheckCircle2 size={12} className="inline mr-1 -mt-0.5" />}
            {g}
          </button>
        ))}
      </div>
    </div>,

    /* 4: Risk */
    <div className="space-y-3">
      {RISK_OPTIONS.map(opt => (
        <button
          key={opt.value}
          onClick={() => update('riskAppetite', opt.value)}
          className={cn(
            'w-full text-left rounded-xl p-4 border-2 transition-all',
            form.riskAppetite === opt.value ? opt.color : 'border-gray-200 hover:border-gray-300'
          )}
        >
          <div className="flex items-center gap-2 mb-1">
            <div className={cn('w-3 h-3 rounded-full border-2', form.riskAppetite === opt.value ? 'border-brand-orange bg-brand-orange' : 'border-gray-300')} />
            <span className="font-semibold text-sm text-gray-800">{opt.label}</span>
          </div>
          <p className="text-xs text-gray-500 ml-5">{opt.desc}</p>
        </button>
      ))}
    </div>,
  ]

  return (
    <div className="max-w-lg mx-auto">
      {/* Progress */}
      <div className="card mb-6">
        <div className="flex items-center gap-2 mb-1">
          {STEPS.map((s, i) => {
            const Icon = s.icon
            return (
              <div key={s.id} className="flex items-center gap-1">
                <div className={cn(
                  'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all',
                  i < step ? 'gradient-orange text-white shadow-orange' :
                  i === step ? 'bg-brand-navy text-white' :
                  'bg-gray-100 text-gray-400'
                )}>
                  {i < step ? <CheckCircle2 size={14} /> : <Icon size={13} />}
                </div>
                {i < STEPS.length - 1 && (
                  <div className={cn('h-0.5 flex-1 w-8 rounded-full transition-all', i < step ? 'bg-brand-orange' : 'bg-gray-100')} />
                )}
              </div>
            )
          })}
        </div>
        <div className="flex justify-between mt-2">
          <p className="text-xs text-gray-400">Step {step + 1} of {STEPS.length}</p>
          <p className="text-xs font-medium text-brand-navy">{STEPS[step].label}</p>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-1 mt-2">
          <motion.div
            className="gradient-orange h-1 rounded-full"
            animate={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>

      <div className="card mb-4">
        <h2 className="font-display font-bold text-gray-900 mb-1">
          {['Tell us about yourself', 'Your financial picture', 'Your family', 'Your life goals', 'Your risk appetite'][step]}
        </h2>
        <p className="text-xs text-gray-400 mb-5">
          {['This helps us personalise your plan.', 'We calculate coverage gaps based on income.', 'Family size affects protection needs.', 'Select the milestones you want to plan for.', 'This determines the right product mix.'][step]}
        </p>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.25 }}
          >
            {slides[step]}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="flex gap-3">
        {step > 0 && (
          <button onClick={back} className="btn-outline flex-1 justify-center">
            <ArrowLeft size={15} /> Back
          </button>
        )}
        {step < STEPS.length - 1 ? (
          <button onClick={next} className="btn-primary flex-1 justify-center">
            Continue <ArrowRight size={15} />
          </button>
        ) : (
          <button onClick={finish} className="btn-primary flex-1 justify-center">
            Build my plan <ArrowRight size={15} />
          </button>
        )}
      </div>
    </div>
  )
}
