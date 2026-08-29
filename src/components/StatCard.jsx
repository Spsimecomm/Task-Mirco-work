import React from 'react'

const tones = {
  mint: 'text-[#166534] dark:text-mint-400 bg-[#DCFCE7] dark:bg-mint-500/10 border border-[#BBF7D0] dark:border-transparent',
  indigo: 'text-[#3730A3] dark:text-indigo-400 bg-[#EEF2FF] dark:bg-indigo-500/10 border border-[#C7D2FE] dark:border-transparent',
  amber: 'text-[#92400E] dark:text-amber-400 bg-[#FEF3C7] dark:bg-amber-500/10 border border-[#FDE68A] dark:border-transparent',
  rose: 'text-[#9F1239] dark:text-rose-400 bg-[#FFE4E6] dark:bg-rose-500/10 border border-[#FECDD3] dark:border-transparent',
}

export default function StatCard({ icon: Icon, label, value, tone = 'mint', hint }) {
  return (
    <div className="card p-5 sm:p-6 flex items-start justify-between rounded-xl bg-white dark:bg-[#1E293B] border border-[#CBD5E1] dark:border-white/10 shadow-sm hover:border-slate-400 dark:hover:border-white/20 hover:-translate-y-0.5 hover:shadow-md transition-all duration-200">
      <div>
        <p className="text-xs uppercase tracking-wider text-[#64748B] dark:text-slate-400 font-bold">{label}</p>
        <p className="mt-2 text-2xl sm:text-3xl font-display font-extrabold text-[#1E293B] dark:text-[#F1F5F9] tracking-tight">{value}</p>
        {hint && <p className="mt-1 text-xs font-medium text-[#64748B] dark:text-slate-400">{hint}</p>}
      </div>
      <div className={`flex h-11 w-11 items-center justify-center rounded-xl shrink-0 ${tones[tone]}`}>
        <Icon size={20} />
      </div>
    </div>
  )
}
