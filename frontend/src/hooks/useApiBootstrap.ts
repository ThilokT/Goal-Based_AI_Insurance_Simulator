import { useEffect } from 'react'
import { useAppStore } from '../store'
import { fetchProducts, loadUserProfile } from '../lib/api'

export function useApiBootstrap() {
  const {
    user,
    accessToken,
    profile,
    products,
    setProfile,
    setProducts,
    setProductsLoading,
  } = useAppStore()

  useEffect(() => {
    if (!user || !accessToken) return

    if (!profile) {
      loadUserProfile().then(loaded => {
        if (loaded) setProfile(loaded)
      })
    }

    if (products.length === 0) {
      setProductsLoading(true)
      fetchProducts()
        .then(setProducts)
        .catch(() => setProducts([]))
        .finally(() => setProductsLoading(false))
    }
  }, [user, accessToken])
}
