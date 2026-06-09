import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Filter, ExternalLink, ChevronDown, Check } from 'lucide-react'
import { MOCK_PRODUCTS, CATEGORY_META } from '../../mocks/products'
import { formatCurrency } from '../../lib/utils'
import { cn } from '../../lib/utils'
import type { ProductCategory } from '../../types'

const CATEGORIES: { value: ProductCategory | 'all'; label: string }[] = [
  { value: 'all',              label: 'All Products' },
  { value: 'protection',       label: 'Protection' },
  { value: 'ulip',             label: 'ULIP' },
  { value: 'participating',    label: 'Participating' },
  { value: 'non-participating',label: 'Non-Participating' },
  { value: 'annuity',          label: 'Annuity' },
]

export default function ProductsPage() {
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState<ProductCategory | 'all'>('all')
  const [expanded, setExpanded] = useState<string | null>(null)

  const filtered = useMemo(() => {
    return MOCK_PRODUCTS.filter(p => {
      const matchCat = category === 'all' || p.category === category
      const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.tagline.toLowerCase().includes(search.toLowerCase()) ||
        p.idealFor.some(i => i.toLowerCase().includes(search.toLowerCase()))
      return matchCat && matchSearch
    })
  }, [search, category])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-gray-900">ICICI Prudential Products</h1>
        <p className="text-sm text-gray-500 mt-1">Explore {MOCK_PRODUCTS.length} products across 5 categories</p>
      </div>

      {/* Filters */}
      <div className="card py-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className="input-base pl-9"
            placeholder="Search products, goals, features..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {CATEGORIES.map(c => (
            <button
              key={c.value}
              onClick={() => setCategory(c.value as ProductCategory | 'all')}
              className={cn(
                'text-xs font-medium px-3 py-2 rounded-lg border transition-all whitespace-nowrap',
                category === c.value
                  ? 'border-brand-orange bg-brand-orange text-white shadow-orange'
                  : 'border-gray-200 text-gray-600 hover:border-brand-orange/40'
              )}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* Count */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-500">{filtered.length} product{filtered.length !== 1 ? 's' : ''} found</p>
      </div>

      {/* Products grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <AnimatePresence>
          {filtered.map((product, i) => {
            const meta = CATEGORY_META[product.category]
            const isExpanded = expanded === product.id
            return (
              <motion.div
                key={product.id}
                layout
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: i * 0.04 }}
                className="card flex flex-col hover:shadow-card-hover transition-all duration-200 cursor-pointer"
                onClick={() => setExpanded(isExpanded ? null : product.id)}
              >
                <div className="flex items-start justify-between mb-3">
                  <span className={meta.color}>{meta.label}</span>
                  {product.badge && (
                    <span className="badge-orange text-[10px]">{product.badge}</span>
                  )}
                </div>

                <h3 className="font-display font-semibold text-gray-900 text-sm mb-1 leading-snug">{product.name}</h3>
                <p className="text-xs text-gray-500 leading-relaxed mb-4">{product.tagline}</p>

                <div className="mt-auto space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-400">Min. premium</span>
                    <span className="font-semibold text-gray-800">{formatCurrency(product.minPremium)}/yr</span>
                  </div>
                  {product.coverageUpTo > 0 && (
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-400">Cover up to</span>
                      <span className="font-semibold text-brand-navy">{formatCurrency(product.coverageUpTo)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-400">Tenure</span>
                    <span className="font-semibold text-gray-800">{product.tenure}</span>
                  </div>
                </div>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-4 pt-4 border-t border-gray-100 space-y-3 overflow-hidden"
                    >
                      <div>
                        <p className="section-label mb-2">Key benefits</p>
                        <ul className="space-y-1">
                          {product.keyBenefits.map(b => (
                            <li key={b} className="flex items-start gap-2 text-xs text-gray-600">
                              <Check size={12} className="text-green-500 mt-0.5 flex-shrink-0" />
                              {b}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <p className="section-label mb-2">Ideal for</p>
                        <div className="flex flex-wrap gap-1">
                          {product.idealFor.map(t => (
                            <span key={t} className="text-[10px] bg-gray-100 text-gray-600 rounded-full px-2 py-0.5">{t}</span>
                          ))}
                        </div>
                      </div>
                      <button className="btn-outline w-full justify-center text-xs py-2">
                        View full brochure <ExternalLink size={12} />
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="flex items-center gap-1 mt-3 text-xs text-gray-400">
                  <span>{isExpanded ? 'Show less' : 'View details'}</span>
                  <ChevronDown size={12} className={cn('transition-transform', isExpanded && 'rotate-180')} />
                </div>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <Search size={36} className="mx-auto mb-3 opacity-40" />
          <p className="font-medium">No products found</p>
          <p className="text-sm mt-1">Try a different search term or category</p>
        </div>
      )}
    </div>
  )
}
