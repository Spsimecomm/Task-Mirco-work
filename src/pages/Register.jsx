import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { UserPlus, Loader2, Briefcase, Hammer } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { ErrorBanner } from '../components/Shared'

export default function Register() {
  const { signUp } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ fullName: '', email: '', password: '', role: 'worker' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { session } = await signUp(form)
      if (session) {
        navigate(form.role === 'employer' ? '/employer' : '/worker')
      } else {
        setDone(true)
      }
    } catch (err) {
      setError(err.message || 'Could not create account.')
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-[#F8FAFC] dark:bg-[#0B0F17]">
        <div className="card p-8 max-w-sm text-center bg-white dark:bg-[#111827] border border-[#CBD5E1] dark:border-[#2A3348] rounded-2xl shadow-sm">
          <h1 className="font-display font-extrabold text-lg text-[#1E293B] dark:text-[#F1F5F9] mb-2">
            Check your inbox
          </h1>
          <p className="text-xs sm:text-sm text-[#64748B] dark:text-slate-400">
            We sent a confirmation link to <strong className="text-[#1E293B] dark:text-white">{form.email}</strong>. Confirm your
            email, then sign in.
          </p>
          <Link
            to="/login"
            className="w-full inline-flex items-center justify-center rounded-xl bg-brand-primary py-3 text-xs sm:text-sm font-bold text-white shadow-md shadow-brand-primary/20 hover:bg-emerald-600 transition mt-6"
          >
            Go to sign in
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-[#F8FAFC] dark:bg-[#0B0F17] transition-colors">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2 justify-center mb-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-primary text-white font-display font-black text-xl shadow-md shadow-brand-primary/20">
            T
          </div>
          <span className="font-display font-extrabold text-[#1E293B] dark:text-[#F1F5F9] text-2xl tracking-tight">
            Taskly
          </span>
        </div>

        <div className="card p-6 sm:p-8 rounded-2xl shadow-sm bg-white dark:bg-[#111827] border border-[#CBD5E1] dark:border-[#2A3348]">
          <h1 className="font-display font-extrabold text-xl sm:text-2xl text-[#1E293B] dark:text-[#F1F5F9] mb-1">
            Create account
          </h1>
          <p className="text-xs sm:text-sm font-normal text-[#64748B] dark:text-slate-400 mb-6">
            Choose your role to get started
          </p>

          <div className="grid grid-cols-2 gap-3 mb-5">
            <button
              type="button"
              onClick={() => setForm({ ...form, role: 'worker' })}
              className={`rounded-2xl border p-3.5 text-left transition-all ${
                form.role === 'worker'
                  ? 'border-brand-primary bg-emerald-500/10 ring-2 ring-brand-primary/20'
                  : 'border-[#CBD5E1] dark:border-[#2A3348] bg-white dark:bg-[#0B0F17] hover:border-slate-400 dark:hover:border-slate-600'
              }`}
            >
              <Hammer
                size={18}
                className={
                  form.role === 'worker'
                    ? 'text-emerald-600 dark:text-brand-primary'
                    : 'text-[#64748B] dark:text-slate-400'
                }
              />
              <p className="mt-2 text-xs sm:text-sm font-bold text-[#1E293B] dark:text-[#F1F5F9]">
                Worker
              </p>
              <p className="text-[11px] text-[#64748B] dark:text-slate-400">Complete & Earn</p>
            </button>

            <button
              type="button"
              onClick={() => setForm({ ...form, role: 'employer' })}
              className={`rounded-2xl border p-3.5 text-left transition-all ${
                form.role === 'employer'
                  ? 'border-brand-primary bg-emerald-500/10 ring-2 ring-brand-primary/20'
                  : 'border-[#CBD5E1] dark:border-[#2A3348] bg-white dark:bg-[#0B0F17] hover:border-slate-400 dark:hover:border-slate-600'
              }`}
            >
              <Briefcase
                size={18}
                className={
                  form.role === 'employer'
                    ? 'text-emerald-600 dark:text-brand-primary'
                    : 'text-[#64748B] dark:text-slate-400'
                }
              />
              <p className="mt-2 text-xs sm:text-sm font-bold text-[#1E293B] dark:text-[#F1F5F9]">
                Employer
              </p>
              <p className="text-[11px] text-[#64748B] dark:text-slate-400">Post & Hire</p>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-[#1E293B] dark:text-slate-200 uppercase tracking-wider mb-2">
                Full name
              </label>
              <input
                required
                className="w-full rounded-xl border border-[#CBD5E1] dark:border-[#2A3348] bg-white dark:bg-[#0B0F17] px-4 py-3 text-xs sm:text-sm text-[#1E293B] dark:text-[#F1F5F9] placeholder-slate-400 dark:placeholder-slate-500 outline-none transition focus:border-brand-primary focus:ring-1 focus:ring-brand-primary"
                value={form.fullName}
                onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                placeholder="Jane Doe"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#1E293B] dark:text-slate-200 uppercase tracking-wider mb-2">
                Email
              </label>
              <input
                type="email"
                required
                className="w-full rounded-xl border border-[#CBD5E1] dark:border-[#2A3348] bg-white dark:bg-[#0B0F17] px-4 py-3 text-xs sm:text-sm text-[#1E293B] dark:text-[#F1F5F9] placeholder-slate-400 dark:placeholder-slate-500 outline-none transition focus:border-brand-primary focus:ring-1 focus:ring-brand-primary"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#1E293B] dark:text-slate-200 uppercase tracking-wider mb-2">
                Password
              </label>
              <input
                type="password"
                required
                minLength={6}
                className="w-full rounded-xl border border-[#CBD5E1] dark:border-[#2A3348] bg-white dark:bg-[#0B0F17] px-4 py-3 text-xs sm:text-sm text-[#1E293B] dark:text-[#F1F5F9] placeholder-slate-400 dark:placeholder-slate-500 outline-none transition focus:border-brand-primary focus:ring-1 focus:ring-brand-primary"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="At least 6 characters"
              />
            </div>

            <ErrorBanner message={error} />

            <button
              type="submit"
              disabled={loading}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-brand-primary py-3.5 text-xs sm:text-sm font-bold text-white shadow-md shadow-brand-primary/20 hover:bg-emerald-600 transition"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />}
              <span>Create Account</span>
            </button>
          </form>
        </div>

        <p className="text-center text-xs sm:text-sm font-normal text-[#64748B] dark:text-slate-400 mt-5">
          Already have an account?{' '}
          <Link
            to="/login"
            className="text-emerald-600 dark:text-brand-primary hover:underline font-bold"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}

