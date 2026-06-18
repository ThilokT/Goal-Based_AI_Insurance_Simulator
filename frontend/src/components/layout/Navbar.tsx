import { useState } from 'react'
import { motion } from 'framer-motion'
import { Bell, Sun, Moon, Menu, LogOut, ChevronDown } from 'lucide-react'
import { useAppStore } from '../../store'
import { cn } from '../../lib/utils'
import ProfileModal from '../profile/ProfileModal'

export default function Navbar() {
  const { user, profile, logout, darkMode, toggleDarkMode, setSidebarOpen, sidebarOpen } = useAppStore()
  const [showProfileModal, setShowProfileModal] = useState(false)

  return (
    <motion.header
      initial={{ y: -64 }}
      animate={{ y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="fixed top-0 left-0 right-0 z-40 h-16 bg-white border-b border-gray-100 shadow-sm"
    >
      <div className="h-full flex items-center justify-between px-4 gap-4">
        {/* Left */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors lg:hidden"
          >
            <Menu size={20} className="text-gray-600" />
          </button>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 gradient-orange rounded-lg flex items-center justify-center shadow-orange">
              <span className="text-white font-display font-bold text-sm">LM</span>
            </div>
            <div className="hidden sm:block">
              <p className="font-display font-bold text-brand-navy text-sm leading-tight">LifeMap</p>
              <p className="text-[10px] text-gray-400 leading-tight">by ICICI Prudential</p>
            </div>
          </div>
        </div>

        {/* Center badge */}
        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-brand-cream rounded-full border border-brand-orange/20">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
          <span className="text-xs font-medium text-brand-navy">Goal-Based Insurance Simulator</span>
        </div>

        {/* Right */}
        <div className="flex items-center gap-2">
          <button
            onClick={toggleDarkMode}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-500"
          >
            {darkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <button className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-500 relative">
            <Bell size={18} />
            <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-brand-orange rounded-full" />
          </button>

          {user && (
            <div className="flex items-center gap-2 ml-1 pl-3 border-l border-gray-200">
              <button 
                onClick={() => setShowProfileModal(true)}
                title="Edit Profile"
                className="w-8 h-8 rounded-full gradient-orange flex items-center justify-center shadow-sm hover:ring-2 hover:ring-brand-orange/50 transition-all cursor-pointer"
              >
                <span className="text-white text-xs font-bold">{profile?.name ? profile.name.charAt(0).toUpperCase() : user.avatarInitials}</span>
              </button>
              <div className="hidden sm:block">
                <p className="text-xs font-semibold text-gray-800 leading-tight">{profile?.name || user.name}</p>
                <p className="text-[10px] text-gray-400 leading-tight">{user.email}</p>
              </div>
              <button
                onClick={() => logout()}
                className="p-1.5 rounded-lg hover:bg-red-50 hover:text-red-500 transition-colors text-gray-400 ml-1"
                title="Sign out"
              >
                <LogOut size={15} />
              </button>
            </div>
          )}
        </div>
      </div>
      <ProfileModal isOpen={showProfileModal} onClose={() => setShowProfileModal(false)} />
    </motion.header>
  )
}
