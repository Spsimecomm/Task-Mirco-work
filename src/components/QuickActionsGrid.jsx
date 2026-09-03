import React from 'react'
import { Link } from 'react-router-dom'
import { Store, ClipboardCheck, ArrowUpRight, PlusCircle, Briefcase, CreditCard, Gift } from 'lucide-react'

export default function QuickActionsGrid({ role = 'worker' }) {
  const isEmployer = role === 'employer'

  const workerActions = [
    {
      to: '/marketplace',
      title: 'Browse Tasks',
      desc: 'Find micro-tasks to earn',
      icon: Store,
      color: 'bg-emerald-500/10 text-emerald-600 dark:text-brand-primary border-emerald-500/20',
    },
    {
      to: '/my-submissions',
      title: 'My Submissions',
      desc: 'Track submitted proofs',
      icon: ClipboardCheck,
      color: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20',
    },
    {
      to: '/withdraw',
      title: 'Withdraw',
      desc: 'Cash out to bKash / Nagad',
      icon: ArrowUpRight,
      color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
    },
    {
      to: '/referrals',
      title: 'Refer & Earn',
      desc: '5% lifetime commission',
      icon: Gift,
      color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
    },
  ]

  const employerActions = [
    {
      to: '/create-task',
      title: 'Post a Task',
      desc: 'Launch micro-job campaign',
      icon: PlusCircle,
      color: 'bg-emerald-500/10 text-emerald-600 dark:text-brand-primary border-emerald-500/20',
    },
    {
      to: '/review-submissions',
      title: 'Review Proofs',
      desc: 'Approve or reject submissions',
      icon: Briefcase,
      color: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20',
    },
    {
      to: '/deposit',
      title: 'Deposit Funds',
      desc: 'Top up escrow balance',
      icon: CreditCard,
      color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
    },
    {
      to: '/referrals',
      title: 'Refer & Earn',
      desc: '5% lifetime commission',
      icon: Gift,
      color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
    },
  ]

  const actions = isEmployer ? employerActions : workerActions

  return (
    <div className="space-y-3">
      <h3 className="font-display font-bold text-sm sm:text-base text-[#0F172A] dark:text-[#F1F5F9]">
        Quick Actions
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {actions.map((act) => (
          <Link
            key={act.title}
            to={act.to}
            className="group flex items-start gap-3.5 rounded-2xl bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#2A3348] p-4 shadow-xs hover:border-brand-primary dark:hover:border-brand-primary/60 hover:-translate-y-0.5 hover:shadow-md transition-all"
          >
            <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${act.color} transition group-hover:scale-105`}>
              <act.icon size={22} />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-[#0F172A] dark:text-[#F1F5F9] group-hover:text-emerald-600 dark:group-hover:text-brand-primary transition-colors break-words">
                {act.title}
              </p>
              <p className="text-xs text-[#475569] dark:text-slate-400 font-normal mt-0.5 leading-relaxed break-words">
                {act.desc}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
