import { useState, useMemo, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Filter, ExternalLink, ChevronDown, Check, Loader2, WifiOff } from 'lucide-react'
import { MOCK_PRODUCTS, CATEGORY_META } from '../../mocks/products'
import { api } from '../../lib/apiClient'
import type { BackendProductListResponse } from '../../types/api'
import { mapBackendProduct } from '../../types/api'
import { formatCurrency } from '../../lib/utils'
import { cn } from '../../lib/utils'
import type { Product, ProductCategory } from '../../types'
import { useAppStore } from '../../store'
import ProductSimulationModal from './ProductSimulationModal'

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
  const [selectedCategories, setSelectedCategories] = useState<Set<ProductCategory>>(new Set())
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [usingFallback, setUsingFallback] = useState(false)
  const [simulatingProduct, setSimulatingProduct] = useState<Product | null>(null)
  const { profile, setProductCount } = useAppStore()

  useEffect(() => {
    let cancelled = false
    async function loadProducts() {
      setLoading(true)
      try {
        const res = await api.get<BackendProductListResponse>(`/api/products`)
        if (!cancelled) {
          const mapped = res.products.map(mapBackendProduct)
          setProducts(mapped.length > 0 ? mapped : MOCK_PRODUCTS)
          setUsingFallback(mapped.length === 0)
          setProductCount(mapped.length > 0 ? mapped.length : MOCK_PRODUCTS.length)
        }
      } catch {
        // API unavailable — fall back to mock data
        if (!cancelled) {
          setProducts(MOCK_PRODUCTS)
          setUsingFallback(true)
          setProductCount(MOCK_PRODUCTS.length)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    loadProducts()
    return () => { cancelled = true }
  }, []) // Fetch all products once on mount

  const filtered = useMemo(() => {
    return products.filter(p => {
      // Filter by selected categories (if none selected, show all)
      const matchCat = selectedCategories.size === 0 ? true : selectedCategories.has(p.category)
      const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.tagline.toLowerCase().includes(search.toLowerCase()) ||
        p.idealFor.some(i => i.toLowerCase().includes(search.toLowerCase()))
      return matchCat && matchSearch
    })
  }, [search, selectedCategories, products])

  const toggleCategory = (cat: ProductCategory | 'all') => {
    if (cat === 'all') {
      setSelectedCategories(new Set())
    } else {
      setSelectedCategories(prev => {
        const next = new Set(prev)
        if (next.has(cat)) next.delete(cat)
        else next.add(cat)
        return next
      })
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-gray-900">ICICI Prudential Products</h1>
        <p className="text-sm text-gray-500 mt-1">
          Explore {loading ? '...' : products.length} products across {CATEGORIES.length - 1} categories
          {usingFallback && (
            <span className="inline-flex items-center gap-1 ml-2 text-amber-500">
              <WifiOff size={11} /> offline mode
            </span>
          )}
        </p>
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
          {CATEGORIES.map(c => {
            const isSelected = c.value === 'all' 
                ? selectedCategories.size === 0 
                : selectedCategories.has(c.value as ProductCategory);
            return (
              <button
                key={c.value}
                onClick={() => toggleCategory(c.value as ProductCategory | 'all')}
                className={cn(
                  'text-xs font-medium px-3 py-2 rounded-lg border transition-all whitespace-nowrap',
                  isSelected
                    ? 'border-brand-orange bg-brand-orange text-white shadow-orange'
                    : 'border-gray-200 text-gray-600 hover:border-brand-orange/40'
                )}
              >
                {c.label}
              </button>
            )
          })}
        </div>
      </div>

        <p className="text-xs text-gray-500">
          {loading ? 'Loading...' : `${filtered.length} product${filtered.length !== 1 ? 's' : ''} found`}
        </p>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={28} className="animate-spin text-brand-orange" />
        </div>
      )}

      {/* Products grid */}
      {!loading && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 items-start">
          <AnimatePresence>
            {filtered.map((product, i) => {
              const meta = CATEGORY_META[product.category]
              return (
                <motion.div
                  key={product.id}
                  layout
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: i * 0.04 }}
                  className="card flex flex-col hover:shadow-card-hover transition-all duration-200"
                >
                  <div className="flex items-start justify-between mb-3">
                    <span className={meta?.color ?? 'badge-orange'}>{meta?.label ?? product.category}</span>
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

                  <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
                        {product.description && (
                          <div className="mb-3 text-xs text-gray-600 leading-relaxed bg-gray-50 p-3 rounded-md border border-gray-100 max-h-32 overflow-y-auto">
                            {product.description}
                          </div>
                        )}
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
                        <div className="flex gap-2 pt-2">
                          <button 
                            className="btn-primary flex-1 justify-center text-xs py-2"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSimulatingProduct(product);
                            }}
                          >
                            Simulate for my profile
                          </button>
                          <button className="btn-outline flex-none justify-center text-xs py-2 px-3">
                            <ExternalLink size={14} />
                          </button>
                        </div>
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <Search size={36} className="mx-auto mb-3 opacity-40" />
          <p className="font-medium">No products found</p>
          <p className="text-sm mt-1">Try a different search term or category</p>
        </div>
      )}

      {/* Simulation Modal */}
      <ProductSimulationModal 
        product={simulatingProduct}
        profile={profile}
        isOpen={!!simulatingProduct}
        onClose={() => setSimulatingProduct(null)}
      />
    </div>
  )
}
