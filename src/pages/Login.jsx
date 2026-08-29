import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { LogIn, Loader2, UserCheck } from 'lucide-react'
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
    <div className="min-h-screen flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2 justify-center mb-8">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-600 dark:bg-mint-500 text-white dark:text-slate-900 font-display font-extrabold shadow-sm">T</span>
          <span className="font-display font-bold text-[#1E293B] dark:text-[#F1F5F9] text-xl">Taskly</span>
        </div>
        <div className="card p-6 sm:p-8 rounded-xl shadow-sm bg-white dark:bg-[#1E293B] border border-[#CBD5E1] dark:border-white/10">
          <h1 className="text-xl sm:text-2xl font-bold text-[#1E293B] dark:text-[#F1F5F9] mb-1">Welcome back</h1>
          <p className="text-sm font-normal text-[#64748B] dark:text-slate-400 mb-6">Sign in to continue earning or hiring.</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Email</label>
              <input
                type="email"
                required
                className="input font-medium"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className="label">Password</label>
              <input
                type="password"
                required
                className="input font-medium"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="••••••••"
              />
            </div>
            <ErrorBanner message={error} />
            <button type="submit" disabled={loading} className="btn-primary w-full py-3 text-sm font-bold rounded-xl shadow-md">
              {loading ? <Loader2 size={16} className="animate-spin" /> : <LogIn size={16} />}
              Sign in
            </button>
          </form>

          {/* Quick Demo Sign In */}
          <div className="mt-6 pt-5 border-t border-[#CBD5E1] dark:border-white/10">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#64748B] dark:text-slate-400 mb-2.5 flex items-center gap-1.5">
              <UserCheck size={14} /> Quick Demo Accounts
            </p>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleQuickLogin('worker@taskly.demo')}
                className="rounded-xl border border-[#CBD5E1] dark:border-white/10 bg-[#F1F5F9] dark:bg-slate-900 px-2 py-2 text-xs font-semibold text-[#1E293B] dark:text-slate-300 hover:border-emerald-600 hover:text-emerald-700 dark:hover:text-white transition-all"
              >
                Worker
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin('employer@taskly.demo')}
                className="rounded-xl border border-[#CBD5E1] dark:border-white/10 bg-[#F1F5F9] dark:bg-slate-900 px-2 py-2 text-xs font-semibold text-[#1E293B] dark:text-slate-300 hover:border-emerald-600 hover:text-emerald-700 dark:hover:text-white transition-all"
              >
                Employer
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin('admin@taskly.demo')}
                className="rounded-xl border border-[#CBD5E1] dark:border-white/10 bg-[#F1F5F9] dark:bg-slate-900 px-2 py-2 text-xs font-semibold text-[#1E293B] dark:text-slate-300 hover:border-emerald-600 hover:text-emerald-700 dark:hover:text-white transition-all"
              >
                Admin
              </button>
            </div>
          </div>
        </div>
        <p className="text-center text-sm font-normal text-[#64748B] dark:text-slate-400 mt-5">
          Don&apos;t have an account?{' '}
          <Link to="/register" className="text-emerald-600 dark:text-mint-500 hover:underline font-semibold">
            Create one
          </Link>
        </p>
      </div>
    </div>
  )
}
