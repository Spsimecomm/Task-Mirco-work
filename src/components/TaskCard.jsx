import React from 'react'
import { Link } from 'react-router-dom'
import {
  Users,
  Clock,
  Share2,
  UserPlus,
  PlayCircle,
  FileSpreadsheet,
  Tag,
  ArrowRight,
  Flame,
} from 'lucide-react'

const categoryConfig = {
  'Social Media': {
    icon: Share2,
    badge: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
  },
  'Sign Up': {
    icon: UserPlus,
    badge: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
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
  const totalSlots = Math.max(1, Number(task.slots_total) || 1)
  const filledSlots = Math.min(totalSlots, Math.max(0, Number(task.slots_filled) || 0))
  const slotsLeft = Math.max(0, totalSlots - filledSlots)
  const percentFilled = Math.min(100, Math.round((filledSlots / totalSlots) * 100))

  const config = categoryConfig[task.category] || {
    icon: Tag,
    badge: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20',
  }
  const CategoryIcon = config.icon

  // Clean description string from markdown bullets or noisy emoji prefixes
  const cleanDescription = (task.description || '')
    .replace(/^[🔹🔸👉🎯📌🚀⭐✨➡️⚡📝💡✔️•\-*]+\s*/gm, '')
    .trim()

  const rewardNum = Number(task.reward) || 0
  const isUrgent = slotsLeft > 0 && slotsLeft <= 3
  const isBengaliTitle = /[\u0980-\u09FF]/.test(task.title || '')
  const isBengaliDesc = /[\u0980-\u09FF]/.test(cleanDescription || '')

  return (
    <Link
      to={`/task/${task.id}`}
      className="group relative flex flex-col justify-between rounded-2xl bg-white dark:bg-[#111827] border border-slate-200/90 dark:border-[#243048] p-4 sm:p-5 shadow-sm hover:shadow-md dark:hover:shadow-emerald-950/20 hover:border-emerald-500/60 dark:hover:border-emerald-500/40 transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0"
    >
      <div className="space-y-3">
        {/* Top: Category Badge & Reward */}
        <div className="flex items-center justify-between gap-2.5">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] sm:text-xs font-semibold border ${config.badge} tracking-wide shrink-0`}
          >
            <CategoryIcon size={13} className="shrink-0" />
            <span className="truncate max-w-[120px] sm:max-w-none">{task.category || 'Micro Task'}</span>
          </span>

          {/* Reward Chip */}
          <div className="flex items-center gap-1 shrink-0 rounded-xl px-2.5 py-1 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200/80 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-400">
            <span className="font-sans text-[10px] sm:text-xs font-semibold uppercase tracking-wider opacity-80">Earn</span>
            <span className="font-sans font-bold text-base sm:text-lg tracking-tight leading-none">
              ${rewardNum.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Task Title (Explicit Hind Siliguri for Bengali with leading-[1.6] for matra clearance) */}
        <h3
          lang={isBengaliTitle ? 'bn' : 'en'}
          className={`${
            isBengaliTitle ? 'font-bengali' : 'font-sans'
          } font-bold text-base sm:text-lg leading-[1.6] tracking-tight text-slate-900 dark:text-slate-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors line-clamp-2 break-words`}
          style={isBengaliTitle ? { fontFamily: "'Hind Siliguri', 'Inter', sans-serif" } : undefined}
        >
          {task.title}
        </h3>

        {/* Task Description (Explicit Hind Siliguri for Bengali with leading-[1.65] line height) */}
        {cleanDescription && (
          <p
            lang={isBengaliDesc ? 'bn' : 'en'}
            className={`${
              isBengaliDesc ? 'font-bengali' : 'font-sans'
            } font-normal text-xs sm:text-sm leading-[1.65] text-slate-600 dark:text-slate-400 line-clamp-2 break-words`}
            style={isBengaliDesc ? { fontFamily: "'Hind Siliguri', 'Inter', sans-serif" } : undefined}
          >
            {cleanDescription}
          </p>
        )}

        {/* Spots Progress Bar & Ratio */}
        <div className="pt-1 space-y-1.5">
          <div className="flex items-center justify-between text-[11px] sm:text-xs">
            <span className="flex items-center gap-1 text-slate-500 dark:text-slate-400 font-medium">
              {isUrgent ? (
                <Flame size={12} className="text-amber-500 shrink-0" />
              ) : (
                <Users size={12} className="text-slate-400 dark:text-slate-500 shrink-0" />
              )}
              <span className={isUrgent ? 'text-amber-600 dark:text-amber-400 font-semibold' : ''}>
                {slotsLeft > 0 ? `${slotsLeft} spot${slotsLeft === 1 ? '' : 's'} left` : 'Slots Full'}
              </span>
            </span>
            <span className="text-slate-400 dark:text-slate-500 text-[11px]">
              {filledSlots}/{totalSlots} filled
            </span>
          </div>

          {/* Micro Progress Track */}
          <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                percentFilled >= 90
                  ? 'bg-rose-500'
                  : percentFilled >= 70
                  ? 'bg-amber-500'
                  : 'bg-emerald-500'
              }`}
              style={{ width: `${percentFilled}%` }}
            />
          </div>
        </div>
      </div>

      {/* Meta Footer */}
      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs font-normal text-slate-500 dark:text-slate-400">
        <span className="flex items-center gap-1.5 text-[11px] sm:text-xs">
          <Clock size={13} className="text-slate-400 dark:text-slate-500 shrink-0" />
          <span>{task.time_limit_minutes ? `${task.time_limit_minutes} mins` : 'Flexible'}</span>
        </span>

        <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 group-hover:translate-x-0.5 transition-transform">
          <span>View Task</span>
          <ArrowRight size={13} />
        </span>
      </div>
    </Link>
  )
}
