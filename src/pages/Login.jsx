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
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-mint-500 text-base-950 font-display font-extrabold">T</span>
          <span className="font-display font-bold text-white text-xl">Taskly</span>
        </div>
        <div className="card p-6">
          <h1 className="text-xl font-bold mb-1">Welcome back</h1>
          <p className="text-sm text-slate-500 mb-6">Sign in to continue earning or hiring.</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Email</label>
              <input
                type="email"
                required
                className="input"
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
                className="input"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="••••••••"
              />
            </div>
            <ErrorBanner message={error} />
            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? <Loader2 size={16} className="animate-spin" /> : <LogIn size={16} />}
              Sign in
            </button>
          </form>

          {/* Quick Demo Sign In */}
          <div className="mt-6 pt-5 border-t border-base-700">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2.5 flex items-center gap-1.5">
              <UserCheck size={14} /> Quick Demo Accounts
            </p>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleQuickLogin('worker@taskly.demo')}
                className="rounded-lg border border-base-700 bg-base-900 px-2 py-1.5 text-xs font-medium text-slate-300 hover:border-mint-500/50 hover:text-white transition"
              >
                Worker
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin('employer@taskly.demo')}
                className="rounded-lg border border-base-700 bg-base-900 px-2 py-1.5 text-xs font-medium text-slate-300 hover:border-mint-500/50 hover:text-white transition"
              >
                Employer
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin('admin@taskly.demo')}
                className="rounded-lg border border-base-700 bg-base-900 px-2 py-1.5 text-xs font-medium text-slate-300 hover:border-mint-500/50 hover:text-white transition"
              >
                Admin
              </button>
            </div>
          </div>
        </div>
        <p className="text-center text-sm text-slate-500 mt-5">
          Don&apos;t have an account?{' '}
          <Link to="/register" className="text-mint-400 hover:underline">
            Create one
          </Link>
        </p>
      </div>
    </div>
  )
}
