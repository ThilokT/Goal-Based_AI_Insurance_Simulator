import { useEffect, useRef } from 'react'
import * as d3 from 'd3'
import { motion } from 'framer-motion'
import { useAppStore } from '../../store'
import { formatCurrency } from '../../lib/utils'
import { runSimulation } from '../../mocks/simulation'
import { api } from '../../lib/apiClient'
import type { SimulateRequest, BackendSimulateResponse } from '../../types/api'
import { mapBackendSimulation } from '../../types/api'
import { CATEGORY_META } from '../../mocks/products'
import type { SimulationResult } from '../../types'
import FiveYearSnapshot from '../simulation/FiveYearSnapshot'

const CATEGORY_COLORS: Record<string, string> = {
  protection:          '#F36F21',
  ulip:                '#003366',
  participating:       '#C9A84C',
  'non-participating': '#22C55E',
  annuity:             '#9333EA',
}

function Legend() {
  return (
    <div className="flex flex-wrap gap-4 mb-4">
      {Object.entries(CATEGORY_META).map(([cat, meta]) => (
        <div key={cat} className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full" style={{ background: CATEGORY_COLORS[cat] }} />
          <span className="text-xs text-gray-500">{meta.label}</span>
        </div>
      ))}
      <div className="flex items-center gap-1.5">
        <div className="w-3 h-3 rounded-full bg-gray-200" />
        <span className="text-xs text-gray-500">Coverage gap</span>
      </div>
    </div>
  )
}

