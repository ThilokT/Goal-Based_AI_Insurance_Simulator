import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Save, User, Loader2 } from 'lucide-react'
import { useAppStore } from '../../store'
import { api } from '../../lib/apiClient'
import type { UserProfile } from '../../types'
import { cn } from '../../lib/utils'
import { CheckCircle2 } from 'lucide-react'

const GOALS_OPTIONS = [
  "Child's Higher Education", "Child's Marriage", 'Buy a Home',
  'Retirement Planning', 'Leave a Legacy', 'Business Fund', 'Travel & Experiences',
]

interface ProfileModalProps {
  isOpen: boolean
  onClose: () => void
}

interface EditableGoal {
  id?: string;
  label: string;
  targetAmount: number;
  targetAge: number;
}

export default function ProfileModal({ isOpen, onClose }: ProfileModalProps) {
  const { profile, setProfile, loadProfile, goals, createGoal, updateGoal, deleteGoal } = useAppStore()
  
  const [formData, setFormData] = useState<Partial<UserProfile>>({
    name: '',
    age: undefined,
    city: '',
    income: undefined,
    monthlyExpenses: undefined,
    existingCoverage: undefined,
    riskAppetite: undefined,
    familySize: undefined,
    goals: [],
    editableGoals: [],
  })
  
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen && profile) {
      setFormData({
        name: profile.name,
        age: profile.age,
        city: profile.city,
        income: profile.income,
        monthlyExpenses: profile.monthlyExpenses,
        existingCoverage: profile.existingCoverage,
        riskAppetite: profile.riskAppetite,
        familySize: profile.familySize,
        maritalStatus: profile.maritalStatus,
        occupation: profile.occupation,
        editableGoals: goals.map(g => ({
          id: g.id,
          label: g.label,
          targetAmount: g.corpusNeeded || 1000000,
          targetAge: g.targetAge || (profile.age || 30) + 10,
        })),
      })
    } else if (isOpen && !profile) {
      loadProfile()
    }
  }, [isOpen, profile, loadProfile])

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    setError(null)
    
    try {
      const updatePayload = {
        full_name: formData.name,
        age: formData.age,
        city: formData.city,
        annual_income: (formData.income || 0) * 12,
        monthly_expenses: formData.monthlyExpenses,
        existing_coverage: formData.existingCoverage,
        risk_appetite: formData.riskAppetite?.toLowerCase() || 'moderate',
        dependents: formData.familySize,
        marital_status: formData.maritalStatus,
        occupation: formData.occupation,
      }
      
      await api.put('/users/me', updatePayload)
      
      const originalGoals = goals
      const editableGoals = formData.editableGoals || []
      
      const goalsToAdd = editableGoals.filter(eg => !eg.id)
      const goalsToUpdate = editableGoals.filter(eg => eg.id)
      const goalsToRemove = originalGoals.filter(g => !editableGoals.some(eg => eg.id === g.id))

      for (const g of goalsToRemove) {
        await deleteGoal(g.id).catch(console.error)
      }

      for (const eg of goalsToAdd) {
        await createGoal({
          goal_type: eg.label,
          target_amount: eg.targetAmount, 
          target_year: eg.targetAge,
        }).catch(console.error)
      }
      
      for (const eg of goalsToUpdate) {
        const original = originalGoals.find(g => g.id === eg.id);
        if (original && (original.corpusNeeded !== eg.targetAmount || original.targetAge !== eg.targetAge)) {
          await updateGoal(eg.id!, {
            goal_type: eg.label,
            target_amount: eg.targetAmount,
            target_year: eg.targetAge,
          }).catch(console.error)
        }
      }
      
      setProfile({
        ...(profile || { goals: [] }),
        ...formData,
      } as UserProfile)
      
      onClose()
    } catch (err: any) {
      console.error('Failed to update profile', err)
      const errorMsg = err.detail || err.message || 'Unknown error'
      setError(`Failed to save profile: ${errorMsg}`)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]"
        >
          <div className="flex items-center justify-between p-5 border-b border-gray-100 bg-brand-cream/30">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 gradient-orange rounded-full flex items-center justify-center text-white shadow-sm">
                <User size={20} />
              </div>
              <div>
                <h2 className="font-display font-bold text-brand-navy text-lg leading-tight">Your Profile</h2>
                <p className="text-xs text-gray-500">Edit your details so the AI can assist you better</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 text-gray-400">
              <X size={20} />
            </button>
          </div>
          
          <form onSubmit={handleSubmit} className="p-5 overflow-y-auto">
            {error && <div className="p-3 mb-4 text-sm text-red-600 bg-red-50 rounded-lg">{error}</div>}
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-brand-navy mb-1">Full Name</label>
                <input
                  type="text"
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="input-base w-full"
                  required
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-brand-navy mb-1">Age</label>
                  <input
                    type="number"
                    value={formData.age || ''}
                    onChange={(e) => setFormData({ ...formData, age: parseInt(e.target.value) })}
                    className="input-base w-full"
                    min="18"
                    max="100"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-brand-navy mb-1">City</label>
                  <input
                    type="text"
                    value={formData.city || ''}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="input-base w-full"
                    required
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-xs font-semibold text-brand-navy mb-1">Monthly Income (₹)</label>
                <input
                  type="number"
                  value={formData.income || ''}
                  onChange={(e) => setFormData({ ...formData, income: parseInt(e.target.value) })}
                  className="input-base w-full"
                  min="0"
                  step="1000"
                  required
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-brand-navy mb-1">Monthly Expenses (₹)</label>
                  <input
                    type="number"
                    value={formData.monthlyExpenses || ''}
                    onChange={(e) => setFormData({ ...formData, monthlyExpenses: parseInt(e.target.value) })}
                    className="input-base w-full"
                    min="0"
                    step="1000"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-brand-navy mb-1">Existing Coverage (₹)</label>
                  <input
                    type="number"
                    value={formData.existingCoverage || ''}
                    onChange={(e) => setFormData({ ...formData, existingCoverage: parseInt(e.target.value) })}
                    className="input-base w-full"
                    min="0"
                    step="10000"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-brand-navy mb-1">Dependants</label>
                  <input
                    type="number"
                    value={formData.familySize || ''}
                    onChange={(e) => setFormData({ ...formData, familySize: parseInt(e.target.value) })}
                    className="input-base w-full"
                    min="0"
                    max="10"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-brand-navy mb-1">Risk Appetite</label>
                  <select
                    value={formData.riskAppetite || 'moderate'}
                    onChange={(e) => setFormData({ ...formData, riskAppetite: e.target.value as any })}
                    className="input-base w-full bg-white"
                  >
                    <option value="conservative">Conservative</option>
                    <option value="moderate">Moderate</option>
                    <option value="aggressive">Aggressive</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-brand-navy mb-1">Marital Status</label>
                  <select
                    value={formData.maritalStatus || ''}
                    onChange={(e) => setFormData({ ...formData, maritalStatus: e.target.value })}
                    className="input-base w-full bg-white"
                  >
                    <option value="">Select...</option>
                    <option value="single">Single</option>
                    <option value="married">Married</option>
                    <option value="divorced">Divorced</option>
                    <option value="widowed">Widowed</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-brand-navy mb-1">Occupation</label>
                  <input
                    type="text"
                    value={formData.occupation || ''}
                    onChange={(e) => setFormData({ ...formData, occupation: e.target.value })}
                    className="input-base w-full"
                    placeholder="e.g. Software Engineer"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-xs font-semibold text-brand-navy mb-2">Life Goals</label>
                <div className="grid grid-cols-2 gap-2">
                  {GOALS_OPTIONS.map(g => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => {
                        setFormData(f => {
                          const existing = f.editableGoals?.find(eg => eg.label === g);
                          if (existing) {
                            return { ...f, editableGoals: f.editableGoals?.filter(eg => eg.label !== g) }
                          } else {
                            return { 
                              ...f, 
                              editableGoals: [...(f.editableGoals || []), { label: g, targetAmount: 1000000, targetAge: (f.age || 30) + 10 }] 
                            }
                          }
                        })
                      }}
                      className={cn(
                        "text-xs px-3 py-2 rounded-lg border text-left transition-all",
                        formData.editableGoals?.some(eg => eg.label === g)
                          ? "bg-brand-orange/10 border-brand-orange text-brand-orange font-medium"
                          : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100"
                      )}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>

              {formData.editableGoals && formData.editableGoals.length > 0 && (
                <div className="mt-4 space-y-3">
                  <label className="block text-xs font-semibold text-brand-navy mb-2">Configure Goals</label>
                  {formData.editableGoals.map((eg, idx) => (
                    <div key={eg.label} className="p-3 bg-brand-cream/30 rounded-lg border border-brand-orange/20 space-y-2">
                      <div className="font-medium text-xs text-brand-navy">{eg.label}</div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] text-gray-500 mb-1">Target Amount (₹)</label>
                          <input 
                            type="number" 
                            className="input-base w-full py-1.5 text-xs bg-white" 
                            value={eg.targetAmount || ''}
                            onChange={(e) => {
                              const newGoals = [...(formData.editableGoals || [])]
                              newGoals[idx].targetAmount = parseInt(e.target.value) || 0
                              setFormData({ ...formData, editableGoals: newGoals })
                            }}
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-gray-500 mb-1">Target Age</label>
                          <input 
                            type="number" 
                            className="input-base w-full py-1.5 text-xs bg-white" 
                            value={eg.targetAge || ''}
                            onChange={(e) => {
                              const newGoals = [...(formData.editableGoals || [])]
                              newGoals[idx].targetAge = parseInt(e.target.value) || 0
                              setFormData({ ...formData, editableGoals: newGoals })
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="mt-6 pt-5 border-t border-gray-100 flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="btn-ghost flex-1 py-2.5 text-gray-600"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="btn-primary flex-1 py-2.5"
              >
                {isSaving ? <Loader2 size={18} className="animate-spin mx-auto" /> : (
                  <>
                    <Save size={18} />
                    Save Profile
                  </>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
