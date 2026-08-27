import React, { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, ClipboardList, Users, Loader2, CheckCircle2, Upload, X, ImageIcon } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { ErrorBanner } from '../components/Shared'
import { handleSanitizedPaste, formatMoney } from '../lib/utils'

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
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef(null)
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

  const MAX_FILE_SIZE = 10 * 1024 * 1024
  const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

  const handleFileChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setError('')
    if (!ALLOWED_TYPES.includes(file.type)) {
      setError('Please select a valid image file (JPEG, PNG, WebP, or GIF).')
      return
    }
    if (file.size > MAX_FILE_SIZE) {
      setError('Image must be smaller than 10 MB.')
      return
    }
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
    setProofUrl('')
  }

  const clearImage = () => {
    setImageFile(null)
    if (imagePreview) URL.revokeObjectURL(imagePreview)
    setImagePreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const uploadImage = async () => {
    if (!imageFile) return null
    setUploading(true)
    const ext = imageFile.name.split('.').pop()
    const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
    const { error: uploadError } = await supabase.storage
      .from('task-proofs')
      .upload(fileName, imageFile, { contentType: imageFile.type, upsert: false })
    setUploading(false)
    if (uploadError) throw new Error(uploadError.message || 'Could not upload image.')
    const { data } = supabase.storage.from('task-proofs').getPublicUrl(fileName)
    return data.publicUrl
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      let finalProofUrl = proofUrl || null
      if (imageFile) {
        finalProofUrl = await uploadImage()
      }
      const { error: rpcError } = await supabase.rpc('submit_task_proof', {
        p_task_id: id,
        p_proof_text: proofText,
        p_proof_url: finalProofUrl,
      })
      if (rpcError) throw rpcError
      clearImage()
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
          <span className="text-2xl font-display font-bold text-mint-400">{formatMoney(task.reward)}</span>
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
              className="input leading-relaxed"
              placeholder="Describe what you did to complete this task (copy/paste URLs, proof notes, etc.)…"
              value={proofText}
              onChange={(e) => setProofText(e.target.value)}
              onPaste={(e) => handleSanitizedPaste(e, proofText, setProofText, false)}
            />
          </div>
          <div>
            <label className="label">Screenshot / proof image</label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={handleFileChange}
            />
            {imagePreview ? (
              <div className="relative rounded-lg overflow-hidden border border-base-600 bg-base-900">
                <img src={imagePreview} alt="Proof preview" className="w-full max-h-64 object-contain" />
                <button
                  type="button"
                  onClick={clearImage}
                  className="absolute top-2 right-2 rounded-lg bg-base-950/80 p-1.5 text-slate-300 hover:text-white hover:bg-base-950 transition"
                >
                  <X size={16} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center justify-center w-full rounded-lg border-2 border-dashed border-base-600 hover:border-mint-500/50 bg-base-900 px-4 py-8 transition cursor-pointer"
              >
                <Upload size={24} className="text-slate-500 mb-2" />
                <span className="text-sm text-slate-400">Click to upload a screenshot</span>
                <span className="text-xs text-slate-600 mt-1">JPEG, PNG, WebP, or GIF — max 10 MB</span>
              </button>
            )}
            {uploading && (
              <p className="text-xs text-mint-400 mt-2 flex items-center gap-1.5">
                <Loader2 size={12} className="animate-spin" /> Uploading image…
              </p>
            )}
          </div>
          <div>
            <label className="label">Or paste a screenshot / proof URL (optional)</label>
            <input
              type="url"
              className="input"
              placeholder="https://…"
              value={proofUrl}
              disabled={!!imageFile}
              onChange={(e) => setProofUrl(e.target.value)}
              onPaste={(e) => handleSanitizedPaste(e, proofUrl, setProofUrl, true)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') e.preventDefault()
              }}
            />
          </div>
          <ErrorBanner message={error} />
          <button type="submit" disabled={submitting} className="btn-primary w-full">
            {submitting && <Loader2 size={16} className="animate-spin" />}
            {submitting ? 'Submitting…' : 'Submit for review'}
          </button>
        </form>
      )}
    </div>
  )
}

