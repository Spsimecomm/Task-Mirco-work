import React, { useEffect, useState } from 'react'
import { ArrowUpFromLine, Loader2, CheckCircle2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { StatusBadge, ErrorBanner, EmptyState } from '../components/Shared'

const METHODS = [
  { id: 'bkash', label: 'bKash' },
  { id: 'bank', label: 'Bank transfer' },
  { id: 'paypal', label: 'PayPal' },
]

const MIN_WITHDRAWAL = 5

export default function Withdraw() {
  const { profile, refreshProfile } = useAuth()
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState('bkash')
  const [account, setAccount] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [requests, setRequests] = useState([])

  const loadRequests = async () => {
    const { data } = await supabase
      .from('withdrawals')
      .select('*')
      .order('created_at', { ascending: false })
    setRequests(data || [])
  }

  useEffect(() => {
    loadRequests()
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess(false)
    const amt = Number(amount)
    if (!amt || amt < MIN_WITHDRAWAL) {
      setError(`Minimum withdrawal is $${MIN_WITHDRAWAL.toFixed(2)}.`)
      return
    }
    if (amt > Number(profile?.earnings ?? 0)) {
      setError('You cannot withdraw more than your available earnings.')
      return
    }
    if (!account.trim()) {
      setError('Enter your payout account details.')
      return
    }
    setLoading(true)
    try {
      const { error: rpcError } = await supabase.rpc('request_withdrawal', {
        p_amount: amt,
        p_method: method,
        p_account_details: account,
      })
      if (rpcError) throw rpcError
      setSuccess(true)
      setAmount('')
      setAccount('')
      await refreshProfile()
      await loadRequests()
    } catch (err) {
      setError(err.message || 'Could not submit withdrawal request.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-6 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Withdraw earnings</h1>
        <p className="text-sm text-slate-500 mt-1">
          Available: <span className="text-mint-400 font-semibold">${Number(profile?.earnings ?? 0).toFixed(2)}</span>
        </p>
      </div>

      <form onSubmit={handleSubmit} className="card p-6 space-y-5">
        <div>
          <label className="label">Amount (USD)</label>
          <input
            type="number"
            min={MIN_WITHDRAWAL}
            step="0.01"
            className="input"
            placeholder={`Minimum $${MIN_WITHDRAWAL.toFixed(2)}`}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>

        <div>
          <label className="label">Payout method</label>
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

        <div>
          <label className="label">Account details</label>
          <input
            className="input"
            placeholder={method === 'bank' ? 'Account number & bank name' : 'Phone number / email'}
            value={account}
            onChange={(e) => setAccount(e.target.value)}
          />
        </div>

        {success && (
          <div className="rounded-lg border border-mint-500/30 bg-mint-500/10 px-4 py-3 text-sm text-mint-400 flex items-center gap-2">
            <CheckCircle2 size={16} /> Withdrawal request submitted for processing.
          </div>
        )}
        <ErrorBanner message={error} />

        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? <Loader2 size={16} className="animate-spin" /> : <ArrowUpFromLine size={16} />}
          Request withdrawal
        </button>
      </form>

      <div className="card">
        <div className="px-5 py-4 border-b border-base-700">
          <h2 className="font-semibold text-white">Withdrawal history</h2>
        </div>
        {requests.length === 0 ? (
          <div className="p-2">
            <EmptyState title="No withdrawals yet" subtitle="Your withdrawal requests will appear here." />
          </div>
        ) : (
          <ul className="divide-y divide-base-700">
            {requests.map((r) => (
              <li key={r.id} className="flex items-center justify-between px-5 py-3 text-sm">
                <div>
                  <p className="text-white font-medium">${Number(r.amount).toFixed(2)} · {r.method}</p>
                  <p className="text-xs text-slate-500">{new Date(r.created_at).toLocaleString()}</p>
                </div>
                <StatusBadge status={r.status} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
