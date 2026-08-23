import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2, PlusCircle } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { ErrorBanner } from '../components/Shared'

const CATEGORIES = ['Social Media', 'Sign Up', 'Video Watching', 'Data Entry']

export default function CreateTask() {
  const { profile, refreshProfile } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({
    title: '',
    category: CATEGORIES[0],
    description: '',
    proofInstructions: '',
    reward: '',
    slots: 10,
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const totalCost = (Number(form.reward) || 0) * (Number(form.slots) || 0)
  const insufficientFunds = totalCost > Number(profile?.deposited ?? 0)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (insufficientFunds) {
      setError('Insufficient balance. Deposit more funds to cover this task budget.')
      return
    }
    setLoading(true)
    try {
      const { error: rpcError } = await supabase.rpc('create_task_with_funding', {
        p_title: form.title,
        p_category: form.category,
        p_description: form.description,
        p_proof_instructions: form.proofInstructions,
        p_reward: Number(form.reward),
        p_slots: Number(form.slots),
      })
      if (rpcError) throw rpcError
      await refreshProfile()
      navigate('/employer')
    } catch (err) {
      setError(err.message || 'Could not create task.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-6 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Post a task</h1>
        <p className="text-sm text-slate-500 mt-1">
          Balance: <span className="text-mint-400 font-semibold">${Number(profile?.deposited ?? 0).toFixed(2)}</span>
        </p>
      </div>

      <form onSubmit={handleSubmit} className="card p-6 space-y-5">
        <div>
          <label className="label">Task title</label>
          <input
            required
            className="input"
            placeholder="Follow our Instagram page and like 3 posts"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
        </div>

        <div>
          <label className="label">Category</label>
          <select
            className="input"
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="label">Description</label>
          <textarea
            required
            rows={4}
            className="input"
            placeholder="Explain exactly what the worker needs to do…"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </div>

        <div>
          <label className="label">Required proof instructions</label>
          <textarea
            required
            rows={3}
            className="input"
            placeholder="e.g. Submit a screenshot showing you followed the account"
            value={form.proofInstructions}
            onChange={(e) => setForm({ ...form, proofInstructions: e.target.value })}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Reward per worker (USD)</label>
            <input
              required
              type="number"
              min="0.01"
              step="0.01"
              className="input"
              placeholder="0.50"
              value={form.reward}
              onChange={(e) => setForm({ ...form, reward: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Number of workers</label>
            <input
              required
              type="number"
              min="1"
              step="1"
              className="input"
              value={form.slots}
              onChange={(e) => setForm({ ...form, slots: e.target.value })}
            />
          </div>
        </div>

        <div className="rounded-lg bg-base-900 border border-base-700 px-4 py-3 flex items-center justify-between">
          <span className="text-sm text-slate-400">Total budget required</span>
          <span className={`font-semibold ${insufficientFunds ? 'text-signal-rose' : 'text-mint-400'}`}>
            ${totalCost.toFixed(2)}
          </span>
        </div>

        <ErrorBanner message={error} />

        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? <Loader2 size={16} className="animate-spin" /> : <PlusCircle size={16} />}
          Publish task
        </button>
      </form>
    </div>
  )
}
