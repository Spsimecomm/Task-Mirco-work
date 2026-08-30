import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2, PlusCircle, RotateCcw, Sparkles, CheckCircle2, AlertCircle } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { ErrorBanner } from '../components/Shared'

const CATEGORIES = ['Social Media', 'Sign Up', 'Video Watching', 'Data Entry']
const DRAFT_STORAGE_KEY = 'taskly_create_task_draft'

const INITIAL_FORM = {
  title: '',
  category: CATEGORIES[0],
  description: '',
  proofInstructions: '',
  reward: '',
  slots: 10,
}

export default function CreateTask() {
  const { profile, refreshProfile } = useAuth()
  const navigate = useNavigate()

  // Initialize from sessionStorage draft if available
  const [form, setForm] = useState(() => {
    try {
      const saved = sessionStorage.getItem(DRAFT_STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        return { ...INITIAL_FORM, ...parsed }
      }
    } catch {
      // ignore parse errors
    }
    return INITIAL_FORM
  })

  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [pasteNotice, setPasteNotice] = useState('')
  const pasteNoticeTimerRef = useRef(null)

  // Save to sessionStorage whenever form values change
  useEffect(() => {
    try {
      sessionStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(form))
    } catch {
      // ignore storage quota errors
    }
  }, [form])

  // Clear timer on unmount
  useEffect(() => {
    return () => {
      if (pasteNoticeTimerRef.current) {
        clearTimeout(pasteNoticeTimerRef.current)
      }
    }
  }, [])

  const showTemporaryNotice = (msg) => {
    if (pasteNoticeTimerRef.current) clearTimeout(pasteNoticeTimerRef.current)
    setPasteNotice(msg)
    pasteNoticeTimerRef.current = setTimeout(() => {
      setPasteNotice('')
    }, 3000)
  }

  const handleClearDraft = () => {
    setForm(INITIAL_FORM)
    setError('')
    try {
      sessionStorage.removeItem(DRAFT_STORAGE_KEY)
    } catch {}
  }

  // Sanitizes text from external sources (e.g. Gemini, ChatGPT, Word, PDF, Web)
  // Strips zero-width characters and normalizes line endings
  const sanitizePastedText = (rawText, isSingleLine = false) => {
    if (typeof rawText !== 'string') return ''
    // Remove zero-width spaces and weird control characters, normalize line endings
    let sanitized = rawText
      .replace(/[\u200B-\u200D\uFEFF]/g, '')
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')

    if (isSingleLine) {
      // In single line fields (title, numbers), replace linebreaks with spaces
      sanitized = sanitized.replace(/\n+/g, ' ').trim()
    }
    return sanitized
  }

  // Generic input change handler
  const handleChange = (field, value) => {
    if (error) setError('')
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  // Dedicated paste handler for single-line input fields
  const handleSingleLinePaste = (field, e) => {
    // Read plain text from clipboard
    const clipboardData = e.clipboardData || window.clipboardData
    if (!clipboardData) return // allow native paste fallback

    const rawText = clipboardData.getData('text/plain')
    if (rawText !== undefined && rawText !== null) {
      e.preventDefault() // prevent browser from treating newlines as Enter key / form submit
      const cleaned = sanitizePastedText(rawText, true)

      // Insert at current selection
      const target = e.target
      const start = target.selectionStart ?? target.value.length
      const end = target.selectionEnd ?? target.value.length
      const currentValue = form[field] || ''
      const newValue = currentValue.slice(0, start) + cleaned + currentValue.slice(end)

      handleChange(field, newValue)

      // Restore cursor position after state update
      requestAnimationFrame(() => {
        if (target && target.setSelectionRange) {
          const newCursorPos = start + cleaned.length
          target.setSelectionRange(newCursorPos, newCursorPos)
        }
      })

      showTemporaryNotice(`Pasted clean text into ${field}`)
    }
  }

  // Dedicated paste handler for multi-line textareas (description, proof instructions)
  const handleTextareaPaste = (field, e) => {
    const clipboardData = e.clipboardData || window.clipboardData
    if (!clipboardData) return // allow native fallback

    const rawText = clipboardData.getData('text/plain')
    if (rawText !== undefined && rawText !== null) {
      e.preventDefault() // prevent any weird HTML rich text or bubbling
      const cleaned = sanitizePastedText(rawText, false)

      // Insert at current cursor selection
      const target = e.target
      const start = target.selectionStart ?? target.value.length
      const end = target.selectionEnd ?? target.value.length
      const currentValue = form[field] || ''
      const newValue = currentValue.slice(0, start) + cleaned + currentValue.slice(end)

      handleChange(field, newValue)

      // Restore cursor position
      requestAnimationFrame(() => {
        if (target && target.setSelectionRange) {
          const newCursorPos = start + cleaned.length
          target.setSelectionRange(newCursorPos, newCursorPos)
        }
      })

      showTemporaryNotice(`Clean content pasted from clipboard`)
    }
  }

  // Prevent accidental Enter key submissions while focusing on single-line inputs
  const handleInputKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault() // Do not submit form prematurely on Enter key
    }
  }

  const totalCost = (Number(form.reward) || 0) * (Number(form.slots) || 0)
  const userBalance = Number(profile?.deposited ?? 0)
  const insufficientFunds = totalCost > userBalance

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!form.title.trim()) {
      setError('Please provide a task title.')
      return
    }

    if (!form.description.trim()) {
      setError('Please provide a detailed task description.')
      return
    }

    if (!form.proofInstructions.trim()) {
      setError('Please provide the required proof instructions.')
      return
    }

    if (!form.reward || Number(form.reward) <= 0) {
      setError('Please provide a valid reward amount per worker.')
      return
    }

    if (!form.slots || Number(form.slots) <= 0) {
      setError('Please specify at least 1 worker slot.')
      return
    }

    if (insufficientFunds) {
      setError(`Insufficient balance ($${userBalance.toFixed(2)}). You need $${totalCost.toFixed(2)} to post this task. Please deposit funds first.`)
      return
    }

    setLoading(true)
    try {
      const { error: rpcError } = await supabase.rpc('create_task_with_funding', {
        p_title: form.title.trim(),
        p_category: form.category,
        p_description: form.description.trim(),
        p_proof_instructions: form.proofInstructions.trim(),
        p_reward: Number(form.reward),
        p_slots: Number(form.slots),
      })

      if (rpcError) throw rpcError

      // Clear the saved draft on successful creation
      try {
        sessionStorage.removeItem(DRAFT_STORAGE_KEY)
      } catch {}

      await refreshProfile()
      navigate('/employer')
    } catch (err) {
      console.error('Error creating task:', err)
      setError(err.message || 'Could not create task. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const hasDraftContent = Boolean(
    form.title || form.description || form.proofInstructions || form.reward
  )

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-300 max-w-3xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="font-display font-extrabold text-2xl sm:text-3xl text-[#1E293B] dark:text-[#F1F5F9] tracking-tight">
            Post a New Task
          </h1>
          <p className="text-xs sm:text-sm font-normal text-[#64748B] dark:text-slate-400 mt-1">
            Available employer balance:{' '}
            <span className="text-emerald-600 dark:text-brand-primary font-extrabold">
              ${userBalance.toFixed(2)}
            </span>
          </p>
        </div>

        {hasDraftContent && (
          <button
            type="button"
            onClick={handleClearDraft}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#64748B] dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition self-start sm:self-auto bg-white dark:bg-[#111827] border border-[#CBD5E1] dark:border-[#2A3348] px-3 py-1.5 rounded-xl shadow-sm"
            title="Reset form and remove saved draft"
          >
            <RotateCcw size={13} /> Clear Draft
          </button>
        )}
      </div>

      {pasteNotice && (
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-brand-primary text-xs animate-fade-in font-bold">
          <Sparkles size={14} className="shrink-0" />
          <span>{pasteNotice}</span>
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="card p-6 sm:p-8 space-y-6 rounded-2xl bg-white dark:bg-[#111827] border border-[#CBD5E1] dark:border-[#2A3348] shadow-sm"
        noValidate
      >
        {/* Task Title */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label
              className="block text-xs font-bold text-[#1E293B] dark:text-slate-200 uppercase tracking-wider"
              htmlFor="task-title"
            >
              Task Title <span className="text-rose-600">*</span>
            </label>
            <span className="text-[11px] text-[#64748B] dark:text-slate-400 font-medium">
              {form.title.length}/120
            </span>
          </div>
          <input
            id="task-title"
            required
            maxLength={120}
            className="w-full rounded-xl border border-[#CBD5E1] dark:border-[#2A3348] bg-white dark:bg-[#0B0F17] px-4 py-3 text-xs sm:text-sm text-[#1E293B] dark:text-[#F1F5F9] placeholder-slate-400 dark:placeholder-slate-500 outline-none transition focus:border-brand-primary focus:ring-1 focus:ring-brand-primary"
            placeholder="e.g. Subscribe to YouTube Channel and Like latest video"
            value={form.title}
            onChange={(e) => handleChange('title', e.target.value)}
            onPaste={(e) => handleSingleLinePaste('title', e)}
            onKeyDown={handleInputKeyDown}
            autoComplete="off"
          />
        </div>

        {/* Category Selection */}
        <div>
          <label
            className="block text-xs font-bold text-[#1E293B] dark:text-slate-200 uppercase tracking-wider mb-2"
            htmlFor="task-category"
          >
            Category <span className="text-rose-600">*</span>
          </label>
          <select
            id="task-category"
            className="w-full rounded-xl border border-[#CBD5E1] dark:border-[#2A3348] bg-white dark:bg-[#0B0F17] px-4 py-3 text-xs sm:text-sm text-[#1E293B] dark:text-[#F1F5F9] outline-none transition focus:border-brand-primary focus:ring-1 focus:ring-brand-primary"
            value={form.category}
            onChange={(e) => handleChange('category', e.target.value)}
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c} className="bg-white dark:bg-[#111827]">
                {c}
              </option>
            ))}
          </select>
        </div>

        {/* Description Textarea */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label
              className="block text-xs font-bold text-[#1E293B] dark:text-slate-200 uppercase tracking-wider"
              htmlFor="task-description"
            >
              Task Description & Instructions <span className="text-rose-600">*</span>
            </label>
            <span className="text-[11px] text-[#64748B] dark:text-slate-400">
              Supports URLs & line breaks
            </span>
          </div>
          <textarea
            id="task-description"
            required
            rows={5}
            className="w-full rounded-xl border border-[#CBD5E1] dark:border-[#2A3348] bg-white dark:bg-[#0B0F17] px-4 py-3 text-xs sm:text-sm text-[#1E293B] dark:text-[#F1F5F9] placeholder-slate-400 dark:placeholder-slate-500 outline-none transition focus:border-brand-primary focus:ring-1 focus:ring-brand-primary leading-relaxed"
            placeholder="Explain step-by-step instructions for the worker. You can include links (e.g. https://youtube.com/...) and formatting."
            value={form.description}
            onChange={(e) => handleChange('description', e.target.value)}
            onPaste={(e) => handleTextareaPaste('description', e)}
            spellCheck="true"
          />
        </div>

        {/* Required Proof Instructions */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label
              className="block text-xs font-bold text-[#1E293B] dark:text-slate-200 uppercase tracking-wider"
              htmlFor="task-proof-instructions"
            >
              Required Proof Instructions <span className="text-rose-600">*</span>
            </label>
            <span className="text-[11px] text-[#64748B] dark:text-slate-400">
              What must the worker submit?
            </span>
          </div>
          <textarea
            id="task-proof-instructions"
            required
            rows={3}
            className="w-full rounded-xl border border-[#CBD5E1] dark:border-[#2A3348] bg-white dark:bg-[#0B0F17] px-4 py-3 text-xs sm:text-sm text-[#1E293B] dark:text-[#F1F5F9] placeholder-slate-400 dark:placeholder-slate-500 outline-none transition focus:border-brand-primary focus:ring-1 focus:ring-brand-primary leading-relaxed"
            placeholder="e.g. Submit your YouTube username and a screenshot showing the subscribed button."
            value={form.proofInstructions}
            onChange={(e) => handleChange('proofInstructions', e.target.value)}
            onPaste={(e) => handleTextareaPaste('proofInstructions', e)}
            spellCheck="true"
          />
        </div>

        {/* Reward and Slots */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label
              className="block text-xs font-bold text-[#1E293B] dark:text-slate-200 uppercase tracking-wider mb-2"
              htmlFor="task-reward"
            >
              Reward Per Worker (USD) <span className="text-rose-600">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">
                $
              </span>
              <input
                id="task-reward"
                required
                type="number"
                min="0.01"
                step="0.01"
                className="w-full rounded-xl border border-[#CBD5E1] dark:border-[#2A3348] bg-white dark:bg-[#0B0F17] pl-8 pr-4 py-3 text-xs sm:text-sm text-[#1E293B] dark:text-[#F1F5F9] placeholder-slate-400 dark:placeholder-slate-500 outline-none transition focus:border-brand-primary focus:ring-1 focus:ring-brand-primary"
                placeholder="0.50"
                value={form.reward}
                onChange={(e) => handleChange('reward', e.target.value)}
                onPaste={(e) => handleSingleLinePaste('reward', e)}
                onKeyDown={handleInputKeyDown}
              />
            </div>
          </div>

          <div>
            <label
              className="block text-xs font-bold text-[#1E293B] dark:text-slate-200 uppercase tracking-wider mb-2"
              htmlFor="task-slots"
            >
              Number of Workers (Slots) <span className="text-rose-600">*</span>
            </label>
            <input
              id="task-slots"
              required
              type="number"
              min="1"
              step="1"
              className="w-full rounded-xl border border-[#CBD5E1] dark:border-[#2A3348] bg-white dark:bg-[#0B0F17] px-4 py-3 text-xs sm:text-sm text-[#1E293B] dark:text-[#F1F5F9] placeholder-slate-400 dark:placeholder-slate-500 outline-none transition focus:border-brand-primary focus:ring-1 focus:ring-brand-primary"
              value={form.slots}
              onChange={(e) => handleChange('slots', e.target.value)}
              onPaste={(e) => handleSingleLinePaste('slots', e)}
              onKeyDown={handleInputKeyDown}
            />
          </div>
        </div>

        {/* Budget Breakdown */}
        <div className="rounded-xl bg-[#F8FAFC] dark:bg-[#1E293B]/60 border border-[#CBD5E1] dark:border-[#2A3348] p-5 space-y-2.5">
          <div className="flex items-center justify-between text-xs sm:text-sm">
            <span className="text-[#64748B] dark:text-slate-400 font-bold">Total Budget Required:</span>
            <span
              className={`font-display font-extrabold text-base sm:text-xl tracking-tight ${
                insufficientFunds ? 'text-rose-600' : 'text-emerald-600 dark:text-brand-primary'
              }`}
            >
              ${totalCost.toFixed(2)}
            </span>
          </div>

          <div className="flex items-center justify-between text-xs text-[#64748B] dark:text-slate-400 pt-2 border-t border-[#E2E8F0] dark:border-[#2A3348]">
            <span>Calculation:</span>
            <span className="font-semibold text-[#1E293B] dark:text-slate-300">
              {Number(form.slots) || 0} slots × ${Number(form.reward || 0).toFixed(2)}
            </span>
          </div>

          {insufficientFunds && (
            <div className="flex items-start gap-2 text-xs text-rose-600 dark:text-rose-400 font-bold pt-1">
              <AlertCircle size={14} className="shrink-0 mt-0.5" />
              <span>
                Budget exceeds your balance (${userBalance.toFixed(2)}). Please reduce the reward/slots or deposit funds.
              </span>
            </div>
          )}
        </div>

        <ErrorBanner message={error} />

        <div className="pt-2">
          <button
            type="submit"
            disabled={loading || insufficientFunds}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-brand-primary py-3.5 text-xs sm:text-sm font-bold text-white shadow-md shadow-brand-primary/20 hover:bg-emerald-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Publishing Task...</span>
              </>
            ) : (
              <>
                <PlusCircle size={16} />
                <span>Publish Task (${totalCost.toFixed(2)})</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
