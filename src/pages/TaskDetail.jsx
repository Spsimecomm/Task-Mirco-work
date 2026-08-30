import React, { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  ArrowLeft,
  ClipboardList,
  Users,
  Loader2,
  CheckCircle2,
  Upload,
  X,
  Calendar,
  Share2,
  UserPlus,
  PlayCircle,
  FileSpreadsheet,
  Tag
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { ErrorBanner, FormattedTaskText } from '../components/Shared'

const categoryConfig = {
  'Social Media': {
    icon: Share2,
    badge: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
  },
  'Sign Up': {
    icon: UserPlus,
    badge: 'bg-emerald-500/10 text-emerald-600 dark:text-brand-primary border-emerald-500/20',
  },
  'Video Watching': {
    icon: PlayCircle,
    badge: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
  },
  'Data Entry': {
    icon: FileSpreadsheet,
    badge: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
  },
}

export default function TaskDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user, role, refreshProfile } = useAuth()
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

    if (role !== 'worker') {
      setError('Unauthorized: Only registered workers can submit task proofs.')
      return
    }

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
  const config = categoryConfig[task.category] || {
    icon: Tag,
    badge: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20',
  }
  const CategoryIcon = config.icon

  return (
    <div className="space-y-6 animate-in fade-in duration-300 max-w-4xl mx-auto">
      <button
        onClick={() => (role === 'worker' ? navigate('/marketplace') : navigate('/dashboard'))}
        className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-[#64748B] dark:text-slate-400 hover:text-[#1E293B] dark:hover:text-white transition"
      >
        <ArrowLeft size={16} />
        <span>{role === 'worker' ? 'Back to marketplace' : 'Back to dashboard'}</span>
      </button>

      {/* Main Task Header & Details Card */}
      <div className="card rounded-2xl bg-white dark:bg-[#111827] border border-[#CBD5E1] dark:border-[#2A3348] p-6 sm:p-8 space-y-6 shadow-sm">
        {/* Top bar: Category Badge & Reward */}
        <div className="flex items-center justify-between gap-3">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1 text-xs font-semibold border ${config.badge}`}
          >
            <CategoryIcon size={13} className="shrink-0" />
            <span>{task.category}</span>
          </span>
          <div className="text-right">
            <span className="text-2xl sm:text-3xl font-display font-extrabold text-emerald-600 dark:text-brand-primary leading-none tracking-tight">
              ${Number(task.reward).toFixed(2)}
            </span>
            <span className="block text-[11px] font-medium text-slate-400 dark:text-slate-500 mt-1">
              per submission
            </span>
          </div>
        </div>

        {/* Task Title */}
        <div className="space-y-2">
          <h1 className="text-xl sm:text-2xl font-display font-bold text-[#1E293B] dark:text-[#F1F5F9] leading-snug">
            {task.title}
          </h1>

          {/* Meta Info */}
          <div className="flex items-center flex-wrap gap-4 text-xs sm:text-sm font-normal text-[#64748B] dark:text-slate-400 pt-1">
            <span className="flex items-center gap-1.5">
              <Users size={14} className="text-slate-400 dark:text-slate-500 shrink-0" />
              <span>{slotsLeft > 0 ? `${slotsLeft} of ${task.slots_total} spots left` : 'All spots filled'}</span>
            </span>
            <span className="flex items-center gap-1.5">
              <Calendar size={14} className="text-slate-400 dark:text-slate-500 shrink-0" />
              <span>
                Posted on{' '}
                {new Date(task.created_at).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </span>
            </span>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-[#E2E8F0] dark:border-[#2A3348]" />

        {/* Description Section */}
        <div className="space-y-3">
          <h2 className="text-sm font-bold text-[#1E293B] dark:text-[#F1F5F9] flex items-center gap-2">
            <ClipboardList size={16} className="text-brand-primary shrink-0" />
            <span>Task Instructions / বিবরণ</span>
          </h2>
          <FormattedTaskText text={task.description} />
        </div>

        {/* Proof Required Section */}
        <div className="rounded-xl bg-[#F8FAFC] dark:bg-[#1E293B]/70 border border-[#CBD5E1] dark:border-[#2A3348] p-4 sm:p-5 space-y-2.5">
          <h3 className="text-sm font-bold text-[#1E293B] dark:text-[#F1F5F9] flex items-center gap-2">
            <CheckCircle2 size={16} className="text-brand-primary shrink-0" />
            <span>Proof Required / প্রমাণের নির্দেশাবলী</span>
          </h3>
          <FormattedTaskText text={task.proof_instructions} />
        </div>
      </div>

      {/* Submission State or Form (Strictly Worker Role Only) */}
      {role !== 'worker' ? (
        <div className="card rounded-2xl bg-amber-500/10 dark:bg-amber-950/20 border border-amber-500/20 p-6 sm:p-8 text-center space-y-3 shadow-sm">
          <div className="flex h-12 w-12 mx-auto items-center justify-center rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400">
            <ClipboardList size={24} />
          </div>
          <h2 className="text-base sm:text-lg font-display font-bold text-[#1E293B] dark:text-[#F1F5F9]">
            {role === 'employer' ? 'Employer View Mode' : 'Admin Inspection Mode'}
          </h2>
          <p className="text-xs sm:text-sm font-normal text-[#64748B] dark:text-slate-400 max-w-md mx-auto">
            {role === 'employer'
              ? 'You are viewing this task in Employer mode. Only registered Workers are authorized to submit work proofs and earn rewards.'
              : 'You are viewing this task in Administrator audit mode. Task submissions are reserved exclusively for Workers.'}
          </p>
          <div className="pt-2">
            <Link
              to={role === 'employer' ? '/employer' : '/admin'}
              className="inline-flex items-center gap-2 rounded-xl bg-brand-primary px-4 py-2 text-xs sm:text-sm font-bold text-white shadow-sm hover:bg-emerald-600 transition"
            >
              <span>Back to Dashboard</span>
            </Link>
          </div>
        </div>
      ) : done ? (
        <div className="card rounded-2xl bg-white dark:bg-[#111827] border border-[#CBD5E1] dark:border-[#2A3348] p-6 sm:p-8 flex flex-col items-center text-center gap-3 shadow-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-brand-primary">
            <CheckCircle2 size={28} />
          </div>
          <h2 className="text-lg font-bold text-[#1E293B] dark:text-[#F1F5F9]">Submission sent successfully!</h2>
          <p className="text-xs sm:text-sm font-normal text-[#64748B] dark:text-slate-400 max-w-md">
            The employer will review your submitted proof. Your payment will be credited to your balance upon approval.
          </p>
          <Link
            to="/my-submissions"
            className="inline-flex items-center gap-2 rounded-xl bg-brand-primary px-5 py-2.5 text-xs sm:text-sm font-bold text-white shadow-md hover:bg-emerald-600 transition mt-2"
          >
            <span>View my submissions</span>
          </Link>
        </div>
      ) : alreadyApplied ? (
        <div className="card rounded-2xl bg-white dark:bg-[#111827] border border-[#CBD5E1] dark:border-[#2A3348] p-6 text-center text-xs sm:text-sm font-normal text-[#64748B] dark:text-slate-400 shadow-sm">
          You have already submitted proof for this task.{' '}
          <Link to="/my-submissions" className="text-brand-primary font-bold hover:underline">
            Check your submission status in My Submissions →
          </Link>
        </div>
      ) : isFull ? (
        <div className="card rounded-2xl bg-white dark:bg-[#111827] border border-[#CBD5E1] dark:border-[#2A3348] p-6 text-center text-xs sm:text-sm font-normal text-[#64748B] dark:text-slate-400 shadow-sm">
          This task is full — all available spots have been completed.
        </div>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="card rounded-2xl bg-white dark:bg-[#111827] border border-[#CBD5E1] dark:border-[#2A3348] p-6 sm:p-8 space-y-5 shadow-sm"
        >
          <div>
            <h2 className="text-base sm:text-lg font-display font-bold text-[#1E293B] dark:text-[#F1F5F9] flex items-center gap-2">
              <Upload size={18} className="text-brand-primary shrink-0" />
              <span>Submit Your Proof</span>
            </h2>
            <p className="text-xs sm:text-sm font-normal text-[#64748B] dark:text-slate-400 mt-1">
              Follow the instructions above carefully to guarantee speedy approval.
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#1E293B] dark:text-slate-200 uppercase tracking-wider mb-2">
              Proof Details / Text
            </label>
            <textarea
              required
              rows={4}
              className="w-full rounded-xl border border-[#CBD5E1] dark:border-[#2A3348] bg-white dark:bg-[#0B0F17] p-3.5 text-xs sm:text-sm text-[#1E293B] dark:text-[#F1F5F9] placeholder-slate-400 dark:placeholder-slate-500 outline-none transition focus:border-brand-primary focus:ring-1 focus:ring-brand-primary leading-relaxed"
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
            <label className="block text-xs font-bold text-[#1E293B] dark:text-slate-200 uppercase tracking-wider mb-2">
              Screenshot / Proof Image
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={handleFileChange}
            />
            {imagePreview ? (
              <div className="relative rounded-xl overflow-hidden border border-[#CBD5E1] dark:border-[#2A3348] bg-[#F8FAFC] dark:bg-[#0B0F17] p-3">
                <img
                  src={imagePreview}
                  alt="Proof preview"
                  className="w-full max-h-64 object-contain rounded-lg mx-auto"
                />
                <button
                  type="button"
                  onClick={clearImage}
                  className="absolute top-4 right-4 rounded-lg bg-slate-900/80 p-1.5 text-slate-300 hover:text-white hover:bg-slate-900 transition"
                  aria-label="Remove image"
                >
                  <X size={16} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center justify-center w-full rounded-xl border-2 border-dashed border-[#CBD5E1] dark:border-[#2A3348] hover:border-brand-primary bg-[#F8FAFC] dark:bg-[#0B0F17]/50 px-4 py-7 transition cursor-pointer"
              >
                <Upload size={22} className="text-slate-400 dark:text-slate-500 mb-2" />
                <span className="text-xs sm:text-sm font-semibold text-[#1E293B] dark:text-slate-300">
                  Click to upload screenshot
                </span>
                <span className="text-[11px] text-[#64748B] dark:text-slate-500 mt-1">
                  JPEG, PNG, WebP, or GIF — max 10 MB
                </span>
              </button>
            )}
            {uploading && (
              <p className="text-xs font-medium text-brand-primary mt-2 flex items-center gap-1.5">
                <Loader2 size={12} className="animate-spin" /> Uploading image…
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-[#1E293B] dark:text-slate-200 uppercase tracking-wider mb-2">
              Or paste a screenshot link / URL (optional)
            </label>
            <input
              type="url"
              className="w-full rounded-xl border border-[#CBD5E1] dark:border-[#2A3348] bg-white dark:bg-[#0B0F17] px-3.5 py-2.5 text-xs sm:text-sm text-[#1E293B] dark:text-[#F1F5F9] placeholder-slate-400 dark:placeholder-slate-500 outline-none transition focus:border-brand-primary focus:ring-1 focus:ring-brand-primary"
              placeholder="https://…"
              value={proofUrl}
              disabled={!!imageFile}
              onChange={(e) => setProofUrl(e.target.value)}
            />
          </div>

          <ErrorBanner message={error} />

          <button
            type="submit"
            disabled={submitting}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-brand-primary py-3.5 text-xs sm:text-sm font-bold text-white shadow-md shadow-brand-primary/20 hover:bg-emerald-600 transition"
          >
            {submitting && <Loader2 size={16} className="animate-spin" />}
            <span>{submitting ? 'Submitting proof…' : 'Submit proof for review'}</span>
          </button>
        </form>
      )}
    </div>
  )
}


