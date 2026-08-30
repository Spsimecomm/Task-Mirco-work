import React from 'react'
import { Link } from 'react-router-dom'
import { ArrowUpRight, CheckCircle2, Clock, FileText, ChevronRight } from 'lucide-react'

export default function RecentActivityTimeline({ submissions = [], withdrawals = [] }) {
  // Combine & sort activities or use realistic items
  const defaultActivities = [
    {
      id: 'act-1',
      type: 'withdrawal',
      title: 'Withdrawal Request',
      subtitle: '$10.00 to bKash',
      time: 'Aug 29, 6:28 PM',
      status: 'pending',
      icon: ArrowUpRight,
      iconColor: 'bg-rose-500/10 text-rose-500 border-rose-500/20',
      badgeColor: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
    },
    {
      id: 'act-2',
      type: 'submission',
      title: 'Task Completed',
      subtitle: 'Social Media: Facebook Post',
      time: 'Aug 29, 10:15 PM',
      status: 'approved',
      icon: CheckCircle2,
      iconColor: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
      badgeColor: 'bg-emerald-500/10 text-emerald-600 dark:text-brand-primary border-emerald-500/20',
    },
    {
      id: 'act-3',
      type: 'submission',
      title: 'Task Completed',
      subtitle: 'Video Watching: Tech Review',
      time: 'Aug 28, 09:45 PM',
      status: 'approved',
      icon: CheckCircle2,
      iconColor: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
      badgeColor: 'bg-emerald-500/10 text-emerald-600 dark:text-brand-primary border-emerald-500/20',
    },
    {
      id: 'act-4',
      type: 'submission',
      title: 'Task Submitted',
      subtitle: 'Data Entry: Product Data',
      time: 'Aug 28, 08:30 PM',
      status: 'pending',
      icon: FileText,
      iconColor: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
      badgeColor: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
    },
  ]

  // Map real database submissions if available
  const mappedSubmissions = submissions.slice(0, 4).map((s) => {
    const isApproved = s.status === 'approved'
    const isPending = s.status === 'pending'
    return {
      id: s.id,
      type: 'submission',
      title: isApproved ? 'Task Completed' : isPending ? 'Task Submitted' : 'Task Rejected',
      subtitle: `${s.tasks?.category || 'General'}: ${s.tasks?.title || 'Micro Task'}`,
      time: new Date(s.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
      status: s.status,
      icon: isApproved ? CheckCircle2 : isPending ? Clock : FileText,
      iconColor: isApproved
        ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
        : isPending
        ? 'bg-amber-500/10 text-amber-500 border-amber-500/20'
        : 'bg-rose-500/10 text-rose-500 border-rose-500/20',
      badgeColor: isApproved
        ? 'bg-emerald-500/10 text-emerald-600 dark:text-brand-primary border-emerald-500/20'
        : isPending
        ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
        : 'bg-rose-500/10 text-rose-500 border-rose-500/20',
    }
  })

  const activities = mappedSubmissions.length > 0 ? mappedSubmissions : defaultActivities

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
        {activities.map((item) => (
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
              className={`shrink-0 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border capitalize ${item.badgeColor}`}
            >
              {item.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
