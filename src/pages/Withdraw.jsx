import React, { useEffect, useState, useCallback } from 'react'
import { ArrowUpFromLine, Loader as Loader2, CircleCheck as CheckCircle2, Smartphone } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { StatusBadge, ErrorBanner, EmptyState } from '../components/Shared'

const METHODS = [
  { id: 'bkash', label: 'bKash', color: 'bg-pink-500/10 text-pink-400 border-pink-500/30' },
  { id: 'nagad', label: 'Nagad', color: 'bg-orange-500/10 text-orange-400 border-orange-500/30' },
]

const MIN_WITHDRAWAL = 2
const WITHDRAWAL_FEE_RATE = 0.1

export default function Withdraw() {
  const { profile, refreshProfile } = useAuth()
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState('bkash')
  const [account, setAccount] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [requests, setRequests] = useState([])

  const requestedAmount = Number(amount) || 0
  const withdrawalFee = Math.round(requestedAmount * WITHDRAWAL_FEE_RATE * 100) / 100
  const netAmount = Math.max(0, requestedAmount - withdrawalFee)

  const loadRequests = useCallback(async () => {
    const { data } = await supabase
      .from('withdrawals')
      .select('*')
      .order('created_at', { ascending: false })
    setRequests(data || [])
  }, [])

  useEffect(() => {
    loadRequests()
  }, [loadRequests])

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
      setError('Enter your mobile number for payout.')
      return
    }
    setLoading(true)
    try {
      const { error: rpcError } = await supabase.rpc('request_withdrawal', {
        p_amount: amt,
        p_method: method,
        p_account_details: account.trim(),
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

        {requestedAmount > 0 && (
          <div className="rounded-lg border border-base-700 bg-base-900 p-4 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400">Requested</span>
              <span className="text-white font-medium">${requestedAmount.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400">Fee ({(WITHDRAWAL_FEE_RATE * 100).toFixed(0)}%)</span>
              <span className="text-signal-amber font-medium">-${withdrawalFee.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between border-t border-base-700 pt-2">
              <span className="text-white font-semibold">You will get</span>
              <span className="text-mint-400 font-bold">${netAmount.toFixed(2)}</span>
            </div>
          </div>
        )}

        <div>
          <label className="label">Payout method</label>
          <div className="grid grid-cols-2 gap-3">
            {METHODS.map((m) => (
              <button
                type="button"
                key={m.id}
                onClick={() => setMethod(m.id)}
                className={`flex items-center justify-center gap-2 rounded-lg border px-4 py-3 text-sm font-semibold transition ${
                  method === m.id
                    ? `${m.color} border-current`
                    : 'border-base-600 text-slate-300 hover:border-base-500'
                }`}
              >
                <Smartphone size={16} />
                {m.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="label">Your mobile number</label>
          <input
            type="tel"
            className="input"
            placeholder="01XXXXXXXXX"
            value={account}
            onChange={(e) => setAccount(e.target.value)}
          />
        </div>

        {success && (
          <div className="rounded-lg border border-mint-500/30 bg-mint-500/10 px-4 py-3 text-sm text-mint-400 flex items-center gap-2">
            <CheckCircle2 size={16} /> Withdrawal request submitted. You will receive payment after admin approval.
          </div>
        )}
        <ErrorBanner message={error} />

        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? <Loader2 size={16} className="animate-spin" /> : <ArrowUpFromLine size={16} />}
          Request withdrawal
        </button>
        <p className="text-xs text-slate-500 text-center">
          Withdrawals are processed by admin. Funds will be sent to your {method === 'bkash' ? 'bKash' : 'Nagad'} account.
        </p>
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
                  <p className="text-white font-medium">${Number(r.amount).toFixed(2)} · {r.method === 'bkash' ? 'bKash' : 'Nagad'}</p>
                  <p className="text-xs text-slate-500">Fee: ${Number(r.fee_amount ?? 0).toFixed(2)} · You get: ${Number(r.net_amount ?? r.amount).toFixed(2)}</p>
                  <p className="text-xs text-slate-500">{r.account_details} · {new Date(r.created_at).toLocaleString()}</p>
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
