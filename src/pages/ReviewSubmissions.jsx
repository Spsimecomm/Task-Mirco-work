import React, { useEffect, useState, useCallback } from 'react'
import { Check, X, Loader as Loader2, Inbox } from 'lucide-react'
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
    const { data } = await supabase
      .from('submissions')
      .select('id, status, proof_text, proof_url, rejection_reason, created_at, worker_name, tasks ( title, category, reward )')
      .eq('employer_id', user.id)
      .order('created_at', { ascending: false })
    setSubmissions(data || [])
    setLoading(false)
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
    <div className="mx-auto max-w-5xl px-4 sm:px-6 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#1E293B] dark:text-[#F1F5F9]">Review submissions</h1>
        <p className="text-sm font-normal text-[#64748B] dark:text-slate-400 mt-1">Approve proof to release payment, or reject with a reason.</p>
      </div>

      <div className="flex gap-2 flex-wrap">
        {['pending', 'approved', 'rejected', 'all'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full px-4 py-1.5 text-xs font-semibold border capitalize transition-all ${
              filter === f
                ? 'bg-emerald-600 dark:bg-mint-500 text-white dark:text-slate-900 border-emerald-600 dark:border-mint-500 shadow-sm'
                : 'border-[#CBD5E1] dark:border-white/10 bg-white dark:bg-slate-800 text-[#1E293B] dark:text-slate-300 hover:border-slate-400 dark:hover:border-white/20 hover:bg-[#E2E8F0] dark:hover:text-white'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      <ErrorBanner message={error} />

      {loading ? (
        <div className="text-sm text-[#64748B] dark:text-slate-400 py-16 text-center">Loading…</div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={Inbox} title="Nothing here" subtitle="Submissions matching this filter will show up here." />
      ) : (
        <div className="space-y-4">
          {filtered.map((s) => (
            <div key={s.id} className="card p-5 sm:p-6 rounded-xl bg-white dark:bg-[#1E293B] border border-[#CBD5E1] dark:border-white/10 hover:border-slate-400 dark:hover:border-white/20 transition-all">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-bold text-base text-[#1E293B] dark:text-[#F1F5F9]">{s.tasks?.title}</p>
                  <p className="text-xs text-[#64748B] dark:text-slate-400 mt-1">
                    by <span className="font-medium text-[#1E293B] dark:text-slate-300">{s.worker_name || 'Worker'}</span> · {new Date(s.created_at).toLocaleString()}
                  </p>
                </div>
                <div className="flex items-center gap-2.5 shrink-0">
                  <span className="text-base sm:text-lg font-display font-extrabold text-emerald-600 dark:text-mint-500 whitespace-nowrap leading-none">
                    ${Number(s.tasks?.reward ?? 0).toFixed(2)}
                  </span>
                  <StatusBadge status={s.status} />
                </div>
              </div>

              <p className="text-sm font-normal text-[#64748B] dark:text-slate-400 mt-3 leading-relaxed">{s.proof_text}</p>
              {s.proof_url && isSafeUrl(s.proof_url) && /\.(jpe?g|png|webp|gif)$/i.test(s.proof_url) ? (
                <a href={s.proof_url} target="_blank" rel="noreferrer" className="block mt-3">
                  <img src={s.proof_url} alt="Proof screenshot" className="rounded-xl max-h-64 object-contain border border-[#CBD5E1] dark:border-white/10" />
                </a>
              ) : s.proof_url && isSafeUrl(s.proof_url) ? (
                <a href={s.proof_url} target="_blank" rel="noreferrer" className="text-sm text-emerald-600 dark:text-mint-500 hover:underline mt-2 inline-block break-all font-medium">
                  {s.proof_url}
                </a>
              ) : s.proof_url ? (
                <span className="text-sm text-[#64748B] dark:text-slate-400 mt-2 inline-block break-all">{s.proof_url}</span>
              ) : null}

              {s.status === 'pending' && (
                <div className="mt-4 pt-4 border-t border-[#CBD5E1] dark:border-white/10">
                  {rejectingId === s.id ? (
                    <div className="space-y-2.5">
                      <textarea
                        className="input"
                        rows={2}
                        placeholder="Reason for rejection…"
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                      />
                      <div className="flex gap-2">
                        <button onClick={() => handleReject(s.id)} disabled={busyId === s.id} className="btn-secondary">
                          {busyId === s.id ? <Loader2 size={14} className="animate-spin" /> : <X size={14} />}
                          Confirm reject
                        </button>
                        <button onClick={() => setRejectingId(null)} className="btn-ghost">Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-2.5">
                      <button onClick={() => handleApprove(s.id)} disabled={busyId === s.id} className="btn-primary">
                        {busyId === s.id ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                        Approve & pay
                      </button>
                      <button onClick={() => setRejectingId(s.id)} className="btn-secondary">
                        <X size={14} /> Reject
                      </button>
                    </div>
                  )}
                </div>
              )}

              {s.status === 'rejected' && s.rejection_reason && (
                <div className="mt-3 rounded-xl bg-[#FFE4E6] dark:bg-signal-rose/10 border border-[#FECDD3] dark:border-signal-rose/20 px-3.5 py-2.5 text-sm text-rose-700 dark:text-signal-rose font-medium">
                  Rejected: {s.rejection_reason}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
