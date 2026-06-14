import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Save, User, Loader2 } from 'lucide-react'
import { useAppStore } from '../../store'
import { api } from '../../lib/apiClient'
import type { UserProfile } from '../../types'

interface ProfileModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function ProfileModal({ isOpen, onClose }: ProfileModalProps) {
  const { profile, setProfile, loadProfile } = useAppStore()
  
  const [formData, setFormData] = useState<Partial<UserProfile>>({
    name: '',
    age: 30,
    city: 'Mumbai',
    income: 1000000 / 12,
    riskAppetite: 'moderate',
    familySize: 0,
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
        riskAppetite: profile.riskAppetite,
        familySize: profile.familySize,
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
        risk_appetite: formData.riskAppetite?.toLowerCase() || 'moderate',
        dependents: formData.familySize,
      }
      
      await api.put('/users/me', updatePayload)
      
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
            </div>
            
            <div className="mt-8 flex gap-3">
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
