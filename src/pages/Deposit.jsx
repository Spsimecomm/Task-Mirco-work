import React, { useEffect, useState } from 'react'
import { CreditCard, Loader2, CheckCircle2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { ErrorBanner } from '../components/Shared'

const PRESETS = [10, 25, 50, 100]
const METHODS = [
  { id: 'card', label: 'Credit / Debit card' },
  { id: 'bkash', label: 'bKash' },
  { id: 'bank', label: 'Bank transfer' },
]

export default function Deposit() {
  const { profile, refreshProfile } = useAuth()
  const [amount, setAmount] = useState(25)
  const [method, setMethod] = useState('card')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [history, setHistory] = useState([])

  const loadHistory = async () => {
    const { data } = await supabase
      .from('transactions')
      .select('*')
      .eq('type', 'deposit')
      .order('created_at', { ascending: false })
      .limit(8)
    setHistory(data || [])
  }

  useEffect(() => {
    loadHistory()
  }, [])

  const handleDeposit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess(false)
    if (!amount || amount <= 0) {
      setError('Enter a valid amount.')
      return
    }
    setLoading(true)
    try {
      // NOTE: this simulates a successful payment. Wire this up to your real
      // payment provider (Stripe, bKash, Nagad) and call the RPC from a
      // server-side webhook after the charge succeeds in production.
      const { error: rpcError } = await supabase.rpc('deposit_funds', {
        p_amount: Number(amount),
        p_method: method,
      })
      if (rpcError) throw rpcError
      setSuccess(true)
      await refreshProfile()
      await loadHistory()
    } catch (err) {
      setError(err.message || 'Deposit failed.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-6 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Deposit funds</h1>
        <p className="text-sm text-slate-500 mt-1">
          Current balance: <span className="text-mint-400 font-semibold">${Number(profile?.deposited ?? 0).toFixed(2)}</span>
        </p>
      </div>

      <form onSubmit={handleDeposit} className="card p-6 space-y-5">
        <div>
          <label className="label">Amount (USD)</label>
          <div className="flex gap-2 mb-2">
            {PRESETS.map((p) => (
              <button
                type="button"
                key={p}
                onClick={() => setAmount(p)}
                className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition ${
                  amount === p ? 'border-mint-500 bg-mint-500/10 text-mint-400' : 'border-base-600 text-slate-300 hover:border-base-500'
                }`}
              >
                ${p}
              </button>
            ))}
          </div>
          <input
            type="number"
            min="1"
            step="0.01"
            className="input"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>

        <div>
          <label className="label">Payment method</label>
          <div className="grid grid-cols-3 gap-2">
            {METHODS.map((m) => (
              <button
                type="button"
                key={m.id}
                onClick={() => setMethod(m.id)}
                className={`rounded-lg border px-3 py-3 text-sm font-medium transition ${
                  method === m.id ? 'border-mint-500 bg-mint-500/10 text-mint-400' : 'border-base-600 text-slate-300 hover:border-base-500'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {method === 'card' && (
          <div className="grid grid-cols-2 gap-3">
            <input className="input col-span-2" placeholder="Card number" defaultValue="4242 4242 4242 4242" />
            <input className="input" placeholder="MM/YY" defaultValue="12/29" />
            <input className="input" placeholder="CVC" defaultValue="123" />
          </div>
        )}

        {success && (
          <div className="rounded-lg border border-mint-500/30 bg-mint-500/10 px-4 py-3 text-sm text-mint-400 flex items-center gap-2">
            <CheckCircle2 size={16} /> Deposit successful — funds added to your balance.
          </div>
        )}
        <ErrorBanner message={error} />

        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? <Loader2 size={16} className="animate-spin" /> : <CreditCard size={16} />}
          Deposit ${Number(amount || 0).toFixed(2)}
        </button>
        <p className="text-xs text-slate-500 text-center">
          Demo payment flow — no real charge is made. Swap in Stripe/bKash on the backend for production.
        </p>
      </form>

      {history.length > 0 && (
        <div className="card">
          <div className="px-5 py-4 border-b border-base-700">
            <h2 className="font-semibold text-white">Deposit history</h2>
          </div>
          <ul className="divide-y divide-base-700">
            {history.map((h) => (
              <li key={h.id} className="flex items-center justify-between px-5 py-3 text-sm">
                <span className="text-slate-400">{new Date(h.created_at).toLocaleString()}</span>
                <span className="text-mint-400 font-medium">+${Number(h.amount).toFixed(2)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
