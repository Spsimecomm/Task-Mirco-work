import React, { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { Wallet, Clock, TrendingDown, PlusCircle, ArrowRight, Bell, ClipboardCheck } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import StatCard from '../components/StatCard'
import { StatusBadge, EmptyState } from '../components/Shared'
import { formatMoney } from '../lib/utils'

export default function EmployerDashboard() {
  const { user, profile } = useAuth()
  const [tasks, setTasks] = useState([])
  const [pendingSubmissionsCount, setPendingSubmissionsCount] = useState(0)
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
  }, [user])

  const loadPendingCount = useCallback(async () => {
    if (!user) return
    const { data } = await supabase
      .from('submissions')
      .select('id, status')
      .eq('employer_id', user.id)
      .eq('status', 'pending')
    setPendingSubmissionsCount(data ? data.length : 0)
  }, [user])

  const loadAll = useCallback(async () => {
    setLoading(true)
    await Promise.all([loadTasks(), loadPendingCount()])
    setLoading(false)
  }, [loadTasks, loadPendingCount])

  useEffect(() => {
    loadAll()

    if (!user) return undefined

    const channel = supabase
      .channel(`employer-dashboard-${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tasks', filter: `employer_id=eq.${user.id}` },
        () => loadTasks()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'submissions', filter: `employer_id=eq.${user.id}` },
        () => loadPendingCount()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        () => loadPendingCount()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user, loadAll, loadTasks, loadPendingCount])

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Welcome back, {profile?.full_name?.split(' ')[0] || 'there'}</h1>
          <p className="text-sm text-slate-500 mt-1">Manage your campaigns and review submitted work.</p>
        </div>
        <Link to="/create-task" className="btn-primary">
          <PlusCircle size={16} />
          Post a task
        </Link>
      </div>

      {pendingSubmissionsCount > 0 && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-xl border border-signal-amber/30 bg-signal-amber/10 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-signal-amber/20 text-signal-amber shrink-0">
              <ClipboardCheck size={20} />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">
                {pendingSubmissionsCount} pending proof {pendingSubmissionsCount === 1 ? 'submission' : 'submissions'} awaiting your review
              </p>
              <p className="text-xs text-slate-400">
                Workers have submitted task proof. Review and approve to release payment.
              </p>
            </div>
          </div>
          <Link
            to="/review-submissions"
            className="flex items-center gap-1.5 rounded-lg bg-signal-amber px-3.5 py-1.5 text-xs font-semibold text-base-950 transition hover:bg-signal-amber/90 shrink-0"
          >
            Review Now
            <ArrowRight size={14} />
          </Link>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard icon={Wallet} label="Balance" value={formatMoney(profile?.deposited)} tone="mint" hint="Available to fund tasks" />
        <StatCard icon={Clock} label="Pending" value={formatMoney(profile?.pending)} tone="amber" hint="Reserved for open submissions" />
        <StatCard icon={TrendingDown} label="Spent" value={formatMoney(profile?.spent)} tone="indigo" hint="Paid out to workers" />
      </div>

      <div className="card">
        <div className="flex items-center justify-between px-5 py-4 border-b border-base-700">
          <h2 className="font-semibold text-white">Your tasks</h2>
          <Link to="/review-submissions" className="text-sm text-mint-400 hover:underline flex items-center gap-1">
            Review submissions <ArrowRight size={14} />
          </Link>
        </div>
        {loading ? (
          <div className="p-6 text-sm text-slate-500">Loading…</div>
        ) : tasks.length === 0 ? (
          <div className="p-2">
            <EmptyState
              title="No tasks posted yet"
              subtitle="Post your first micro-task and start getting submissions from workers."
              action={
                <Link to="/create-task" className="btn-primary mt-2">
                  Post a task
                </Link>
              }
            />
          </div>
        ) : (
          <ul className="divide-y divide-base-700">
            {tasks.map((t) => (
              <li key={t.id} className="flex items-center justify-between px-5 py-4">
                <div>
                  <p className="text-sm font-medium text-white">{t.title}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {t.category} · {t.slots_filled}/{t.slots_total} filled
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-mint-400">{formatMoney(t.reward)}</span>
                  <StatusBadge status={t.status} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

