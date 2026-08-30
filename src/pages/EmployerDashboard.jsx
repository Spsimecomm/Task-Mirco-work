import React, { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  Wallet,
  Clock,
  TrendingDown,
  PlusCircle,
  Briefcase,
  ChevronRight,
  Sparkles,
  Layers,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import StatCard from '../components/StatCard'
import QuickActionsGrid from '../components/QuickActionsGrid'
import TopCategories from '../components/TopCategories'
import { StatusBadge, EmptyState } from '../components/Shared'

export default function EmployerDashboard() {
  const { user, profile } = useAuth()
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)

  const loadTasks = useCallback(async () => {
    if (!user) return
    const { data } = await supabase
      .from('tasks')
      .select('id, title, category, reward, status, slots_total, slots_filled, created_at')
      .eq('employer_id', user.id)
      .order('created_at', { ascending: false })
      .limit(6)
    setTasks(data || [])
    setLoading(false)
  }, [user])

  useEffect(() => {
    loadTasks()

    if (!user) return undefined

    const channel = supabase
      .channel(`employer-tasks-${user.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'tasks', filter: `employer_id=eq.${user.id}` },
        () => loadTasks()
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'tasks', filter: `employer_id=eq.${user.id}` },
        () => loadTasks()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user, loadTasks])

  const deposited = Number(profile?.deposited ?? 25.00)
  const pending = Number(profile?.pending ?? 0.00)
  const spent = Number(profile?.spent ?? 0.00)
  const activeCount = tasks.filter((t) => t.status === 'open').length

  const displayName = profile?.full_name?.split(' ')[0] || profile?.username || 'Employer'

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-300">
      {/* Welcome Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-extrabold text-2xl sm:text-3xl text-[#1E293B] dark:text-[#F1F5F9] tracking-tight flex items-center gap-2">
            <span>Welcome back, {displayName}</span>
            <span className="inline-block">👋</span>
          </h1>
          <p className="text-xs sm:text-sm font-normal text-[#64748B] dark:text-slate-400 mt-1">
            Manage your campaigns, budgets and incoming proofs
          </p>
        </div>
        <Link
          to="/create-task"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-primary px-4 py-2.5 text-xs sm:text-sm font-bold text-white shadow-md shadow-brand-primary/20 hover:bg-emerald-600 transition"
        >
          <PlusCircle size={16} />
          <span>Post New Task</span>
        </Link>
      </div>

      {/* 4 Stat Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Wallet}
          label="Deposit Balance"
          value={`$${deposited.toFixed(2)}`}
          tone="green"
          hint="Available to fund jobs"
        />
        <StatCard
          icon={Layers}
          label="Active Campaigns"
          value={String(activeCount).padStart(2, '0')}
          tone="blue"
          hint="Open for workers"
        />
        <StatCard
          icon={Clock}
          label="Escrow Pending"
          value={`$${pending.toFixed(2)}`}
          tone="amber"
          hint="Held for reviews"
        />
        <StatCard
          icon={TrendingDown}
          label="Total Spent"
          value={`$${spent.toFixed(2)}`}
          tone="purple"
          hint="Paid out to workers"
        />
      </div>

      {/* Quick Actions & Lower Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 space-y-6">
          <QuickActionsGrid role="employer" />

          {/* Employer Posted Tasks Card */}
          <div className="card rounded-2xl bg-white dark:bg-[#111827] border border-[#CBD5E1] dark:border-[#2A3348] shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-[#CBD5E1] dark:border-[#2A3348]">
              <h2 className="font-display font-bold text-base text-[#1E293B] dark:text-[#F1F5F9]">
                Your Active Campaigns
              </h2>
              <Link
                to="/review-submissions"
                className="text-xs font-bold text-emerald-600 dark:text-brand-primary hover:underline flex items-center gap-0.5"
              >
                <span>Review Proofs</span>
                <ChevronRight size={14} />
              </Link>
            </div>
            {loading ? (
              <div className="p-6 text-sm text-[#64748B] dark:text-slate-400">Loading…</div>
            ) : tasks.length === 0 ? (
              <div className="p-4">
                <EmptyState
                  title="No tasks posted yet"
                  subtitle="Post your first micro-task and start getting submissions from verified workers."
                  action={
                    <Link
                      to="/create-task"
                      className="mt-2 inline-flex items-center gap-2 rounded-xl bg-brand-primary px-4 py-2 text-xs font-bold text-white shadow-sm"
                    >
                      <PlusCircle size={14} />
                      <span>Post a task</span>
                    </Link>
                  }
                />
              </div>
            ) : (
              <ul className="divide-y divide-[#E2E8F0] dark:divide-[#2A3348]/60">
                {tasks.map((t) => (
                  <li
                    key={t.id}
                    className="flex items-center justify-between px-5 sm:px-6 py-3.5 hover:bg-[#F8FAFC] dark:hover:bg-[#1F2937]/50 transition"
                  >
                    <div>
                      <p className="text-sm font-bold text-[#1E293B] dark:text-[#F1F5F9]">
                        {t.title}
                      </p>
                      <p className="text-xs text-[#64748B] dark:text-slate-400 mt-0.5">
                        {t.category} · {t.slots_filled}/{t.slots_total} slots filled
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-base font-display font-extrabold text-emerald-600 dark:text-brand-primary whitespace-nowrap">
                        ${Number(t.reward).toFixed(2)}
                      </span>
                      <StatusBadge status={t.status} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="lg:col-span-5 space-y-6">
          <TopCategories />
        </div>
      </div>
    </div>
  )
}

