import React from 'react'
import { Link } from 'react-router-dom'
import { ArrowUpRight, CheckCircle2, Clock, FileText, ChevronRight, XCircle } from 'lucide-react'

const STATUS_STYLES = {
  approved: {
    icon: CheckCircle2,
    iconColor: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
    badgeColor: 'bg-emerald-500/10 text-emerald-600 dark:text-brand-primary border-emerald-500/20',
    label: 'Approved',
  },
  completed: {
    icon: CheckCircle2,
    iconColor: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
    badgeColor: 'bg-emerald-500/10 text-emerald-600 dark:text-brand-primary border-emerald-500/20',
    label: 'Completed',
  },
  pending: {
    icon: Clock,
    iconColor: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
    badgeColor: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
    label: 'Pending',
  },
  rejected: {
    icon: XCircle,
    iconColor: 'bg-rose-500/10 text-rose-500 border-rose-500/20',
    badgeColor: 'bg-rose-500/10 text-rose-500 border-rose-500/20',
    label: 'Rejected',
  },
}

function getStatusStyle(status) {
  return STATUS_STYLES[status] || STATUS_STYLES.pending
}

function formatTime(dateString) {
  try {
    return new Date(dateString).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return 'Recently'
  }
}

export default function RecentActivityTimeline({ submissions = [], withdrawals = [] }) {
  const mappedSubmissions = submissions.map((s) => {
    const style = getStatusStyle(s.status)
    const isApproved = s.status === 'approved'
    const isPending = s.status === 'pending'
    return {
      id: `sub-${s.id}`,
      type: 'submission',
      title: isApproved ? 'Task Completed' : isPending ? 'Task Submitted' : 'Task Rejected',
      subtitle: `${s.tasks?.category || 'General'}: ${s.tasks?.title || 'Micro Task'}`,
      time: formatTime(s.created_at),
      sortTime: new Date(s.created_at).getTime(),
      status: s.status,
      icon: style.icon,
      iconColor: style.iconColor,
      badgeColor: style.badgeColor,
      badgeLabel: style.label,
    }
  })

  const mappedWithdrawals = withdrawals.map((w) => {
    const style = getStatusStyle(w.status)
    return {
      id: `wdl-${w.id}`,
      type: 'withdrawal',
      title: 'Withdrawal Request',
      subtitle: `$${Number(w.amount || 0).toFixed(2)} to ${w.method || 'bKash'}`,
      time: formatTime(w.created_at),
      sortTime: new Date(w.created_at).getTime(),
      status: w.status,
      icon: ArrowUpRight,
      iconColor: style.iconColor,
      badgeColor: style.badgeColor,
      badgeLabel: style.label,
    }
  })

  const activities = [...mappedSubmissions, ...mappedWithdrawals]
    .sort((a, b) => b.sortTime - a.sortTime)
    .slice(0, 6)

  return (
    <div className="card rounded-2xl bg-white dark:bg-[#111827] border border-[#CBD5E1] dark:border-[#2A3348] p-5 sm:p-6 shadow-sm transition-all">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display font-bold text-base text-[#1E293B] dark:text-[#F1F5F9]">
          Recent Activity
        </h3>
        <Link
          to="/my-submissions"
          className="text-xs font-bold text-emerald-600 dark:text-brand-primary hover:underline flex items-center gap-0.5"
        >
          <span>View All</span>
          <ChevronRight size={14} />
        </Link>
      </div>

      {/* Activity Timeline List */}
      <div className="space-y-3">
        {activities.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400">
              No recent activity yet. Your task submissions and withdrawals will appear here.
            </p>
          </div>
        ) : (
          activities.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between gap-3 p-2.5 rounded-xl hover:bg-[#F8FAFC] dark:hover:bg-[#1F2937]/50 transition border border-transparent hover:border-[#E2E8F0] dark:hover:border-[#2A3348]"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${item.iconColor}`}
                >
                  <item.icon size={17} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm font-bold text-[#1E293B] dark:text-[#F1F5F9] truncate">
                    {item.title}
                  </p>
                  <p className="text-[11px] text-[#64748B] dark:text-slate-400 truncate">
                    {item.subtitle}
                  </p>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500">
                    {item.time}
                  </p>
                </div>
              </div>

              <span
                className={`shrink-0 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${item.badgeColor}`}
              >
                {item.badgeLabel}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
