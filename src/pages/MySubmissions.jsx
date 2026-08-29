import React, { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { StatusBadge, EmptyState, isSafeUrl } from '../components/Shared'
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
        <h1 className="text-2xl font-bold text-[#1E293B] dark:text-[#F1F5F9]">My submissions</h1>
        <p className="text-sm font-normal text-[#64748B] dark:text-slate-400 mt-1">Track the status of every proof you've submitted.</p>
      </div>

      {loading ? (
        <div className="text-sm text-[#64748B] dark:text-slate-400 py-16 text-center">Loading…</div>
      ) : submissions.length === 0 ? (
        <EmptyState icon={ClipboardCheck} title="No submissions yet" subtitle="Accept a task from the marketplace to get started." />
      ) : (
        <div className="space-y-4">
          {submissions.map((s) => (
            <div key={s.id} className="card p-5 sm:p-6 rounded-xl bg-white dark:bg-[#1E293B] border border-[#CBD5E1] dark:border-white/10 hover:border-slate-400 dark:hover:border-white/20 transition-all">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-bold text-base text-[#1E293B] dark:text-[#F1F5F9]">{s.tasks?.title}</p>
                  <p className="text-xs text-[#64748B] dark:text-slate-400 mt-1">
                    {s.tasks?.category && (
                      <span className="inline-block font-medium mr-1.5">{s.tasks.category} ·</span>
                    )}
                    {new Date(s.created_at).toLocaleString()}
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
