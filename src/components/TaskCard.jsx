import React from 'react'
import { Link } from 'react-router-dom'
import {
  Users,
  Calendar,
  Share2,
  UserPlus,
  PlayCircle,
  FileSpreadsheet,
  Tag
} from 'lucide-react'

const categoryConfig = {
  'Social Media': {
    icon: Share2,
    badge: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
  },
  'Sign Up': {
    icon: UserPlus,
    badge: 'bg-emerald-500/10 text-emerald-600 dark:text-brand-primary border-emerald-500/20',
  },
  'Video Watching': {
    icon: PlayCircle,
    badge: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
  },
  'Data Entry': {
    icon: FileSpreadsheet,
    badge: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
  },
}

export default function TaskCard({ task }) {
  const slotsLeft = task.slots_total - task.slots_filled
  const config = categoryConfig[task.category] || {
    icon: Tag,
    badge: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20',
  }
  const CategoryIcon = config.icon

  // Clean description string
  const cleanDescription = (task.description || '')
    .replace(/^[🔹🔸👉🎯📌🚀⭐✨➡️⚡📝💡✔️•\-*]+\s*/gm, '')
    .trim()

  return (
    <Link
      to={`/task/${task.id}`}
      className="card group flex flex-col justify-between rounded-2xl bg-white dark:bg-[#111827] border border-[#CBD5E1] dark:border-[#2A3348] p-5 sm:p-6 shadow-sm hover:border-brand-primary dark:hover:border-brand-primary/60 hover:-translate-y-1 hover:shadow-lg transition-all duration-200"
    >
      <div className="space-y-3.5">
        {/* Top: Category Badge & Reward */}
        <div className="flex items-center justify-between gap-2">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold border ${config.badge}`}
          >
            <CategoryIcon size={13} className="shrink-0" />
            <span>{task.category}</span>
          </span>
          <span className="text-xl sm:text-2xl font-display font-extrabold text-emerald-600 dark:text-brand-primary whitespace-nowrap tracking-tight leading-none">
            ${Number(task.reward).toFixed(2)}
          </span>
        </div>

        {/* Task Title */}
        <h3 className="text-base font-bold text-[#1E293B] dark:text-[#F1F5F9] leading-snug group-hover:text-emerald-600 dark:group-hover:text-brand-primary transition-colors line-clamp-2">
          {task.title}
        </h3>

        {/* Task Description */}
        <p className="text-xs sm:text-sm font-normal text-[#64748B] dark:text-slate-400 line-clamp-2 leading-relaxed">
          {cleanDescription}
        </p>
      </div>

      {/* Meta Footer */}
      <div className="mt-4 pt-3.5 border-t border-[#E2E8F0] dark:border-[#2A3348]/60 flex items-center justify-between text-xs font-normal text-[#64748B] dark:text-slate-400">
        <span className="flex items-center gap-1.5">
          <Users size={14} className="text-slate-400 dark:text-slate-500 shrink-0" />
          <span className={slotsLeft <= 5 ? 'text-amber-600 dark:text-amber-400 font-semibold' : ''}>
            {slotsLeft > 0 ? `${slotsLeft} spots left` : 'Full'}
          </span>
        </span>
        <span className="flex items-center gap-1.5">
          <Calendar size={14} className="text-slate-400 dark:text-slate-500 shrink-0" />
          <span>
            {new Date(task.created_at).toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </span>
        </span>
      </div>
    </Link>
  )
}


