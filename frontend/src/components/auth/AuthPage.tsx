import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Eye, EyeOff, ArrowRight, Loader2, Shield, TrendingUp, Target } from 'lucide-react'
import { mockSignIn, mockSignUp } from '../../mocks/auth'
import { useAppStore } from '../../store'

type Mode = 'login' | 'signup' | 'forgot'

const FEATURES = [
  { icon: Target,     text: 'Goal-based financial planning personalised to your life' },
  { icon: TrendingUp, text: 'AI-powered product matching across 5 insurance categories' },
  { icon: Shield,     text: 'IRDAI-regulated products from ICICI Prudential' },
]

export default function AuthPage() {
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [forgotSent, setForgotSent] = useState(false)

  const { setUser } = useAppStore()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (mode === 'login') {
        const user = await mockSignIn(email, password)
        setUser(user)
      } else if (mode === 'signup') {
        const user = await mockSignUp(email, password, name)
        setUser(user)
      } else {
        await new Promise(r => setTimeout(r, 800))
        setForgotSent(true)
      }
    } catch (err: any) {
      setError(err.message ?? 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  function demoLogin(demoEmail: string) {
    setEmail(demoEmail)
    setPassword('demo1234')
    setMode('login')
  }

  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div className="hidden lg:flex flex-col justify-between w-[480px] gradient-hero p-10 text-white">
        <div>
          <div className="flex items-center gap-3 mb-12">
            <div className="w-10 h-10 bg-white/15 rounded-xl flex items-center justify-center">
              <span className="font-display font-bold text-white">LM</span>
            </div>
            <div>
              <p className="font-display font-bold text-lg leading-tight">LifeMap</p>
              <p className="text-xs text-white/60">by ICICI Prudential</p>
            </div>
          </div>

          <h1 className="text-4xl font-display font-bold leading-tight mb-4">
            Plan every<br />milestone of<br />
            <span className="text-brand-orange">your life.</span>
          </h1>
          <p className="text-white/70 text-sm leading-relaxed mb-10">
            A GenAI-powered simulator that maps your life goals to the right insurance products —
            from your child's education to a worry-free retirement.
          </p>

          <div className="space-y-4">
            {FEATURES.map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-brand-orange/20 flex items-center justify-center shrink-0 mt-0.5">
                  <Icon size={15} className="text-brand-orange" />
                </div>
                <p className="text-sm text-white/80 leading-relaxed">{text}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-10">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs text-white/50 uppercase tracking-widest">Quick demo access</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {['demo@lifemap.in', 'rajesh@lifemap.in', 'anita@lifemap.in'].map(e => (
              <button
                key={e}
                onClick={() => demoLogin(e)}
                className="text-[10px] bg-white/10 hover:bg-white/20 rounded-lg px-2 py-1.5 transition-colors text-white/80 text-center"
              >
                {e.split('@')[0].charAt(0).toUpperCase() + e.split('@')[0].slice(1)}
              </button>
            ))}
          </div>
          <p className="text-[10px] text-white/40 mt-2">Password for all demo accounts: demo1234</p>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-6 bg-surface-subtle">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md"
        >
          <div className="card shadow-card-hover">
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-1 lg:hidden">
                <div className="w-6 h-6 gradient-orange rounded-lg flex items-center justify-center">
                  <span className="text-white text-[10px] font-bold">LM</span>
                </div>
                <span className="text-xs text-gray-400">by ICICI Prudential</span>
              </div>
              <h2 className="text-xl font-display font-bold text-gray-900">
                {mode === 'login' ? 'Welcome back' : mode === 'signup' ? 'Create your account' : 'Reset password'}
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                {mode === 'login' ? 'Sign in to your LifeMap account' :
                 mode === 'signup' ? 'Start your financial planning journey' :
                 'We will send a reset link to your email'}
              </p>
            </div>

            <AnimatePresence mode="wait">
              {forgotSent ? (
                <motion.div
                  key="sent"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="text-center py-6"
                >
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Shield size={22} className="text-green-600" />
                  </div>
                  <p className="font-semibold text-gray-800">Reset link sent</p>
                  <p className="text-sm text-gray-500 mt-1">Check your inbox at {email}</p>
                  <button onClick={() => { setMode('login'); setForgotSent(false) }} className="btn-ghost mt-4 text-sm">
                    Back to login
                  </button>
                </motion.div>
              ) : (
                <motion.form
                  key={mode}
                  initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  onSubmit={handleSubmit}
                  className="space-y-4"
                >
                  {mode === 'signup' && (
                    <div>
                      <label className="text-xs font-medium text-gray-600 mb-1 block">Full name</label>
                      <input
                        className="input-base"
                        placeholder="Priya Sharma"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        required
                      />
                    </div>
                  )}

                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">Email address</label>
                    <input
                      type="email"
                      className="input-base"
                      placeholder="you@example.com"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      required
                    />
                  </div>

                  {mode !== 'forgot' && (
                    <div>
                      <label className="text-xs font-medium text-gray-600 mb-1 block">Password</label>
                      <div className="relative">
                        <input
                          type={showPw ? 'text' : 'password'}
                          className="input-base pr-10"
                          placeholder="Enter password"
                          value={password}
                          onChange={e => setPassword(e.target.value)}
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPw(!showPw)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                        </button>
                      </div>
                      {mode === 'login' && (
                        <button type="button" onClick={() => setMode('forgot')} className="text-xs text-brand-orange mt-1 hover:underline">
                          Forgot password?
                        </button>
                      )}
                    </div>
                  )}

                  {error && (
                    <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-600">
                      {error}
                    </div>
                  )}

                  <button type="submit" disabled={loading} className="btn-primary w-full justify-center mt-2">
                    {loading ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
                    {mode === 'login' ? 'Sign in' : mode === 'signup' ? 'Create account' : 'Send reset link'}
                  </button>

                  <div className="text-center text-xs text-gray-500 pt-1">
                    {mode === 'login' ? (
                      <>No account? <button type="button" onClick={() => setMode('signup')} className="text-brand-orange font-medium hover:underline">Sign up free</button></>
                    ) : (
                      <>Already have an account? <button type="button" onClick={() => setMode('login')} className="text-brand-orange font-medium hover:underline">Sign in</button></>
                    )}
                  </div>
                </motion.form>
              )}
            </AnimatePresence>
          </div>

          <p className="text-center text-[10px] text-gray-400 mt-4 leading-relaxed">
            By continuing you agree to ICICI Prudential's Terms of Use and Privacy Policy.<br />
            Insurance is subject to IRDAI regulations. Recommendations are illustrative only.
          </p>
        </motion.div>
      </div>
    </div>
  )
}
