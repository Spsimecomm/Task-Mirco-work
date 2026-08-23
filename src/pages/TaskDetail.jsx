import React, { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, ClipboardList, Users, Loader2, CheckCircle2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { ErrorBanner } from '../components/Shared'

const categoryColors = {
  'Social Media': 'bg-signal-indigo/10 text-signal-indigo',
  'Sign Up': 'bg-mint-500/10 text-mint-400',
  'Video Watching': 'bg-signal-rose/10 text-signal-rose',
  'Data Entry': 'bg-signal-amber/10 text-signal-amber',
}

export default function TaskDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user, refreshProfile } = useAuth()
  const [task, setTask] = useState(null)
  const [loading, setLoading] = useState(true)
  const [proofText, setProofText] = useState('')
  const [proofUrl, setProofUrl] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [alreadyApplied, setAlreadyApplied] = useState(false)

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from('tasks').select('*').eq('id', id).single()
      setTask(data)
      const { data: existing } = await supabase
        .from('submissions')
        .select('id')
        .eq('task_id', id)
        .eq('worker_id', user.id)
        .maybeSingle()
      setAlreadyApplied(!!existing)
      setLoading(false)
    }
    load()
  }, [id, user])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const { error: rpcError } = await supabase.rpc('submit_task_proof', {
        p_task_id: id,
        p_proof_text: proofText,
        p_proof_url: proofUrl || null,
      })
      if (rpcError) throw rpcError
      setDone(true)
      refreshProfile()
    } catch (err) {
      setError(err.message || 'Could not submit proof.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return <div className="p-10 text-center text-sm text-slate-500">Loading task…</div>
  }
  if (!task) {
    return <div className="p-10 text-center text-sm text-slate-500">Task not found.</div>
  }

  const slotsLeft = task.slots_total - task.slots_filled
  const isFull = slotsLeft <= 0

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-8 space-y-6">
      <button onClick={() => navigate(-1)} className="btn-ghost -ml-3">
        <ArrowLeft size={16} /> Back
      </button>

      <div className="card p-6 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <span className={`badge ${categoryColors[task.category] || 'bg-base-700 text-slate-300'}`}>
            {task.category}
          </span>
          <span className="text-2xl font-display font-bold text-mint-400">${Number(task.reward).toFixed(2)}</span>
        </div>
        <h1 className="text-xl font-bold text-white">{task.title}</h1>
        <p className="text-sm text-slate-400 flex items-center gap-1.5">
          <Users size={14} /> {slotsLeft > 0 ? `${slotsLeft} of ${task.slots_total} spots left` : 'All spots filled'}
        </p>

        <div>
          <h3 className="text-sm font-semibold text-white mb-1.5">Description</h3>
          <p className="text-sm text-slate-400 whitespace-pre-line">{task.description}</p>
        </div>

        <div className="rounded-lg bg-base-900 border border-base-700 p-4">
          <h3 className="text-sm font-semibold text-white mb-1.5 flex items-center gap-1.5">
            <ClipboardList size={15} className="text-mint-400" /> Proof required
          </h3>
          <p className="text-sm text-slate-400 whitespace-pre-line">{task.proof_instructions}</p>
        </div>
      </div>

      {done ? (
        <div className="card p-6 flex flex-col items-center text-center gap-2">
          <CheckCircle2 className="text-mint-400" size={32} />
          <p className="text-white font-semibold">Submission sent</p>
          <p className="text-sm text-slate-500">The employer will review your proof and release payment once approved.</p>
          <Link to="/my-submissions" className="btn-primary mt-2">View my submissions</Link>
        </div>
      ) : alreadyApplied ? (
        <div className="card p-6 text-center text-sm text-slate-400">
          You've already submitted proof for this task. Check{' '}
          <Link to="/my-submissions" className="text-mint-400 hover:underline">My submissions</Link>.
        </div>
      ) : isFull ? (
        <div className="card p-6 text-center text-sm text-slate-400">This task is full — check back later or browse other tasks.</div>
      ) : (
        <form onSubmit={handleSubmit} className="card p-6 space-y-4">
          <h3 className="font-semibold text-white">Submit your proof</h3>
          <div>
            <label className="label">Proof description</label>
            <textarea
              required
              rows={4}
              className="input"
              placeholder="Describe what you did to complete this task…"
              value={proofText}
              onChange={(e) => setProofText(e.target.value)}
            />
          </div>
          <div>
            <label className="label">Screenshot / proof URL (optional)</label>
            <input
              type="url"
              className="input"
              placeholder="https://…"
              value={proofUrl}
              onChange={(e) => setProofUrl(e.target.value)}
            />
          </div>
          <ErrorBanner message={error} />
          <button type="submit" disabled={submitting} className="btn-primary w-full">
            {submitting && <Loader2 size={16} className="animate-spin" />}
            Submit for review
          </button>
        </form>
      )}
    </div>
  )
}
