import React, { useEffect, useState, useCallback } from 'react'
import { Check, X, Loader2, Inbox, ExternalLink, AlertCircle } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { StatusBadge, EmptyState, ErrorBanner, isSafeUrl } from '../components/Shared'

export default function ReviewSubmissions() {
  const { user, refreshProfile } = useAuth()
  const [submissions, setSubmissions] = useState([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState(null)
  const [rejectingId, setRejectingId] = useState(null)
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('pending')

  const load = useCallback(async () => {
    if (!user) return
    setLoading(true)
    setError('')
    try {
      const { data, error: fetchErr } = await supabase
        .from('submissions')
        .select('id, status, proof_text, proof_url, rejection_reason, created_at, worker_name, tasks ( title, category, reward )')
        .eq('employer_id', user.id)
        .order('created_at', { ascending: false })

      if (fetchErr) throw fetchErr
      setSubmissions(data || [])
    } catch (err) {
      console.error('Error fetching submissions for review:', err)
      setError(err.message || 'Failed to load task submissions from database. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    load()

    if (!user) return undefined

    const channel = supabase
      .channel(`employer-review-${user.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'submissions', filter: `employer_id=eq.${user.id}` },
        () => load()
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'submissions', filter: `employer_id=eq.${user.id}` },
        () => load()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user, load])

  const handleApprove = async (id) => {
    setError('')
    setBusyId(id)
    try {
      const { error: rpcError } = await supabase.rpc('approve_submission', { p_submission_id: id })
      if (rpcError) throw rpcError
      await load()
      refreshProfile()
    } catch (err) {
      setError(err.message || 'Could not approve submission.')
    } finally {
      setBusyId(null)
    }
  }

  const handleReject = async (id) => {
    setError('')
    setBusyId(id)
    try {
      const { error: rpcError } = await supabase.rpc('reject_submission', {
        p_submission_id: id,
        p_reason: reason || 'Did not meet task requirements.',
      })
      if (rpcError) throw rpcError
      setRejectingId(null)
      setReason('')
      await load()
      refreshProfile()
    } catch (err) {
      setError(err.message || 'Could not reject submission.')
    } finally {
      setBusyId(null)
    }
  }

  const filtered = submissions.filter((s) => filter === 'all' || s.status === filter)

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-300 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-extrabold text-2xl sm:text-3xl text-[#1E293B] dark:text-[#F1F5F9] tracking-tight">
            Review Submissions
          </h1>
          <p className="text-xs sm:text-sm font-normal text-[#64748B] dark:text-slate-400 mt-1">
            Review submitted proofs, verify completions, and release worker rewards
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex gap-1.5 p-1 bg-white dark:bg-[#111827] border border-[#CBD5E1] dark:border-[#2A3348] rounded-xl self-start sm:self-auto">
          {['pending', 'approved', 'rejected', 'all'].map((tab) => {
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

      <ErrorBanner message={error} onRetry={load} />

      {loading ? (
        <div className="text-sm text-[#64748B] dark:text-slate-400 py-16 text-center">Loading…</div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title="No submissions found"
          subtitle={`No task submissions found under status "${filter}".`}
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
                    Worker: <span className="font-semibold text-[#1E293B] dark:text-slate-200">{s.worker_name || 'Worker'}</span> ·{' '}
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
                  Worker's Proof Submission:
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

              {s.status === 'pending' && (
                <div className="mt-4 pt-4 border-t border-[#E2E8F0] dark:border-[#2A3348]/60">
                  {rejectingId === s.id ? (
                    <div className="space-y-3">
                      <textarea
                        className="w-full rounded-xl border border-[#CBD5E1] dark:border-[#2A3348] bg-white dark:bg-[#0B0F17] px-3.5 py-2.5 text-xs sm:text-sm text-[#1E293B] dark:text-[#F1F5F9] outline-none transition focus:border-brand-primary"
                        rows={2}
                        placeholder="State clear reason for rejection (e.g. invalid screenshot)..."
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleReject(s.id)}
                          disabled={busyId === s.id}
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 text-white hover:bg-rose-700 transition"
                        >
                          {busyId === s.id ? <Loader2 size={14} className="animate-spin" /> : <X size={14} />}
                          <span>Confirm Reject</span>
                        </button>
                        <button
                          onClick={() => setRejectingId(null)}
                          className="px-4 py-2 rounded-xl text-xs font-bold border border-[#CBD5E1] dark:border-[#2A3348] text-[#64748B] dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-2.5">
                      <button
                        onClick={() => handleApprove(s.id)}
                        disabled={busyId === s.id}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-brand-primary text-white hover:bg-emerald-600 shadow-sm transition"
                      >
                        {busyId === s.id ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                        <span>Approve & Release Payment</span>
                      </button>
                      <button
                        onClick={() => setRejectingId(s.id)}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold border border-rose-500/30 text-rose-600 dark:text-rose-400 bg-rose-500/5 hover:bg-rose-500/10 transition"
                      >
                        <X size={14} />
                        <span>Reject</span>
                      </button>
                    </div>
                  )}
                </div>
              )}

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