export default function LifeJourneyTimeline() {
  const svgRef = useRef<SVGSVGElement>(null)
  const { profile, goals, whatIfParams, setSimulationResults, simulationResults } = useAppStore()

  const currentAge = profile?.age ?? 30
  const maxAge = 80

  useEffect(() => {
    if (!profile || goals.length === 0) return

    // Try backend simulation API first, fall back to local mock
    async function runSim() {
      try {
        const payload: SimulateRequest = {
          age: profile!.age,
          annual_income: profile!.income * 12,
          dependents: profile!.familySize,
          risk_appetite: profile!.riskAppetite,
          goals: goals.map(g => ({
            goal_type: g.label,
            target_amount: g.corpusNeeded,
            target_year: g.targetAge,
            priority: 1,
          })),
        }
        const res = await api.post<BackendSimulateResponse>('/api/simulate', payload)
        const mapped: SimulationResult[] = res.goals.map(goalResult => {
          const result = mapBackendSimulation(goalResult)
          const localGoal = goals.find(g => g.label === goalResult.goal_type)
          if (localGoal) result.goalId = localGoal.id
          return result
        })
        setSimulationResults(mapped)
      } catch {
        // Backend unavailable — fall back to local simulation
        console.warn('Timeline: Simulation API unavailable, using local calculation')
        const results = runSimulation(profile!, whatIfParams, goals)
        setSimulationResults(results)
      }
    }
    runSim()
  }, [profile, whatIfParams, goals])

  useEffect(() => {
    if (!svgRef.current || !simulationResults.length) return
    drawTimeline()
  }, [simulationResults, currentAge])

  function drawTimeline() {
    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()

    const container = svgRef.current!.parentElement!
    const W = container.clientWidth
    const H = 340
    const margin = { top: 40, right: 30, bottom: 60, left: 50 }
    const innerW = W - margin.left - margin.right
    const innerH = H - margin.top - margin.bottom

    svg.attr('width', W).attr('height', H)

    const root = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`)

    // X scale: age axis
    const x = d3.scaleLinear().domain([currentAge, maxAge]).range([0, innerW])

    // Y scale for corpus bars
    const maxCorpus = d3.max(simulationResults, d => d.corpusNeeded) ?? 10_000_000
    const y = d3.scaleLinear().domain([0, maxCorpus * 1.2]).range([innerH, 0])

    // Gridlines
    root.append('g')
      .attr('class', 'grid')
      .call(
        d3.axisLeft(y).ticks(5).tickSize(-innerW).tickFormat(() => '')
      )
      .selectAll('line')
      .attr('stroke', '#F3F4F6')
      .attr('stroke-dasharray', '4,4')
    root.select('.grid .domain').remove()

    // Timeline baseline
    root.append('line')
      .attr('x1', 0).attr('y1', innerH)
      .attr('x2', innerW).attr('y2', innerH)
      .attr('stroke', '#E5E7EB').attr('stroke-width', 2)

    // Today marker
    root.append('line')
      .attr('x1', 0).attr('y1', 0)
      .attr('x2', 0).attr('y2', innerH)
      .attr('stroke', '#F36F21').attr('stroke-width', 2).attr('stroke-dasharray', '5,3')
    root.append('text')
      .attr('x', 4).attr('y', -6)
      .text('Today')
      .attr('fill', '#F36F21').attr('font-size', '11px').attr('font-weight', '600')

    // X axis
    root.append('g')
      .attr('transform', `translate(0,${innerH})`)
      .call(d3.axisBottom(x).ticks(maxAge - currentAge > 30 ? 10 : 5).tickFormat(d => `Age ${d}`))
      .selectAll('text')
      .attr('fill', '#9CA3AF').attr('font-size', '11px')
    root.select('.domain').attr('stroke', '#E5E7EB')

    // Y axis
    root.append('g')
      .call(d3.axisLeft(y).ticks(5).tickFormat(d => formatCurrency(+d)))
      .selectAll('text')
      .attr('fill', '#9CA3AF').attr('font-size', '10px')

    // Draw goals
    const goalAge = (goalId: string) => {
      const g = goals.find(g => g.id === goalId)
      return g ? g.targetAge : currentAge + 10
    }

    simulationResults.forEach((result, i) => {
      const gAge = goalAge(result.goalId)
      const gX = x(gAge)
      const barW = Math.max(innerW / (simulationResults.length * 3), 24)
      const bX = gX - barW / 2

      const primaryCat = result.recommendedProducts[0] as string
      const fillColor = CATEGORY_COLORS[primaryCat] ?? '#003366'

      // Gap bar (background)
      const gapHeight = y(0) - y(result.corpusNeeded)
      root.append('rect')
        .attr('x', bX).attr('y', y(result.corpusNeeded))
        .attr('width', barW).attr('height', gapHeight)
        .attr('fill', '#F3F4F6').attr('rx', 4)

      // Covered bar (animated)
      const coveredHeight = y(0) - y(result.coveredAmount)
      root.append('rect')
        .attr('x', bX).attr('y', y(result.coveredAmount))
        .attr('width', barW).attr('height', 0)
        .attr('fill', fillColor).attr('rx', 4).attr('opacity', 0.85)
        .transition().duration(800).delay(i * 120)
        .attr('y', y(result.coveredAmount))
        .attr('height', coveredHeight)

      // Milestone dot
      root.append('circle')
        .attr('cx', gX).attr('cy', innerH)
        .attr('r', 6).attr('fill', fillColor).attr('stroke', 'white').attr('stroke-width', 2)

      // Goal label
      const label = goals.find(g => g.id === result.goalId)?.label ?? result.goalId
      root.append('text')
        .attr('x', gX).attr('y', innerH + 18)
        .attr('text-anchor', 'middle')
        .attr('fill', '#6B7280').attr('font-size', '10px')
        .text(label.length > 14 ? label.slice(0, 13) + '…' : label)

      // Age label
      root.append('text')
        .attr('x', gX).attr('y', innerH + 30)
        .attr('text-anchor', 'middle')
        .attr('fill', fillColor).attr('font-size', '9px').attr('font-weight', '600')
        .text(`Age ${gAge}`)

      // Corpus label above bar
      root.append('text')
        .attr('x', gX).attr('y', y(result.corpusNeeded) - 6)
        .attr('text-anchor', 'middle')
        .attr('fill', '#374151').attr('font-size', '9px').attr('font-weight', '700')
        .text(formatCurrency(result.corpusNeeded))

      // Shield badge for product categories
      result.recommendedProducts.slice(0, 2).forEach((cat, ci) => {
        const badgeX = bX + barW + 4 + ci * 14
        root.append('circle')
          .attr('cx', badgeX).attr('cy', y(result.coveredAmount) + 10)
          .attr('r', 5).attr('fill', CATEGORY_COLORS[cat] ?? '#ccc')
          .append('title').text(CATEGORY_META[cat]?.label ?? cat)
      })
    })

    // Retirement line
    if (profile) {
      const retX = x(whatIfParams.retirementAge)
      root.append('line')
        .attr('x1', retX).attr('y1', 0)
        .attr('x2', retX).attr('y2', innerH)
        .attr('stroke', '#9333EA').attr('stroke-width', 1.5).attr('stroke-dasharray', '6,3')
      root.append('text')
        .attr('x', retX + 4).attr('y', 14)
        .text(`Retire ${whatIfParams.retirementAge}`)
        .attr('fill', '#9333EA').attr('font-size', '10px').attr('font-weight', '600')
    }
  }

  if (!profile) {
    return (
      <div className="card flex flex-col items-center justify-center py-20 text-center">
        <div className="w-14 h-14 gradient-orange rounded-2xl flex items-center justify-center mb-4 shadow-orange">
          <span className="text-white text-2xl">📍</span>
        </div>
        <h3 className="font-display font-semibold text-gray-900 mb-2">Your Life Journey starts with a conversation</h3>
        <p className="text-sm text-gray-500 max-w-xs">Complete the AI chat or the onboarding wizard to generate your personalised timeline.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <FiveYearSnapshot />
      
      <div className="card">
        <div className="flex items-start justify-between mb-2">
          <div>
            <h2 className="font-display font-bold text-gray-900 text-lg">Life Journey Timeline</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {profile.name} · Age {currentAge} → 80 · {goals.length} milestones mapped
            </p>
          </div>
          <div className="badge-orange text-xs">Live simulation</div>
        </div>
        <Legend />
        <div className="overflow-x-auto">
          <svg ref={svgRef} className="w-full" />
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {simulationResults.map(result => {
          const goal = goals.find(g => g.id === result.goalId)
          const cat = result.recommendedProducts[0] as string
          const coverPct = Math.round((result.coveredAmount / result.corpusNeeded) * 100)
          return (
            <motion.div
              key={result.goalId}
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              className="card p-4"
            >
              <div className="w-2 h-2 rounded-full mb-2" style={{ background: CATEGORY_COLORS[cat] ?? '#ccc' }} />
              <p className="text-[11px] font-semibold text-gray-700 leading-tight mb-2">{goal?.label}</p>
              <p className="text-lg font-display font-bold" style={{ color: CATEGORY_COLORS[cat] }}>
                {coverPct}%
              </p>
              <p className="text-[10px] text-gray-400">covered</p>
              <div className="w-full bg-gray-100 rounded-full h-1 mt-2">
                <div className="h-1 rounded-full transition-all" style={{ width: `${coverPct}%`, background: CATEGORY_COLORS[cat] }} />
              </div>
              <p className="text-[10px] text-gray-500 mt-2">
                Gap: <span className="font-semibold text-red-500">{formatCurrency(result.gap)}</span>
              </p>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
