import React, { useState } from 'react'

export default function TopCategories({ categories = [] }) {
  const [timeframe, setTimeframe] = useState('This Month')

  const defaultCats = [
    { name: 'Social Media', amount: 7.50, percent: 50, color: 'bg-indigo-500' },
    { name: 'Video Watching', amount: 4.50, percent: 30, color: 'bg-blue-500' },
    { name: 'Sign Up', amount: 2.25, percent: 15, color: 'bg-emerald-500' },
    { name: 'Data Entry', amount: 0.75, percent: 5, color: 'bg-amber-500' },
  ]

  const items = categories.length > 0 ? categories : defaultCats

  return (
    <div className="card rounded-2xl bg-white dark:bg-[#111827] border border-[#CBD5E1] dark:border-[#2A3348] p-5 sm:p-6 shadow-sm transition-all">
      <div className="flex items-center justify-between gap-3 mb-4">
        <h3 className="font-display font-bold text-base text-[#1E293B] dark:text-[#F1F5F9] truncate">
          Top Categories
        </h3>
        <select
          value={timeframe}
          onChange={(e) => setTimeframe(e.target.value)}
          className="rounded-xl border border-[#CBD5E1] dark:border-[#2A3348] bg-[#F8FAFC] dark:bg-[#1F2937] px-2.5 py-1 text-xs font-semibold text-[#1E293B] dark:text-slate-200 outline-none cursor-pointer"
        >
          <option value="This Month">This Month</option>
          <option value="All Time">All Time</option>
        </select>
      </div>

      <div className="space-y-3.5">
        {items.map((cat) => (
          <div key={cat.name} className="space-y-1.5">
            <div className="flex items-center justify-between text-xs gap-2">
              <span className="font-medium text-[#1E293B] dark:text-[#F1F5F9] truncate">{cat.name}</span>
              <span className="font-bold text-[#64748B] dark:text-slate-300 font-mono shrink-0">
                ${Number(cat.amount).toFixed(2)}{' '}
                <span className="text-[11px] font-normal text-slate-400">({cat.percent}%)</span>
              </span>
            </div>
            <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-[#1F2937] overflow-hidden">
              <div
                className={`h-full rounded-full ${cat.color} transition-all duration-500`}
                style={{ width: `${Math.min(100, Math.max(5, cat.percent))}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
