import React from 'react'
import { Link } from 'react-router-dom'
import { Users, Tag } from 'lucide-react'

const categoryColors = {
  'Social Media': 'bg-signal-indigo/10 text-signal-indigo',
  'Sign Up': 'bg-mint-500/10 text-mint-400',
  'Video Watching': 'bg-signal-rose/10 text-signal-rose',
  'Data Entry': 'bg-signal-amber/10 text-signal-amber',
}

export default function TaskCard({ task }) {
  const slotsLeft = task.slots_total - task.slots_filled
  return (
    <Link
      to={`/task/${task.id}`}
      className="card p-5 flex flex-col gap-3 hover:border-mint-500/40 transition group"
    >
      <div className="flex items-start justify-between gap-2">
        <span className={`badge ${categoryColors[task.category] || 'bg-base-700 text-slate-300'}`}>
          <Tag size={11} />
          {task.category}
        </span>
        <span className="text-lg font-display font-bold text-mint-400 whitespace-nowrap">
          ${Number(task.reward).toFixed(2)}
        </span>
      </div>
      <h3 className="font-semibold text-white leading-snug group-hover:text-mint-400 transition line-clamp-2">
        {task.title}
      </h3>
      <p className="text-sm text-slate-400 line-clamp-2">{task.description}</p>
      <div className="mt-1 flex items-center justify-between text-xs text-slate-500">
        <span className="flex items-center gap-1.5">
          <Users size={13} />
          {slotsLeft > 0 ? `${slotsLeft} spots left` : 'Full'}
        </span>
        <span className="text-slate-600">{new Date(task.created_at).toLocaleDateString()}</span>
      </div>
    </Link>
  )
}
