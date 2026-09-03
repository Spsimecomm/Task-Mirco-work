import React, { useState } from 'react'

export default function EarningsLineChart({ totalEarnings = 15.00, history = [] }) {
  const [timeframe, setTimeframe] = useState('This Month')
  const [hoveredPoint, setHoveredPoint] = useState(null)

  // Standard sample timeline data points if history is sparse
  const samplePoints = [
    { label: 'Aug 01', amount: 0 },
    { label: 'Aug 06', amount: 3.50 },
    { label: 'Aug 11', amount: 6.20 },
    { label: 'Aug 16', amount: 9.80 },
    { label: 'Aug 21', amount: 13.50 },
    { label: 'Aug 26', amount: 14.20 },
    { label: 'Aug 31', amount: Number(totalEarnings) || 15.00 },
  ]

  const points = history.length >= 4 ? history : samplePoints
  const maxVal = Math.max(20, Math.ceil((Number(totalEarnings) || 15) * 1.3))
  const minVal = 0

  // SVG dimensions
  const width = 600
  const height = 200
  const padX = 45
  const padY = 30
  const chartW = width - padX * 2
  const chartH = height - padY * 2

  // Compute SVG coordinates
  const coords = points.map((pt, idx) => {
    const x = padX + (idx / (points.length - 1)) * chartW
    const y = height - padY - ((pt.amount - minVal) / (maxVal - minVal)) * chartH
    return { ...pt, x, y }
  })

  // Smooth bezier curve path
  const createSmoothPath = (pts) => {
    if (pts.length === 0) return ''
    let path = `M ${pts[0].x} ${pts[0].y}`
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i === 0 ? 0 : i - 1]
      const p1 = pts[i]
      const p2 = pts[i + 1]
      const p3 = pts[i + 2] || p2
      const cp1x = p1.x + (p2.x - p0.x) / 6
      const cp1y = p1.y + (p2.y - p0.y) / 6
      const cp2x = p2.x - (p3.x - p1.x) / 6
      const cp2y = p2.y - (p3.y - p1.y) / 6
      path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`
    }
    return path
  }

  const linePath = createSmoothPath(coords)
  const areaPath = `${linePath} L ${coords[coords.length - 1].x} ${height - padY} L ${coords[0].x} ${height - padY} Z`

  return (
    <div className="card rounded-2xl bg-white dark:bg-[#111827] border border-[#CBD5E1] dark:border-[#2A3348] p-5 sm:p-6 shadow-sm transition-all">
      {/* Header with Title & Period Selector */}
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-display font-bold text-base sm:text-lg text-[#1E293B] dark:text-[#F1F5F9] truncate">
            Earnings Overview
          </h3>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-display font-extrabold text-[#1E293B] dark:text-white tracking-tight">
              ${Number(totalEarnings).toFixed(2)}
            </span>
            <span className="text-xs text-[#64748B] dark:text-slate-400 font-medium">Total Earnings</span>
          </div>
        </div>

        <div className="relative">
          <select
            value={timeframe}
            onChange={(e) => setTimeframe(e.target.value)}
            className="rounded-xl border border-[#CBD5E1] dark:border-[#2A3348] bg-[#F8FAFC] dark:bg-[#1F2937] px-3 py-1.5 text-xs font-semibold text-[#1E293B] dark:text-slate-200 outline-none cursor-pointer hover:border-slate-400 dark:hover:border-slate-500 transition"
          >
            <option value="This Month">This Month</option>
            <option value="Last Month">Last Month</option>
            <option value="All Time">All Time</option>
          </select>
        </div>
      </div>

      {/* Interactive SVG Chart Canvas */}
      <div className="relative mt-4 w-full overflow-hidden">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-48 sm:h-56 overflow-visible">
          <defs>
            {/* Emerald Gradient Glow */}
            <linearGradient id="earningsGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#22C55E" stopOpacity="0.28" />
              <stop offset="90%" stopColor="#22C55E" stopOpacity="0.0" />
            </linearGradient>
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Horizontal Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => {
            const y = height - padY - pct * chartH
            const labelVal = Math.round(minVal + pct * (maxVal - minVal))
            return (
              <g key={i}>
                <line
                  x1={padX}
                  y1={y}
                  x2={width - padX}
                  y2={y}
                  stroke="currentColor"
                  strokeDasharray="3 3"
                  className="text-slate-200 dark:text-[#2A3348]/70"
                  strokeWidth="1"
                />
                <text
                  x={padX - 8}
                  y={y + 4}
                  textAnchor="end"
                  className="text-[10px] fill-slate-400 dark:fill-slate-500 font-medium"
                >
                  ${labelVal}
                </text>
              </g>
            )
          })}

          {/* Area Fill */}
          <path d={areaPath} fill="url(#earningsGradient)" />

          {/* Main Line */}
          <path
            d={linePath}
            fill="none"
            stroke="#22C55E"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="transition-all duration-300"
          />

          {/* Data Points with Hover Interaction */}
          {coords.map((pt, idx) => {
            const isHovered = hoveredPoint === idx
            return (
              <g
                key={idx}
                className="cursor-pointer group"
                onMouseEnter={() => setHoveredPoint(idx)}
                onMouseLeave={() => setHoveredPoint(null)}
              >
                {/* Invisible hit area */}
                <circle cx={pt.x} cy={pt.y} r="12" fill="transparent" />

                {/* Outer halo */}
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r={isHovered ? '7' : '4'}
                  fill="#22C55E"
                  className="transition-all duration-200"
                />
                {/* Center dot */}
                <circle cx={pt.x} cy={pt.y} r="2.5" fill="#FFFFFF" />

                {/* X-axis date labels */}
                <text
                  x={pt.x}
                  y={height - 6}
                  textAnchor="middle"
                  className={`text-[10px] transition-colors ${
                    isHovered
                      ? 'fill-emerald-600 dark:fill-brand-primary font-bold'
                      : 'fill-slate-400 dark:fill-slate-500'
                  }`}
                >
                  {pt.label}
                </text>
              </g>
            )
          })}
        </svg>

        {/* Floating Tooltip */}
        {hoveredPoint !== null && coords[hoveredPoint] && (
          <div
            className="absolute pointer-events-none -translate-x-1/2 -translate-y-full rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 px-2.5 py-1.5 text-xs font-bold shadow-xl transition-all duration-150 z-20"
            style={{
              left: `${(coords[hoveredPoint].x / width) * 100}%`,
              top: `${(coords[hoveredPoint].y / height) * 100}%`,
              marginTop: '-8px',
            }}
          >
            <div className="text-[10px] font-normal text-slate-300 dark:text-slate-600">
              {coords[hoveredPoint].label}
            </div>
            <div className="text-emerald-400 dark:text-emerald-600">
              ${Number(coords[hoveredPoint].amount).toFixed(2)}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
