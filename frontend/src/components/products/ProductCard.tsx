import { motion } from 'framer-motion'
import { Check, ArrowRight, Star } from 'lucide-react'
import { formatCurrency } from '../../lib/utils'
import { CATEGORY_META } from '../../mocks/products'
import { cn } from '../../lib/utils'
import type { Product } from '../../types'

interface ProductCardProps {
  product: Product
  compareMode?: boolean
  selected?: boolean
  onSelect?: () => void
  delay?: number
}

const RETURN_TYPE_LABEL: Record<string, { label: string; color: string }> = {
  'market-linked': { label: 'Market-linked returns', color: 'text-blue-600' },
  'guaranteed':    { label: 'Guaranteed returns',    color: 'text-green-600' },
  'bonus-based':   { label: 'Bonus-based returns',   color: 'text-yellow-600' },
  'income':        { label: 'Lifetime income',       color: 'text-purple-600' },
}

export default function ProductCard({ product, compareMode, selected, onSelect, delay = 0 }: ProductCardProps) {
  const meta = CATEGORY_META[product.category]
  const rtMeta = RETURN_TYPE_LABEL[product.returnType]

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, type: 'spring', stiffness: 200 }}
      whileHover={{ y: -4 }}
      className={cn(
        'card flex flex-col cursor-pointer transition-all duration-200 relative overflow-hidden',
        selected && 'ring-2 ring-brand-orange shadow-orange',
        compareMode && 'hover:ring-2 hover:ring-brand-orange/50'
      )}
      onClick={onSelect}
    >
      {/* Top accent bar */}
      <div
        className="absolute top-0 left-0 right-0 h-1 rounded-t-2xl"
        style={{ background: product.category === 'protection' ? '#F36F21' :
          product.category === 'ulip' ? '#003366' :
          product.category === 'participating' ? '#C9A84C' :
          product.category === 'non-participating' ? '#22C55E' : '#9333EA' }}
      />

      <div className="pt-2">
        <div className="flex items-start justify-between mb-3">
          <span className={meta.color}>{meta.label}</span>
          <div className="flex items-center gap-1">
            {product.badge && <span className="badge-orange text-[10px]">{product.badge}</span>}
            {selected && (
              <div className="w-5 h-5 rounded-full bg-brand-orange flex items-center justify-center">
                <Check size={11} className="text-white" />
              </div>
            )}
          </div>
        </div>

        <h3 className="font-display font-semibold text-gray-900 text-sm mb-1 leading-snug">{product.name}</h3>
        <p className="text-[11px] text-gray-500 leading-relaxed mb-3">{product.tagline}</p>

        <div className={cn('text-[11px] font-semibold mb-4', rtMeta.color)}>
          <span className="inline-flex items-center gap-1">
            <Star size={10} fill="currentColor" />
            {rtMeta.label}
          </span>
        </div>

        <div className="space-y-2 mb-4 border-t border-gray-50 pt-3">
          {product.keyBenefits.slice(0, 3).map(b => (
            <div key={b} className="flex items-start gap-2">
              <Check size={11} className="text-green-500 mt-0.5 flex-shrink-0" />
              <span className="text-[11px] text-gray-600 leading-snug">{b}</span>
            </div>
          ))}
        </div>

        <div className="mt-auto pt-3 border-t border-gray-100 grid grid-cols-2 gap-3">
          <div>
            <p className="text-[10px] text-gray-400">Min. premium</p>
            <p className="text-xs font-bold text-gray-800">{formatCurrency(product.minPremium)}/yr</p>
          </div>
          {product.coverageUpTo > 0 ? (
            <div>
              <p className="text-[10px] text-gray-400">Cover up to</p>
              <p className="text-xs font-bold text-brand-navy">{formatCurrency(product.coverageUpTo)}</p>
            </div>
          ) : (
            <div>
              <p className="text-[10px] text-gray-400">Tenure</p>
              <p className="text-xs font-bold text-gray-800">{product.tenure}</p>
            </div>
          )}
        </div>

        {!compareMode && (
          <button className="btn-primary w-full justify-center text-xs py-2 mt-4">
            View details <ArrowRight size={13} />
          </button>
        )}
      </div>
    </motion.div>
  )
}
