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
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="card p-8 max-w-sm text-center bg-white dark:bg-[#1E293B] border border-[#CBD5E1] dark:border-white/10 rounded-xl">
          <h1 className="text-lg font-bold mb-2 text-[#1E293B] dark:text-[#F1F5F9]">Check your inbox</h1>
          <p className="text-sm text-[#64748B] dark:text-slate-400">
            We sent a confirmation link to <strong className="text-[#1E293B] dark:text-white">{form.email}</strong>. Confirm your
            email, then sign in.
          </p>
          <Link to="/login" className="btn-primary w-full mt-6">
            Go to sign in
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2 justify-center mb-8">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-600 dark:bg-mint-500 text-white dark:text-slate-900 font-display font-extrabold shadow-sm">T</span>
          <span className="font-display font-bold text-[#1E293B] dark:text-[#F1F5F9] text-xl">Taskly</span>
        </div>
        <div className="card p-6 sm:p-8 rounded-xl shadow-sm bg-white dark:bg-[#1E293B] border border-[#CBD5E1] dark:border-white/10">
          <h1 className="text-xl sm:text-2xl font-bold text-[#1E293B] dark:text-[#F1F5F9] mb-1">Create your account</h1>
          <p className="text-sm font-normal text-[#64748B] dark:text-slate-400 mb-6">Choose how you want to use Taskly.</p>

          <div className="grid grid-cols-2 gap-3 mb-5">
            <button
              type="button"
              onClick={() => setForm({ ...form, role: 'worker' })}
              className={`rounded-xl border p-3.5 text-left transition-all ${
                form.role === 'worker'
                  ? 'border-emerald-600 bg-[#DCFCE7] dark:bg-mint-500/10 ring-2 ring-emerald-600/20'
                  : 'border-[#CBD5E1] dark:border-white/10 bg-[#F1F5F9] dark:bg-slate-900 hover:border-slate-400 dark:hover:border-white/20'
              }`}
            >
              <Hammer size={18} className={form.role === 'worker' ? 'text-emerald-700 dark:text-mint-500' : 'text-[#64748B] dark:text-slate-400'} />
              <p className="mt-2 text-sm font-bold text-[#1E293B] dark:text-[#F1F5F9]">Worker</p>
              <p className="text-xs text-[#64748B] dark:text-slate-400">Complete tasks, earn money</p>
            </button>
            <button
              type="button"
              onClick={() => setForm({ ...form, role: 'employer' })}
              className={`rounded-xl border p-3.5 text-left transition-all ${
                form.role === 'employer'
                  ? 'border-emerald-600 bg-[#DCFCE7] dark:bg-mint-500/10 ring-2 ring-emerald-600/20'
                  : 'border-[#CBD5E1] dark:border-white/10 bg-[#F1F5F9] dark:bg-slate-900 hover:border-slate-400 dark:hover:border-white/20'
              }`}
            >
              <Briefcase size={18} className={form.role === 'employer' ? 'text-emerald-700 dark:text-mint-500' : 'text-[#64748B] dark:text-slate-400'} />
              <p className="mt-2 text-sm font-bold text-[#1E293B] dark:text-[#F1F5F9]">Employer</p>
              <p className="text-xs text-[#64748B] dark:text-slate-400">Post jobs, hire workers</p>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Full name</label>
              <input
                required
                className="input font-medium"
                value={form.fullName}
                onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                placeholder="Jane Doe"
              />
            </div>
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
                minLength={6}
                className="input font-medium"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="At least 6 characters"
              />
            </div>
            <ErrorBanner message={error} />
            <button type="submit" disabled={loading} className="btn-primary w-full py-3 text-sm font-bold rounded-xl shadow-md">
              {loading ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />}
              Create account
            </button>
          </form>
        </div>
        <p className="text-center text-sm font-normal text-[#64748B] dark:text-slate-400 mt-5">
          Already have an account?{' '}
          <Link to="/login" className="text-emerald-600 dark:text-mint-500 hover:underline font-semibold">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
