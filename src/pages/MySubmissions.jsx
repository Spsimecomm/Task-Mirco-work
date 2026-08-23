import React, { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { StatusBadge, EmptyState } from '../components/Shared'
import { ClipboardCheck } from 'lucide-react'

export default function MySubmissions() {
  const { user } = useAuth()
  const [submissions, setSubmissions] = useState([])
  const [loading, setLoading] = useState(true)

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

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">My submissions</h1>
        <p className="text-sm text-slate-500 mt-1">Track the status of every proof you've submitted.</p>
      </div>

      {loading ? (
        <div className="text-sm text-slate-500 py-16 text-center">Loading…</div>
      ) : submissions.length === 0 ? (
        <EmptyState icon={ClipboardCheck} title="No submissions yet" subtitle="Accept a task from the marketplace to get started." />
      ) : (
        <div className="space-y-3">
          {submissions.map((s) => (
            <div key={s.id} className="card p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-white">{s.tasks?.title}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{s.tasks?.category} · {new Date(s.created_at).toLocaleString()}</p>
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
