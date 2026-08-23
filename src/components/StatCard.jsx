import React from 'react'

const tones = {
  mint: 'text-mint-400 bg-mint-500/10',
  indigo: 'text-signal-indigo bg-signal-indigo/10',
  amber: 'text-signal-amber bg-signal-amber/10',
  rose: 'text-signal-rose bg-signal-rose/10',
}

export default function StatCard({ icon: Icon, label, value, tone = 'mint', hint }) {
  return (
    <div className="card p-5 flex items-start justify-between">
      <div>
        <p className="text-xs uppercase tracking-wide text-slate-500 font-medium">{label}</p>
        <p className="mt-2 text-2xl font-display font-bold text-white">{value}</p>
        {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
      </div>
      <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${tones[tone]}`}>
        <Icon size={18} />
      </div>
    </div>
  )
}
