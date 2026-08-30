import React from 'react'
import { Link } from 'react-router-dom'
import { Store, ClipboardCheck, ArrowUpRight, Users, PlusCircle, Briefcase, CreditCard } from 'lucide-react'

export default function QuickActionsGrid({ role = 'worker' }) {
  const isEmployer = role === 'employer'

  const workerActions = [
    {
      to: '/marketplace',
      title: 'Browse Tasks',
      desc: 'Find new tasks',
      icon: Store,
      color: 'bg-emerald-500/10 text-emerald-600 dark:text-brand-primary border-emerald-500/20',
      iconBg: 'bg-emerald-500/15',
    },
    {
      to: '/my-submissions',
      title: 'My Submissions',
      desc: 'Track your proofs',
      icon: ClipboardCheck,
      color: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20',
      iconBg: 'bg-indigo-500/15',
    },
    {
      to: '/withdraw',
      title: 'Withdraw',
      desc: 'Get your earnings',
      icon: ArrowUpRight,
      color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
      iconBg: 'bg-blue-500/15',
    },
    {
      title: 'Referrals',
      desc: 'Invite & earn more',
      icon: Users,
      color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
      iconBg: 'bg-amber-500/15',
      disabled: true,
      badge: 'Coming Soon',
    },
  ]

  const employerActions = [
    {
      to: '/create-task',
      title: 'Post a Task',
      desc: 'Create micro-jobs',
      icon: PlusCircle,
      color: 'bg-emerald-500/10 text-emerald-600 dark:text-brand-primary border-emerald-500/20',
      iconBg: 'bg-emerald-500/15',
    },
    {
      to: '/review-submissions',
      title: 'Review Proofs',
      desc: 'Approve or reject',
      icon: Briefcase,
      color: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20',
      iconBg: 'bg-indigo-500/15',
    },
    {
      to: '/deposit',
      title: 'Deposit Funds',
      desc: 'Add escrow balance',
      icon: CreditCard,
      color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
      iconBg: 'bg-blue-500/15',
    },
    {
      title: 'Referrals',
      desc: 'Invite & earn bonus',
      icon: Users,
      color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
      iconBg: 'bg-amber-500/15',
      disabled: true,
      badge: 'Coming Soon',
    },
  ]

  const actions = isEmployer ? employerActions : workerActions

  return (
    <div className="space-y-3">
      <h3 className="font-display font-bold text-sm sm:text-base text-[#1E293B] dark:text-[#F1F5F9]">
        Quick Actions
      </h3>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {actions.map((act) =>
          act.disabled ? (
            <div
              key={act.title}
              className="flex flex-col justify-between rounded-2xl bg-white/70 dark:bg-[#111827]/70 border border-[#CBD5E1]/80 dark:border-[#2A3348]/80 p-4 shadow-sm opacity-75 cursor-not-allowed select-none"
            >
              <div className="flex items-center justify-between">
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl border ${act.color}`}>
                  <act.icon size={20} />
                </div>
                {act.badge && (
                  <span className="text-[10px] font-semibold bg-slate-200 dark:bg-slate-800 text-[#64748B] dark:text-slate-400 px-2 py-0.5 rounded-full border border-slate-300 dark:border-slate-700">
                    {act.badge}
                  </span>
                )}
              </div>
              <div className="mt-3">
                <p className="text-sm font-bold text-[#64748B] dark:text-slate-300">
                  {act.title}
                </p>
                <p className="text-xs text-[#94A3B8] dark:text-slate-500 font-normal mt-0.5">
                  {act.desc}
                </p>
              </div>
            </div>
          ) : (
            <Link
              key={act.title}
              to={act.to}
              className="group flex flex-col justify-between rounded-2xl bg-white dark:bg-[#111827] border border-[#CBD5E1] dark:border-[#2A3348] p-4 shadow-sm hover:border-brand-primary dark:hover:border-brand-primary/60 hover:-translate-y-0.5 hover:shadow-md transition-all"
            >
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl border ${act.color} transition group-hover:scale-105`}>
                <act.icon size={20} />
              </div>
              <div className="mt-3">
                <p className="text-sm font-bold text-[#1E293B] dark:text-[#F1F5F9] group-hover:text-emerald-600 dark:group-hover:text-brand-primary transition-colors">
                  {act.title}
                </p>
                <p className="text-xs text-[#64748B] dark:text-slate-400 font-normal mt-0.5">
                  {act.desc}
                </p>
              </div>
            </Link>
          )
        )}
      </div>
    </div>
  )
}
