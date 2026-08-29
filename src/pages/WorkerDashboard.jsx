import React, { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { Wallet, Clock, ArrowUpFromLine, Search, ArrowRight } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import StatCard from '../components/StatCard'
import { StatusBadge, EmptyState } from '../components/Shared'

export default function WorkerDashboard() {
  const { user, profile } = useAuth()
  const [submissions, setSubmissions] = useState([])
  const [loading, setLoading] = useState(true)

  const loadSubmissions = useCallback(async () => {
    if (!user) return
    const { data } = await supabase
      .from('submissions')
      .select('id, status, created_at, proof_text, tasks ( title, reward, category )')
      .eq('worker_id', user.id)
      .order('created_at', { ascending: false })
      .limit(6)
    setSubmissions(data || [])
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

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#1E293B] dark:text-[#F1F5F9]">Welcome back, {profile?.full_name?.split(' ')[0] || 'there'}</h1>
          <p className="text-sm font-normal text-[#64748B] dark:text-slate-400 mt-1">Here's how your work is paying off.</p>
        </div>
        <Link to="/marketplace" className="btn-primary">
          <Search size={16} />
          Browse tasks
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard icon={Wallet} label="Earnings" value={`$${Number(profile?.earnings ?? 0).toFixed(2)}`} tone="mint" hint="Approved & available" />
        <StatCard icon={Clock} label="Pending" value={`$${Number(profile?.pending ?? 0).toFixed(2)}`} tone="amber" hint="Awaiting employer review" />
        <StatCard icon={ArrowUpFromLine} label="Withdrawn" value={`$${Number(profile?.spent ?? 0).toFixed(2)}`} tone="indigo" hint="Total sent to your account" />
      </div>

      <div className="card rounded-xl bg-white dark:bg-[#1E293B] border border-[#CBD5E1] dark:border-white/10 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-[#CBD5E1] dark:border-white/10">
          <h2 className="font-bold text-base text-[#1E293B] dark:text-[#F1F5F9]">Recent submissions</h2>
          <Link to="/my-submissions" className="text-sm text-emerald-600 dark:text-mint-500 hover:underline flex items-center gap-1 font-bold">
            View all <ArrowRight size={14} />
          </Link>
        </div>
        {loading ? (
          <div className="p-6 text-sm text-[#64748B] dark:text-slate-400">Loading…</div>
        ) : submissions.length === 0 ? (
          <div className="p-2">
            <EmptyState
              title="No submissions yet"
              subtitle="Accept a task from the marketplace and submit your proof of work to start earning."
              action={
                <Link to="/marketplace" className="btn-primary mt-2">
                  Find a task
                </Link>
              }
            />
          </div>
        ) : (
          <ul className="divide-y divide-[#E2E8F0] dark:divide-white/10 bg-white dark:bg-[#1E293B]">
            {submissions.map((s) => (
              <li key={s.id} className="flex items-center justify-between px-5 sm:px-6 py-4 hover:bg-[#F8FAFC] dark:hover:bg-slate-800 transition">
                <div>
                  <p className="text-sm sm:text-base font-bold text-[#1E293B] dark:text-[#F1F5F9]">{s.tasks?.title}</p>
                  <p className="text-xs font-normal text-[#64748B] dark:text-slate-400 mt-1">{s.tasks?.category} · {new Date(s.created_at).toLocaleDateString()}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-base sm:text-lg font-display font-extrabold text-emerald-600 dark:text-mint-500 whitespace-nowrap leading-none">${Number(s.tasks?.reward ?? 0).toFixed(2)}</span>
                  <StatusBadge status={s.status} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
