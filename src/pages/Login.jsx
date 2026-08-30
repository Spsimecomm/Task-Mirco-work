import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { LogIn, Loader2, UserCheck, ShieldCheck } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { ErrorBanner } from '../components/Shared'

export default function Login() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await signIn(form)
      navigate('/dashboard')
    } catch (err) {
      setError(err.message || 'Could not sign in.')
    } finally {
      setLoading(false)
    }
  }

  const handleQuickLogin = async (email) => {
    setError('')
    setLoading(true)
    try {
      await signIn({ email, password: 'password123' })
      navigate('/dashboard')
    } catch (err) {
      setError(err.message || 'Could not sign in.')
    } finally {
      setLoading(false)
    }
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
            Welcome back
          </h1>
          <p className="text-xs sm:text-sm font-normal text-[#64748B] dark:text-slate-400 mb-6">
            Sign in to access your earnings or campaigns
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-[#1E293B] dark:text-slate-200 uppercase tracking-wider mb-2">
                Email Address
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
                className="w-full rounded-xl border border-[#CBD5E1] dark:border-[#2A3348] bg-white dark:bg-[#0B0F17] px-4 py-3 text-xs sm:text-sm text-[#1E293B] dark:text-[#F1F5F9] placeholder-slate-400 dark:placeholder-slate-500 outline-none transition focus:border-brand-primary focus:ring-1 focus:ring-brand-primary"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="••••••••"
              />
            </div>

            <ErrorBanner message={error} />

            <button
              type="submit"
              disabled={loading}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-brand-primary py-3.5 text-xs sm:text-sm font-bold text-white shadow-md shadow-brand-primary/20 hover:bg-emerald-600 transition"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <LogIn size={16} />}
              <span>Sign In</span>
            </button>
          </form>

          {/* Quick Demo Sign In */}
          <div className="mt-6 pt-5 border-t border-[#E2E8F0] dark:border-[#2A3348]">
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#64748B] dark:text-slate-400 mb-2.5 flex items-center gap-1.5">
              <UserCheck size={14} className="text-emerald-600 dark:text-brand-primary" />
              <span>One-Click Demo Accounts</span>
            </p>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleQuickLogin('worker@taskly.demo')}
                className="rounded-xl border border-[#CBD5E1] dark:border-[#2A3348] bg-[#F8FAFC] dark:bg-[#0B0F17] px-2 py-2 text-xs font-bold text-[#1E293B] dark:text-slate-300 hover:border-brand-primary hover:text-brand-primary dark:hover:text-white transition-all"
              >
                Worker
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin('employer@taskly.demo')}
                className="rounded-xl border border-[#CBD5E1] dark:border-[#2A3348] bg-[#F8FAFC] dark:bg-[#0B0F17] px-2 py-2 text-xs font-bold text-[#1E293B] dark:text-slate-300 hover:border-brand-primary hover:text-brand-primary dark:hover:text-white transition-all"
              >
                Employer
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin('admin@taskly.demo')}
                className="rounded-xl border border-[#CBD5E1] dark:border-[#2A3348] bg-[#F8FAFC] dark:bg-[#0B0F17] px-2 py-2 text-xs font-bold text-[#1E293B] dark:text-slate-300 hover:border-brand-primary hover:text-brand-primary dark:hover:text-white transition-all"
              >
                Admin
              </button>
            </div>
          </div>
        </div>

        <p className="text-center text-xs sm:text-sm font-normal text-[#64748B] dark:text-slate-400 mt-5">
          Don&apos;t have an account?{' '}
          <Link
            to="/register"
            className="text-emerald-600 dark:text-brand-primary hover:underline font-bold"
          >
            Create account
          </Link>
        </p>
      </div>
    </div>
  )
}

