import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { motion } from 'framer-motion'
import { useAppStore } from '../../store'
import { formatCurrency } from '../../lib/utils'
import { TrendingUp } from 'lucide-react'

export default function SimulationProjectionChart() {
  const { profile, yearlyProjections, isOffline } = useAppStore()

  if (!profile || yearlyProjections.length === 0 || isOffline) return null

  // Ensure data is sorted by year
  const data = [...yearlyProjections].sort((a, b) => a.year - b.year)
  const maxYear = data[data.length - 1]?.year || 0

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-100 shadow-xl rounded-xl z-50 relative">
          <p className="text-xs font-bold text-gray-800 mb-2">Age {payload[0].payload.age} (Year {label})</p>
          <div className="space-y-1">
            <p className="text-[11px] text-brand-orange flex justify-between gap-4">
              <span className="font-medium">Projected Corpus:</span>
              <span className="font-bold">{formatCurrency(payload[0].value)}</span>
            </p>
            <p className="text-[11px] text-brand-navy flex justify-between gap-4">
              <span className="font-medium">Total Invested:</span>
              <span className="font-bold">{formatCurrency(payload[1].value)}</span>
            </p>
          </div>
        </div>
      )
    }
    return null
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="card bg-white border border-gray-200 overflow-hidden relative mb-6"
    >
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="text-brand-orange" size={18} />
        <h2 className="text-lg font-display font-bold text-gray-900">Year-by-Year Wealth Projection</h2>
      </div>
      
      <p className="text-xs text-gray-500 mb-6">
        This chart tracks the growth of your investments over {maxYear} years, assuming you follow the recommended plan. The orange area represents your total projected wealth, while the blue line shows your cumulative invested amount.
      </p>

      <div className="h-72 w-full mt-4">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data}
            margin={{ top: 10, right: 10, left: 20, bottom: 0 }}
          >
            <defs>
              <linearGradient id="colorCorpus" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#F36F21" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#F36F21" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorInvested" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#003366" stopOpacity={0.1}/>
                <stop offset="95%" stopColor="#003366" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
            <XAxis 
              dataKey="year" 
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fill: '#9ca3af' }}
              tickFormatter={(value) => `Yr ${value}`}
            />
            <YAxis 
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fill: '#9ca3af' }}
              tickFormatter={(value) => `₹${(value / 100000).toFixed(0)}L`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area 
              type="monotone" 
              dataKey="projectedCorpus" 
              stroke="#F36F21" 
              strokeWidth={3}
              fillOpacity={1} 
              fill="url(#colorCorpus)" 
              name="Projected Corpus"
            />
            <Area 
              type="monotone" 
              dataKey="totalInvested" 
              stroke="#003366" 
              strokeWidth={2}
              fillOpacity={1} 
              fill="url(#colorInvested)" 
              name="Total Invested"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      
      {/* Legend below chart */}
      <div className="flex items-center justify-center gap-6 mt-4 pt-4 border-t border-gray-100">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-sm bg-brand-orange"></div>
          <span className="text-xs font-medium text-gray-700">Projected Corpus</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-sm bg-brand-navy"></div>
          <span className="text-xs font-medium text-gray-700">Total Invested</span>
        </div>
      </div>
    </motion.div>
  )
}
