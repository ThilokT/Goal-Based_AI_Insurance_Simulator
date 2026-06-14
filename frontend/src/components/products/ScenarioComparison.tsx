import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeftRight, TrendingUp, TrendingDown, Loader2, WifiOff } from 'lucide-react'
import { MOCK_PRODUCTS } from '../../mocks/products'
import { api } from '../../lib/apiClient'
import type { BackendProductListResponse } from '../../types/api'
import { mapBackendProduct } from '../../types/api'
import ProductCard from './ProductCard'
import { formatCurrency } from '../../lib/utils'
import { useAppStore } from '../../store'
import { cn } from '../../lib/utils'
import type { Product } from '../../types'

export default function ScenarioComparison() {
  const { simulationResults, goals, whatIfParams } = useAppStore()
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [products, setProducts] = useState<Product[]>(MOCK_PRODUCTS)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function loadProducts() {
      setLoading(true)
      try {
        const res = await api.get<BackendProductListResponse>('/api/products')
        if (!cancelled) {
          const mapped = res.products.map(mapBackendProduct)
          setProducts(mapped.length > 0 ? mapped : MOCK_PRODUCTS)
        }
      } catch {
        if (!cancelled) setProducts(MOCK_PRODUCTS)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    loadProducts()
    return () => { cancelled = true }
  }, [])

  function toggleProduct(id: string) {
    setSelectedIds(prev =>
      prev.includes(id)
        ? prev.filter(p => p !== id)
        : prev.length < 2 ? [...prev, id] : [prev[1], id]
    )
  }

  const selectedProducts = selectedIds.map(id => products.find(p => p.id === id)!).filter(Boolean)

  const metrics = [
    { label: 'Min. Premium', key: (p: typeof selectedProducts[0]) => formatCurrency(p.minPremium) + '/yr' },
    { label: 'Max Cover', key: (p: typeof selectedProducts[0]) => p.coverageUpTo > 0 ? formatCurrency(p.coverageUpTo) : 'Lifetime income' },
    { label: 'Tenure', key: (p: typeof selectedProducts[0]) => p.tenure },
    { label: 'Return Type', key: (p: typeof selectedProducts[0]) => p.returnType.replace('-', ' ') },
    { label: 'Benefits', key: (p: typeof selectedProducts[0]) => `${p.keyBenefits.length} key benefits` },
    { label: 'Ideal for', key: (p: typeof selectedProducts[0]) => p.idealFor.slice(0, 2).join(', ') },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={28} className="animate-spin text-brand-orange" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-display font-bold text-gray-900">Compare Products</h2>
        <p className="text-sm text-gray-500 mt-1">Select any 2 products to compare them side-by-side</p>
      </div>

      {/* Selection */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {products.map((p, i) => (
          <ProductCard
            key={p.id}
            product={p}
            compareMode
            selected={selectedIds.includes(p.id)}
            onSelect={() => toggleProduct(p.id)}
            delay={i * 0.04}
          />
        ))}
      </div>

      {/* Comparison table */}
      {selectedProducts.length === 2 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="card overflow-hidden"
        >
          <div className="flex items-center gap-2 mb-4">
            <ArrowLeftRight size={16} className="text-brand-orange" />
            <h3 className="font-display font-semibold text-gray-900">Side-by-Side Comparison</h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-3 pr-4 text-xs text-gray-400 font-medium w-32">Metric</th>
                  {selectedProducts.map(p => (
                    <th key={p.id} className="text-left py-3 px-4 text-xs font-semibold text-brand-navy">
                      <div className="max-w-[180px]">{p.name}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {metrics.map(({ label, key }) => (
                  <tr key={label} className="border-b border-gray-50 hover:bg-gray-50/50">
                    <td className="py-3 pr-4 text-xs text-gray-500 font-medium">{label}</td>
                    {selectedProducts.map(p => (
                      <td key={p.id} className="py-3 px-4 text-xs text-gray-800 font-medium capitalize">
                        {key(p)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 pt-4 border-t border-gray-100 flex gap-3">
            {selectedProducts.map(p => (
              <button key={p.id} className="btn-primary flex-1 justify-center text-xs py-2">
                Select {p.name.split(' ').slice(-1)[0]}
              </button>
            ))}
          </div>
        </motion.div>
      )}

      {selectedProducts.length < 2 && (
        <div className="text-center py-8 text-gray-400 text-sm">
          Select {2 - selectedProducts.length} more product{2 - selectedProducts.length !== 1 ? 's' : ''} to compare
        </div>
      )}
    </div>
  )
}
