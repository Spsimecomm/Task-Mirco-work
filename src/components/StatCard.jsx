import React from 'react'

const tones = {
  green: 'text-emerald-600 dark:text-brand-primary bg-emerald-500/10 dark:bg-brand-primary/10 border border-emerald-500/20 dark:border-brand-primary/20',
  blue: 'text-blue-600 dark:text-blue-400 bg-blue-500/10 dark:bg-blue-500/10 border border-blue-500/20 dark:border-blue-500/20',
  amber: 'text-amber-600 dark:text-amber-400 bg-amber-500/10 dark:bg-amber-500/10 border border-amber-500/20 dark:border-amber-500/20',
  purple: 'text-purple-600 dark:text-purple-400 bg-purple-500/10 dark:bg-purple-500/10 border border-purple-500/20 dark:border-purple-500/20',
  rose: 'text-rose-600 dark:text-rose-400 bg-rose-500/10 dark:bg-rose-500/10 border border-rose-500/20 dark:border-rose-500/20',
  // Backward compatibility aliases
  mint: 'text-emerald-600 dark:text-brand-primary bg-emerald-500/10 dark:bg-brand-primary/10 border border-emerald-500/20 dark:border-brand-primary/20',
  indigo: 'text-purple-600 dark:text-purple-400 bg-purple-500/10 dark:bg-purple-500/10 border border-purple-500/20 dark:border-purple-500/20',
}

export default function StatCard({ icon: Icon, label, value, tone = 'green', hint }) {
  return (
    <div className="card p-5 sm:p-6 flex items-start justify-between gap-3 rounded-2xl bg-white dark:bg-[#111827] border border-[#CBD5E1] dark:border-[#2A3348] shadow-sm hover:border-brand-primary/50 dark:hover:border-[#2A3348] hover:-translate-y-0.5 hover:shadow-md transition-all duration-200">
      <div className="min-w-0">
        <p className="text-[11px] uppercase tracking-wider text-[#64748B] dark:text-slate-400 font-bold truncate">
          {label}
        </p>
        <p className="mt-1.5 text-2xl sm:text-3xl font-display font-extrabold text-[#1E293B] dark:text-[#F1F5F9] tracking-tight break-words">
          {value}
        </p>
        {hint && (
          <p className="mt-1 text-xs font-normal text-[#64748B] dark:text-slate-400 break-words">
            {hint}
          </p>
        )}
      </div>
      <div className={`flex h-11 w-11 items-center justify-center rounded-xl shrink-0 ${tones[tone] || tones.green}`}>
        <Icon size={20} />
      </div>
    </div>
  )
}

