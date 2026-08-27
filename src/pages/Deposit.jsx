import React, { useEffect, useState, useCallback } from 'react'
import { ArrowDownToLine, Loader2, CheckCircle2, Smartphone } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { StatusBadge, ErrorBanner, EmptyState } from '../components/Shared'
import { handleSanitizedPaste, formatMoney } from '../lib/utils'

const PAYMENT_NUMBERS = {
  bkash: '01712-345678',
  nagad: '01812-345678',
}

const METHODS = [
  { id: 'bkash', label: 'bKash', color: 'bg-pink-500/10 text-pink-400 border-pink-500/30' },
  { id: 'nagad', label: 'Nagad', color: 'bg-orange-500/10 text-orange-400 border-orange-500/30' },
]

export default function Deposit() {
  const { profile, refreshProfile } = useAuth()
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState('bkash')
  const [senderMobile, setSenderMobile] = useState('')
  const [trxId, setTrxId] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [requests, setRequests] = useState([])

  const loadRequests = useCallback(async () => {
    const { data } = await supabase
      .from('deposit_requests')
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
    if (!amt || amt <= 0) {
      setError('Enter a valid amount.')
      return
    }
    if (!senderMobile.trim()) {
      setError('Enter your sender mobile number.')
      return
    }
    if (!trxId.trim()) {
      setError('Enter the transaction ID (TrxID).')
      return
    }
    setLoading(true)
    try {
      const { error: rpcError } = await supabase.rpc('request_deposit', {
        p_amount: amt,
        p_method: method,
        p_sender_mobile: senderMobile.trim(),
        p_trx_id: trxId.trim(),
      })
      if (rpcError) throw rpcError
      setSuccess(true)
      setAmount('')
      setSenderMobile('')
      setTrxId('')
      await refreshProfile()
      await loadRequests()
    } catch (err) {
      setError(err.message || 'Could not submit deposit request.')
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = (text) => {
    navigator.clipboard?.writeText(text)
  }

  const handleInputKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-6 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Deposit funds</h1>
        <p className="text-sm text-slate-500 mt-1">
          Current balance: <span className="text-mint-400 font-semibold">{formatMoney(profile?.deposited)}</span>
        </p>
      </div>

      <form onSubmit={handleSubmit} className="card p-6 space-y-5">
        <div>
          <label className="label">Payment method</label>
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

        <div className="rounded-lg border border-base-700 bg-base-900 p-4 space-y-2">
          <p className="text-xs text-slate-500">Send money to this {method === 'bkash' ? 'bKash' : 'Nagad'} number:</p>
          <div className="flex items-center justify-between">
            <span className="text-lg font-bold text-white tracking-wide">{PAYMENT_NUMBERS[method]}</span>
            <button
              type="button"
              onClick={() => copyToClipboard(PAYMENT_NUMBERS[method])}
              className="text-xs text-mint-400 hover:underline"
            >
              Copy
            </button>
          </div>
          <p className="text-xs text-slate-500">Personal / Merchant number</p>
        </div>

        <div>
          <label className="label">Amount (USD)</label>
          <input
            type="number"
            min="1"
            step="0.01"
            className="input"
            placeholder="Enter deposit amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            onPaste={(e) => handleSanitizedPaste(e, amount, setAmount, true)}
            onKeyDown={handleInputKeyDown}
          />
        </div>

        <div>
          <label className="label">Your sender mobile number</label>
          <input
            type="tel"
            className="input"
            placeholder="01XXXXXXXXX"
            value={senderMobile}
            onChange={(e) => setSenderMobile(e.target.value)}
            onPaste={(e) => handleSanitizedPaste(e, senderMobile, setSenderMobile, true)}
            onKeyDown={handleInputKeyDown}
          />
        </div>

        <div>
          <label className="label">Transaction ID (TrxID)</label>
          <input
            type="text"
            className="input"
            placeholder="Enter the TrxID from your SMS"
            value={trxId}
            onChange={(e) => setTrxId(e.target.value)}
            onPaste={(e) => handleSanitizedPaste(e, trxId, setTrxId, true)}
            onKeyDown={handleInputKeyDown}
          />
        </div>

        {success && (
          <div className="rounded-lg border border-mint-500/30 bg-mint-500/10 px-4 py-3 text-sm text-mint-400 flex items-center gap-2">
            <CheckCircle2 size={16} /> Deposit request submitted. Your balance will be credited after admin approval.
          </div>
        )}
        <ErrorBanner message={error} />

        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? <Loader2 size={16} className="animate-spin" /> : <ArrowDownToLine size={16} />}
          Submit deposit request
        </button>
        <p className="text-xs text-slate-500 text-center">
          Send money to the {method === 'bkash' ? 'bKash' : 'Nagad'} number above, then enter the TrxID. Your request will be reviewed by admin.
        </p>
      </form>

      <div className="card">
        <div className="px-5 py-4 border-b border-base-700">
          <h2 className="font-semibold text-white">Deposit history</h2>
        </div>
        {requests.length === 0 ? (
          <div className="p-2">
            <EmptyState title="No deposits yet" subtitle="Your deposit requests will appear here." />
          </div>
        ) : (
          <ul className="divide-y divide-base-700">
            {requests.map((r) => (
              <li key={r.id} className="flex items-center justify-between px-5 py-3 text-sm">
                <div>
                  <p className="text-white font-medium">{formatMoney(r.amount)} · {r.method === 'bkash' ? 'bKash' : 'Nagad'}</p>
                  <p className="text-xs text-slate-500">TrxID: {r.trx_id} · {new Date(r.created_at).toLocaleString()}</p>
                  {r.rejection_reason && (
                    <p className="text-xs text-signal-rose mt-1">Rejected: {r.rejection_reason}</p>
                  )}
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

