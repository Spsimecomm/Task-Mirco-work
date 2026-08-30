import React, { useState } from 'react'

export default function TaskDonutChart({
  completed = 5,
  pending = 0,
  approved = 0,
  rejected = 0,
}) {
  const [timeframe, setTimeframe] = useState('This Month')

  // Total count
  const total = Math.max(1, completed + pending + approved + rejected)
  const actualTotal = completed + pending + approved + rejected

  // Segments definition
  const segments = [
    { key: 'completed', label: 'Completed', count: completed, color: '#22C55E' },
    { key: 'pending', label: 'Pending', count: pending, color: '#F59E0B' },
    { key: 'approved', label: 'Approved', count: approved, color: '#0366F1' },
    { key: 'rejected', label: 'Rejected', count: rejected, color: '#EF4444' },
  ]

  // SVG Donut Math
  const radius = 64
  const strokeWidth = 18
  const circumference = 2 * Math.PI * radius

  // Calculate stroke dash offsets
  let accumulatedPercent = 0
  const renderedArcs = segments.map((seg) => {
    const percent = actualTotal > 0 ? seg.count / actualTotal : (seg.key === 'completed' ? 1 : 0)
    const strokeDasharray = `${percent * circumference} ${circumference}`
    const strokeDashoffset = -accumulatedPercent * circumference
    accumulatedPercent += percent
    return { ...seg, percent, strokeDasharray, strokeDashoffset }
  })

  return (
    <div className="card rounded-2xl bg-white dark:bg-[#111827] border border-[#CBD5E1] dark:border-[#2A3348] p-5 sm:p-6 shadow-sm transition-all flex flex-col justify-between">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-display font-bold text-base sm:text-lg text-[#1E293B] dark:text-[#F1F5F9]">
          Task Summary
        </h3>
        <select
          value={timeframe}
          onChange={(e) => setTimeframe(e.target.value)}
          className="rounded-xl border border-[#CBD5E1] dark:border-[#2A3348] bg-[#F8FAFC] dark:bg-[#1F2937] px-3 py-1.5 text-xs font-semibold text-[#1E293B] dark:text-slate-200 outline-none cursor-pointer hover:border-slate-400 dark:hover:border-slate-500 transition"
        >
          <option value="This Month">This Month</option>
          <option value="All Time">All Time</option>
        </select>
      </div>

      {/* Donut Body + Legend */}
      <div className="mt-4 flex flex-col sm:flex-row items-center justify-around gap-6">
        {/* SVG Circular Donut Chart */}
        <div className="relative flex items-center justify-center shrink-0">
          <svg width="160" height="160" viewBox="0 0 160 160" className="-rotate-90">
            {/* Background Track */}
            <circle
              cx="80"
              cy="80"
              r={radius}
              fill="transparent"
              stroke="currentColor"
              className="text-slate-100 dark:text-[#1F2937]"
              strokeWidth={strokeWidth}
            />

            {/* Individual Segments */}
            {renderedArcs.map(
              (arc) =>
                arc.count > 0 && (
                  <circle
                    key={arc.key}
                    cx="80"
                    cy="80"
                    r={radius}
                    fill="transparent"
                    stroke={arc.color}
                    strokeWidth={strokeWidth}
                    strokeDasharray={arc.strokeDasharray}
                    strokeDashoffset={arc.strokeDashoffset}
                    strokeLinecap="round"
                    className="transition-all duration-500 ease-out"
                  />
                )
            )}
          </svg>

          {/* Center Text Indicator */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="font-display font-extrabold text-2xl text-[#1E293B] dark:text-[#F1F5F9] leading-tight">
              {String(actualTotal).padStart(2, '0')}
            </span>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B] dark:text-slate-400">
              Total
            </span>
          </div>
        </div>

        {/* Legend List */}
        <div className="w-full sm:w-auto space-y-2.5 min-w-[140px]">
          {segments.map((item) => {
            const pct = actualTotal > 0 ? Math.round((item.count / actualTotal) * 100) : 0
            return (
              <div key={item.key} className="flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="font-medium text-[#64748B] dark:text-slate-300">
                    {item.label}
                  </span>
                </div>
                <div className="font-bold text-[#1E293B] dark:text-[#F1F5F9] font-mono">
                  {String(item.count).padStart(2, '0')}{' '}
                  <span className="text-[11px] font-normal text-[#64748B] dark:text-slate-400">
                    ({pct}%)
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
