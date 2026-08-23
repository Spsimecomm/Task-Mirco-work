import React, { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { Wallet, Clock, TrendingDown, PlusCircle, ArrowRight } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import StatCard from '../components/StatCard'
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

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard icon={Wallet} label="Balance" value={`$${Number(profile?.deposited ?? 0).toFixed(2)}`} tone="mint" hint="Available to fund tasks" />
        <StatCard icon={Clock} label="Pending" value={`$${Number(profile?.pending ?? 0).toFixed(2)}`} tone="amber" hint="Reserved for open submissions" />
        <StatCard icon={TrendingDown} label="Spent" value={`$${Number(profile?.spent ?? 0).toFixed(2)}`} tone="indigo" hint="Paid out to workers" />
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
                  <span className="text-sm font-semibold text-mint-400">${Number(t.reward).toFixed(2)}</span>
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
