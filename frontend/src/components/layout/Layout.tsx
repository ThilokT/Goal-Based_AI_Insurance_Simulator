import { useEffect } from 'react'
import { motion } from 'framer-motion'
import Navbar from './Navbar'
import Sidebar from './Sidebar'
import { useAppStore } from '../../store'
import { cn } from '../../lib/utils'

interface LayoutProps { children: React.ReactNode }

export default function Layout({ children }: LayoutProps) {
  const { darkMode } = useAppStore()

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode)
  }, [darkMode])

  return (
    <div className={cn('min-h-screen bg-surface-subtle', darkMode && 'dark bg-gray-900')}>
      <Navbar />
      <Sidebar />
      <motion.main
        key="main"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="pt-16 lg:pl-60 min-h-screen"
      >
        <div className="p-4 sm:p-6 max-w-7xl mx-auto">
          {children}
        </div>
      </motion.main>
    </div>
  )
}
