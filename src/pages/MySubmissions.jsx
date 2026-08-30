import React, { useEffect, useState, useMemo, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { StatusBadge, EmptyState, isSafeUrl } from '../components/Shared'
import { ClipboardCheck, ExternalLink, AlertCircle } from 'lucide-react'

export default function MySubmissions() {
  const { user } = useAuth()
  const [submissions, setSubmissions] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  const load = useCallback(async () => {
    if (!user) return
    const { data } = await supabase
      .from('submissions')
      .select('id, status, proof_text, proof_url, rejection_reason, created_at, tasks ( title, category, reward )')
      .eq('worker_id', user.id)
      .order('created_at', { ascending: false })
    setSubmissions(data || [])
    setLoading(false)
  }, [user])

  useEffect(() => {
    load()

    if (!user) return undefined

    const channel = supabase
      .channel(`worker-my-submissions-${user.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'submissions', filter: `worker_id=eq.${user.id}` },
        () => load()
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'submissions', filter: `worker_id=eq.${user.id}` },
        () => load()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user, load])

  const filtered = useMemo(() => {
    if (filter === 'all') return submissions
    return submissions.filter((s) => s.status === filter)
  }, [submissions, filter])

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-300 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-extrabold text-2xl sm:text-3xl text-[#1E293B] dark:text-[#F1F5F9] tracking-tight">
            My Submissions
          </h1>
          <p className="text-xs sm:text-sm font-normal text-[#64748B] dark:text-slate-400 mt-1">
            Track verification status and approved earnings for all your work
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex gap-1.5 p-1 bg-white dark:bg-[#111827] border border-[#CBD5E1] dark:border-[#2A3348] rounded-xl self-start sm:self-auto">
          {['all', 'pending', 'approved', 'rejected'].map((tab) => {
            const isActive = filter === tab
            const label = tab.charAt(0).toUpperCase() + tab.slice(1)
            return (
              <button
                key={tab}
                onClick={() => setFilter(tab)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  isActive
                    ? 'bg-brand-primary text-white shadow-sm'
                    : 'text-[#64748B] dark:text-slate-400 hover:text-[#1E293B] dark:hover:text-white'
                }`}
              >
                {label}
              </button>
            )
          })}
        </div>
      </div>

      {loading ? (
        <div className="text-sm text-[#64748B] dark:text-slate-400 py-16 text-center">Loading…</div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={ClipboardCheck}
          title="No submissions found"
          subtitle={
            filter === 'all'
              ? 'Accept a task from the marketplace to start submitting proofs.'
              : `No submissions with status "${filter}".`
          }
        />
      ) : (
        <div className="space-y-4">
          {filtered.map((s) => (
            <div
              key={s.id}
              className="card p-5 sm:p-6 rounded-2xl bg-white dark:bg-[#111827] border border-[#CBD5E1] dark:border-[#2A3348] shadow-sm hover:border-slate-400 dark:hover:border-slate-600 transition-all"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-bold text-base text-[#1E293B] dark:text-[#F1F5F9]">
                    {s.tasks?.title}
                  </p>
                  <p className="text-xs text-[#64748B] dark:text-slate-400 mt-1">
                    {s.tasks?.category && (
                      <span className="inline-block font-medium mr-1.5">{s.tasks.category} ·</span>
                    )}
                    {new Date(s.created_at).toLocaleString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-base sm:text-lg font-display font-extrabold text-emerald-600 dark:text-brand-primary whitespace-nowrap leading-none">
                    ${Number(s.tasks?.reward ?? 0).toFixed(2)}
                  </span>
                  <StatusBadge status={s.status} />
                </div>
              </div>

              <div className="mt-3.5 pt-3 border-t border-[#E2E8F0] dark:border-[#2A3348]/60">
                <p className="text-xs font-bold text-[#64748B] dark:text-slate-400 uppercase tracking-wider mb-1">
                  Submitted Proof Details:
                </p>
                <p className="text-xs sm:text-sm font-normal text-[#1E293B] dark:text-slate-300 leading-relaxed">
                  {s.proof_text}
                </p>
              </div>

              {s.proof_url && isSafeUrl(s.proof_url) && /\.(jpe?g|png|webp|gif)$/i.test(s.proof_url) ? (
                <a href={s.proof_url} target="_blank" rel="noreferrer" className="block mt-3.5">
                  <img
                    src={s.proof_url}
                    alt="Proof screenshot"
                    className="rounded-xl max-h-64 object-contain border border-[#CBD5E1] dark:border-[#2A3348] bg-slate-50 dark:bg-slate-900"
                  />
                </a>
              ) : s.proof_url && isSafeUrl(s.proof_url) ? (
                <a
                  href={s.proof_url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-semibold text-emerald-600 dark:text-brand-primary hover:underline mt-2.5 inline-flex items-center gap-1 break-all"
                >
                  <span>{s.proof_url}</span>
                  <ExternalLink size={12} />
                </a>
              ) : s.proof_url ? (
                <span className="text-xs text-[#64748B] dark:text-slate-400 mt-2.5 inline-block break-all">
                  {s.proof_url}
                </span>
              ) : null}

              {s.status === 'rejected' && s.rejection_reason && (
                <div className="mt-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 px-3.5 py-2.5 text-xs sm:text-sm text-rose-600 dark:text-rose-400 flex items-start gap-2">
                  <AlertCircle size={16} className="shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Reason for Rejection: </span>
                    <span>{s.rejection_reason}</span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

