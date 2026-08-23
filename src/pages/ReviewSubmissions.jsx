import React, { useEffect, useState, useCallback } from 'react'
import { Check, X, Loader as Loader2, Inbox } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { StatusBadge, EmptyState, ErrorBanner } from '../components/Shared'

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
        <h1 className="text-2xl font-bold">Review submissions</h1>
        <p className="text-sm text-slate-500 mt-1">Approve proof to release payment, or reject with a reason.</p>
      </div>

      <div className="flex gap-2">
        {['pending', 'approved', 'rejected', 'all'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-lg px-3.5 py-2 text-sm font-medium border capitalize transition ${
              filter === f ? 'bg-mint-500 text-base-950 border-mint-500' : 'border-base-600 text-slate-300 hover:border-base-500'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      <ErrorBanner message={error} />

      {loading ? (
        <div className="text-sm text-slate-500 py-16 text-center">Loading…</div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={Inbox} title="Nothing here" subtitle="Submissions matching this filter will show up here." />
      ) : (
        <div className="space-y-3">
          {filtered.map((s) => (
            <div key={s.id} className="card p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-white">{s.tasks?.title}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    by {s.worker_name || 'Worker'} · {new Date(s.created_at).toLocaleString()}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-sm font-semibold text-mint-400">${Number(s.tasks?.reward ?? 0).toFixed(2)}</span>
                  <StatusBadge status={s.status} />
                </div>
              </div>

              <p className="text-sm text-slate-400 mt-3">{s.proof_text}</p>
              {s.proof_url && (
                <a href={s.proof_url} target="_blank" rel="noreferrer" className="text-sm text-mint-400 hover:underline mt-1 inline-block break-all">
                  {s.proof_url}
                </a>
              )}

              {s.status === 'pending' && (
                <div className="mt-4 pt-4 border-t border-base-700">
                  {rejectingId === s.id ? (
                    <div className="space-y-2">
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
                    <div className="flex gap-2">
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
                <div className="mt-3 rounded-lg bg-signal-rose/10 border border-signal-rose/20 px-3 py-2 text-sm text-signal-rose">
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
