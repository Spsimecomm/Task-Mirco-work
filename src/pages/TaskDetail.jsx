import React, { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, ClipboardList, Users, Loader2, CheckCircle2, Upload, X, Tag, Calendar, ShieldAlert } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { ErrorBanner, FormattedTaskText } from '../components/Shared'

const categoryColors = {
  'Social Media': 'bg-[#EEF2FF] text-[#3730A3] border-[#C7D2FE] dark:bg-[#1E1B4B] dark:text-[#818CF8] dark:border-[#3730A3]',
  'Sign Up': 'bg-[#DCFCE7] text-[#166534] border-[#BBF7D0] dark:bg-[#064E3B] dark:text-[#34D399] dark:border-[#047857]',
  'Video Watching': 'bg-[#FFE4E6] text-[#9F1239] border-[#FECDD3] dark:bg-[#4C0519] dark:text-[#FB7185] dark:border-[#9F1239]',
  'Data Entry': 'bg-[#FEF3C7] text-[#92400E] border-[#FDE68A] dark:bg-[#451A03] dark:text-[#FBBF24] dark:border-[#78350F]',
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
    return <div className="p-16 text-center text-sm text-slate-500 dark:text-slate-400">Loading task…</div>
  }
  if (!task) {
    return <div className="p-16 text-center text-sm text-slate-500 dark:text-slate-400">Task not found.</div>
  }

  const slotsLeft = task.slots_total - task.slots_filled
  const isFull = slotsLeft <= 0

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-8 space-y-6">
      <button onClick={() => navigate(-1)} className="btn-ghost -ml-2 text-sm font-medium">
        <ArrowLeft size={16} /> Back to tasks
      </button>

      {/* Main Task Header & Details Card */}
      <div className="card p-6 sm:p-7 space-y-6 rounded-xl">
        {/* Top bar: Category Badge & Prominent Large Green Reward */}
        <div className="flex items-center justify-between gap-3">
          <span className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1 text-xs font-semibold border ${categoryColors[task.category] || 'bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-white/10'}`}>
            <Tag size={12} className="shrink-0" />
            {task.category}
          </span>
          <div className="text-right">
            <span className="text-2xl sm:text-3xl font-display font-extrabold text-mint-500 leading-none tracking-tight">
              ${Number(task.reward).toFixed(2)}
            </span>
            <span className="block text-[11px] font-medium text-slate-400 dark:text-slate-500 mt-1">per submission</span>
          </div>
        </div>

        {/* Task Title: Big and Bold */}
        <div className="space-y-2">
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-[#F1F5F9] leading-snug">
            {task.title}
          </h1>

          {/* Meta Info: Small and Muted */}
          <div className="flex items-center flex-wrap gap-4 text-xs sm:text-sm font-normal text-slate-500 dark:text-slate-400 pt-1">
            <span className="flex items-center gap-1.5">
              <Users size={14} className="text-slate-400 dark:text-slate-500 shrink-0" />
              <span>{slotsLeft > 0 ? `${slotsLeft} of ${task.slots_total} spots left` : 'All spots filled'}</span>
            </span>
            <span className="flex items-center gap-1.5">
              <Calendar size={14} className="text-slate-400 dark:text-slate-500 shrink-0" />
              <span>Posted on {new Date(task.created_at).toLocaleDateString()}</span>
            </span>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-slate-100 dark:border-white/5" />

        {/* Description Section */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-[#F1F5F9] flex items-center gap-2">
            <ClipboardList size={16} className="text-mint-500 shrink-0" />
            <span>কাজের বিবরণ / Task Description</span>
          </h2>
          <FormattedTaskText text={task.description} />
        </div>

        {/* Proof Required Section (Consistent Styled Callout Card) */}
        <div className="rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-white/10 p-4 sm:p-5 space-y-2.5">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-[#F1F5F9] flex items-center gap-2">
            <CheckCircle2 size={16} className="text-mint-500 shrink-0" />
            <span>প্রমাণের নির্দেশাবলী / Proof Required</span>
          </h3>
          <FormattedTaskText text={task.proof_instructions} />
        </div>
      </div>

      {/* Submission State or Form */}
      {done ? (
        <div className="card p-6 sm:p-8 flex flex-col items-center text-center gap-3 rounded-xl">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-mint-500/10 text-mint-500">
            <CheckCircle2 size={28} />
          </div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-[#F1F5F9]">Submission sent successfully!</h2>
          <p className="text-sm font-normal text-slate-600 dark:text-slate-400 max-w-md">
            The employer will review your submitted proof. Your payment will be released upon approval.
          </p>
          <Link to="/my-submissions" className="btn-primary mt-2">
            View my submissions
          </Link>
        </div>
      ) : alreadyApplied ? (
        <div className="card p-6 text-center text-sm font-normal text-slate-600 dark:text-slate-400 rounded-xl">
          You have already submitted proof for this task. Check your status in{' '}
          <Link to="/my-submissions" className="text-mint-500 font-semibold hover:underline">
            My submissions
          </Link>.
        </div>
      ) : isFull ? (
        <div className="card p-6 text-center text-sm font-normal text-slate-600 dark:text-slate-400 rounded-xl">
          This task is full — all spots have been taken. Browse other available tasks in the marketplace.
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="card p-6 sm:p-7 space-y-5 rounded-xl">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-[#F1F5F9] flex items-center gap-2">
              <Upload size={18} className="text-mint-500 shrink-0" />
              <span>Submit your proof</span>
            </h2>
            <p className="text-xs sm:text-sm font-normal text-slate-500 dark:text-slate-400 mt-1">
              Follow the instructions above carefully to avoid rejection.
            </p>
          </div>

          <div>
            <label className="label">Proof description / Text</label>
            <textarea
              required
              rows={4}
              className="input leading-relaxed font-normal"
              placeholder="Enter details about your work (username, profile link, transaction ID, comments, etc.)…"
              value={proofText}
              onChange={(e) => setProofText(e.target.value)}
              onPaste={(e) => {
                const text = e.clipboardData?.getData('text/plain')
                if (text !== undefined && text !== null) {
                  e.preventDefault()
                  const clean = text.replace(/[\u200B-\u200D\uFEFF]/g, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n')
                  const target = e.target
                  const start = target.selectionStart ?? target.value.length
                  const end = target.selectionEnd ?? target.value.length
                  const updated = proofText.slice(0, start) + clean + proofText.slice(end)
                  setProofText(updated)
                  requestAnimationFrame(() => {
                    if (target?.setSelectionRange) {
                      target.setSelectionRange(start + clean.length, start + clean.length)
                    }
                  })
                }
              }}
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
              <div className="relative rounded-xl overflow-hidden border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-900 p-2">
                <img src={imagePreview} alt="Proof preview" className="w-full max-h-64 object-contain rounded-lg mx-auto" />
                <button
                  type="button"
                  onClick={clearImage}
                  className="absolute top-3 right-3 rounded-lg bg-slate-900/80 p-1.5 text-slate-300 hover:text-white hover:bg-slate-900 transition"
                  aria-label="Remove image"
                >
                  <X size={16} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center justify-center w-full rounded-xl border-2 border-dashed border-slate-300 dark:border-white/10 hover:border-mint-500/50 bg-slate-50 dark:bg-slate-900/50 px-4 py-7 transition cursor-pointer"
              >
                <Upload size={22} className="text-slate-400 mb-2" />
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Click to upload screenshot</span>
                <span className="text-xs font-normal text-slate-500 mt-1">JPEG, PNG, WebP, or GIF — max 10 MB</span>
              </button>
            )}
            {uploading && (
              <p className="text-xs font-medium text-mint-500 mt-2 flex items-center gap-1.5">
                <Loader2 size={12} className="animate-spin" /> Uploading image…
              </p>
            )}
          </div>

          <div>
            <label className="label">Or paste a screenshot / proof URL (optional)</label>
            <input
              type="url"
              className="input font-normal"
              placeholder="https://…"
              value={proofUrl}
              disabled={!!imageFile}
              onChange={(e) => setProofUrl(e.target.value)}
            />
          </div>

          <ErrorBanner message={error} />

          <button type="submit" disabled={submitting} className="btn-primary w-full py-3.5 text-sm font-bold rounded-xl shadow-md">
            {submitting && <Loader2 size={16} className="animate-spin" />}
            {submitting ? 'Submitting proof…' : 'Submit proof for review'}
          </button>
        </form>
      )}
    </div>
  )
}

