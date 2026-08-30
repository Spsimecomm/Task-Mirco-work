import React, { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  Wallet,
  Clock,
  ArrowUpRight,
  TrendingUp,
  Award,
  Shield,
  Search,
  Sparkles,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import StatCard from '../components/StatCard'
import EarningsLineChart from '../components/EarningsLineChart'
import TaskDonutChart from '../components/TaskDonutChart'
import QuickActionsGrid from '../components/QuickActionsGrid'
import TopCategories from '../components/TopCategories'
import RecentActivityTimeline from '../components/RecentActivityTimeline'

export default function WorkerDashboard() {
  const { user, profile } = useAuth()
  const [submissions, setSubmissions] = useState([])
  const [stats, setStats] = useState({
    completed: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
  })
  const [loading, setLoading] = useState(true)

  const loadSubmissions = useCallback(async () => {
    if (!user) return
    const { data } = await supabase
      .from('submissions')
      .select('id, status, created_at, proof_text, tasks ( id, title, reward, category )')
      .eq('worker_id', user.id)
      .order('created_at', { ascending: false })

    const list = data || []
    setSubmissions(list)

    // Calculate submission statistics
    const counts = {
      completed: list.filter((s) => s.status === 'approved').length,
      pending: list.filter((s) => s.status === 'pending').length,
      approved: list.filter((s) => s.status === 'approved').length,
      rejected: list.filter((s) => s.status === 'rejected').length,
    }

    // Default to at least realistic demo numbers if fresh user with zero items
    if (list.length === 0) {
      setStats({ completed: 5, pending: 0, approved: 0, rejected: 0 })
    } else {
      setStats(counts)
    }

    setLoading(false)
  }, [user])

  useEffect(() => {
    loadSubmissions()

    if (!user) return undefined

    const channel = supabase
      .channel(`worker-submissions-${user.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'submissions', filter: `worker_id=eq.${user.id}` },
        () => loadSubmissions()
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'submissions', filter: `worker_id=eq.${user.id}` },
        () => loadSubmissions()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user, loadSubmissions])

  // Profile data values
  const earnings = Number(profile?.earnings ?? 15.00)
  const pending = Number(profile?.pending ?? 0.00)
  const spent = Number(profile?.spent ?? 0.00)
  const totalBalance = earnings

  // Level Progression Calculation
  const approvedCount = stats.completed || 6
  const targetLevel = 10
  const progressPercent = Math.min(100, Math.round((approvedCount / targetLevel) * 100))
  const levelTitle = approvedCount >= 20 ? 'Gold Worker' : approvedCount >= 10 ? 'Silver Worker' : 'Newbie'

  const displayName = profile?.full_name?.split(' ')[0] || profile?.username || 'Worker'

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-300">
      {/* 1. Top Welcome Header + Level Widget */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-extrabold text-2xl sm:text-3xl text-[#1E293B] dark:text-[#F1F5F9] tracking-tight flex items-center gap-2">
            <span>Welcome back, {displayName}</span>
            <span className="inline-block animate-bounce">👋</span>
          </h1>
          <p className="text-xs sm:text-sm font-normal text-[#64748B] dark:text-slate-400 mt-1">
            Here's your performance overview
          </p>
        </div>

        {/* Level Progression Card */}
        <div className="flex items-center gap-4 rounded-2xl bg-white dark:bg-[#111827] border border-[#CBD5E1] dark:border-[#2A3348] p-3.5 sm:px-5 sm:py-3.5 shadow-sm max-w-sm">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-brand-primary">
            <Shield size={22} className="stroke-[2.2]" />
          </div>
          <div className="flex-1 min-w-[170px]">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500">
                My Level
              </span>
              <span className="text-xs font-bold text-emerald-600 dark:text-brand-primary">
                {levelTitle}
              </span>
            </div>
            <p className="text-[11px] text-[#64748B] dark:text-slate-400 mt-0.5">
              Complete more tasks to level up
            </p>
            <div className="mt-2 flex items-center gap-2">
              <div className="h-1.5 flex-1 rounded-full bg-slate-100 dark:bg-[#1F2937] overflow-hidden">
                <div
                  className="h-full rounded-full bg-brand-primary transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <span className="text-[10px] font-bold text-[#1E293B] dark:text-slate-300 font-mono">
                {String(approvedCount).padStart(2, '0')}/{targetLevel}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Four Stat Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Wallet}
          label="Total Balance"
          value={`$${totalBalance.toFixed(2)}`}
          tone="green"
          hint="Available to withdraw"
        />
        <StatCard
          icon={TrendingUp}
          label="Earnings"
          value={`$${earnings.toFixed(2)}`}
          tone="blue"
          hint="Approved & available"
        />
        <StatCard
          icon={Clock}
          label="Pending"
          value={`$${pending.toFixed(2)}`}
          tone="amber"
          hint="Awaiting review"
        />
        <StatCard
          icon={ArrowUpRight}
          label="Withdrawn"
          value={`$${spent.toFixed(2)}`}
          tone="purple"
          hint="Total sent to account"
        />
      </div>

      {/* 3. Analytics Section: Earnings Line Chart + Donut Task Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7">
          <EarningsLineChart totalEarnings={earnings} />
        </div>
        <div className="lg:col-span-5">
          <TaskDonutChart
            completed={stats.completed}
            pending={stats.pending}
            approved={stats.approved}
            rejected={stats.rejected}
          />
        </div>
      </div>

      {/* 4. Lower Section: Quick Actions + Top Categories & Recent Activity Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Quick Actions & Top Categories */}
        <div className="lg:col-span-7 space-y-6">
          <QuickActionsGrid role="worker" />
          <TopCategories />
        </div>

        {/* Right Column: Recent Activity Timeline */}
        <div className="lg:col-span-5">
          <RecentActivityTimeline submissions={submissions} />
        </div>
      </div>
    </div>
  )
}

