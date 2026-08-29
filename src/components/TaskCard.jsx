import React from 'react'
import { Link } from 'react-router-dom'
import { Users, Tag, Calendar } from 'lucide-react'

const categoryColors = {
  'Social Media': 'bg-[#EEF2FF] text-[#3730A3] border-[#C7D2FE] dark:bg-[#1E1B4B] dark:text-[#818CF8] dark:border-[#3730A3]',
  'Sign Up': 'bg-[#DCFCE7] text-[#166534] border-[#BBF7D0] dark:bg-[#064E3B] dark:text-[#34D399] dark:border-[#047857]',
  'Video Watching': 'bg-[#FFE4E6] text-[#9F1239] border-[#FECDD3] dark:bg-[#4C0519] dark:text-[#FB7185] dark:border-[#9F1239]',
  'Data Entry': 'bg-[#FEF3C7] text-[#92400E] border-[#FDE68A] dark:bg-[#451A03] dark:text-[#FBBF24] dark:border-[#78350F]',
}

export default function TaskCard({ task }) {
  const slotsLeft = task.slots_total - task.slots_filled

  // Strip superfluous line-level emojis from description preview for clean typography
  const cleanDescription = (task.description || '')
    .replace(/^[🔹🔸👉🎯📌🚀⭐✨➡️⚡📝💡✔️•\-*]+\s*/gm, '')
    .trim()

  return (
    <Link
      to={`/task/${task.id}`}
      className="card card-hover p-5 sm:p-6 flex flex-col justify-between gap-4 rounded-xl border border-[#CBD5E1] dark:border-white/10 hover:border-mint-500 dark:hover:border-mint-500/50 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group bg-white dark:bg-[#1E293B]"
    >
      <div className="space-y-3">
        {/* Category Badge & Prominent Green Bold Reward */}
        <div className="flex items-center justify-between gap-2">
          <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold border ${categoryColors[task.category] || 'bg-[#E2E8F0] text-[#334155] border-[#CBD5E1] dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'}`}>
            <Tag size={11} className="shrink-0" />
            {task.category}
          </span>
          <span className="text-xl sm:text-2xl font-display font-extrabold text-emerald-600 dark:text-mint-500 whitespace-nowrap tracking-tight leading-none">
            ${Number(task.reward).toFixed(2)}
          </span>
        </div>

        {/* Task Title: Large and Bold */}
        <h3 className="text-base sm:text-lg font-bold text-[#1E293B] dark:text-[#F1F5F9] leading-snug group-hover:text-emerald-600 dark:group-hover:text-mint-500 transition line-clamp-2">
          {task.title}
        </h3>

        {/* Task Description: Normal Font Weight */}
        <p className="text-sm font-normal text-[#64748B] dark:text-slate-400 line-clamp-2 leading-relaxed">
          {cleanDescription}
        </p>
      </div>

      {/* Meta info: Small and Muted */}
      <div className="pt-3 border-t border-[#E2E8F0] dark:border-white/5 flex items-center justify-between text-xs font-normal text-[#64748B] dark:text-slate-400">
        <span className="flex items-center gap-1.5">
          <Users size={13} className="text-slate-400 dark:text-slate-500 shrink-0" />
          <span>{slotsLeft > 0 ? `${slotsLeft} spots left` : 'Full'}</span>
        </span>
        <span className="flex items-center gap-1">
          <Calendar size={13} className="text-slate-400 dark:text-slate-500 shrink-0" />
          <span>{new Date(task.created_at).toLocaleDateString()}</span>
        </span>
      </div>
    </Link>
  )
}

