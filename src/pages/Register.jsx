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
        <div className="card p-8 max-w-sm text-center">
          <h1 className="text-lg font-bold mb-2">Check your inbox</h1>
          <p className="text-sm text-slate-400">
            We sent a confirmation link to <strong className="text-white">{form.email}</strong>. Confirm your
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
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-mint-500 text-base-950 font-display font-extrabold">T</span>
          <span className="font-display font-bold text-white text-xl">Taskly</span>
        </div>
        <div className="card p-6">
          <h1 className="text-xl font-bold mb-1">Create your account</h1>
          <p className="text-sm text-slate-500 mb-6">Choose how you want to use Taskly.</p>

          <div className="grid grid-cols-2 gap-3 mb-5">
            <button
              type="button"
              onClick={() => setForm({ ...form, role: 'worker' })}
              className={`rounded-lg border px-3 py-3 text-left transition ${
                form.role === 'worker'
                  ? 'border-mint-500 bg-mint-500/10'
                  : 'border-base-600 bg-base-900 hover:border-base-500'
              }`}
            >
              <Hammer size={18} className={form.role === 'worker' ? 'text-mint-400' : 'text-slate-500'} />
              <p className="mt-2 text-sm font-semibold text-white">Worker</p>
              <p className="text-xs text-slate-500">Complete tasks, earn money</p>
            </button>
            <button
              type="button"
              onClick={() => setForm({ ...form, role: 'employer' })}
              className={`rounded-lg border px-3 py-3 text-left transition ${
                form.role === 'employer'
                  ? 'border-mint-500 bg-mint-500/10'
                  : 'border-base-600 bg-base-900 hover:border-base-500'
              }`}
            >
              <Briefcase size={18} className={form.role === 'employer' ? 'text-mint-400' : 'text-slate-500'} />
              <p className="mt-2 text-sm font-semibold text-white">Employer</p>
              <p className="text-xs text-slate-500">Post jobs, hire workers</p>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Full name</label>
              <input
                required
                className="input"
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
                minLength={6}
                className="input"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="At least 6 characters"
              />
            </div>
            <ErrorBanner message={error} />
            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />}
              Create account
            </button>
          </form>
        </div>
        <p className="text-center text-sm text-slate-500 mt-5">
          Already have an account?{' '}
          <Link to="/login" className="text-mint-400 hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
