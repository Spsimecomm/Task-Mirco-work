import React, { useEffect, useState, useCallback } from 'react'
import { ArrowDownToLine, Loader2, CheckCircle2, Smartphone } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { StatusBadge, ErrorBanner, EmptyState } from '../components/Shared'

const PAYMENT_NUMBERS = {
  bkash: '01617-177380',
  nagad: 'Coming Soon',
}

const METHODS = [
  { id: 'bkash', label: 'bKash', activeClass: 'bg-[#FDF2F8] dark:bg-pink-500/10 text-[#BE185D] dark:text-pink-400 border-[#F472B6] dark:border-pink-500/30' },
  { id: 'nagad', label: 'Nagad', activeClass: 'bg-[#FFF7ED] dark:bg-orange-500/10 text-[#C2410C] dark:text-orange-400 border-[#FB923C] dark:border-orange-500/30' },
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

  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-6 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#1E293B] dark:text-[#F1F5F9]">Deposit funds</h1>
        <p className="text-sm font-normal text-[#64748B] dark:text-slate-400 mt-1">
          Current balance: <span className="text-emerald-600 dark:text-mint-500 font-bold">${Number(profile?.deposited ?? 0).toFixed(2)}</span>
        </p>
      </div>

      <form onSubmit={handleSubmit} className="card p-6 space-y-5 bg-white dark:bg-[#1E293B] border border-[#CBD5E1] dark:border-white/10">
        <div>
          <label className="label">Payment method</label>
          <div className="grid grid-cols-2 gap-3">
            {METHODS.map((m) => (
              <button
                type="button"
                key={m.id}
                onClick={() => setMethod(m.id)}
                className={`flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold transition-all ${
                  method === m.id
                    ? `${m.activeClass} border-current ring-2 ring-current/20`
                    : 'border-[#CBD5E1] dark:border-white/10 bg-[#F1F5F9] dark:bg-slate-900/40 text-[#1E293B] dark:text-slate-300 hover:border-slate-400 dark:hover:border-white/20'
                }`}
              >
                <Smartphone size={16} />
                {m.label}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-[#CBD5E1] dark:border-white/10 bg-[#F8FAFC] dark:bg-slate-900/60 p-4 space-y-2">
          <p className="text-xs text-[#64748B] dark:text-slate-400">Send money to this {method === 'bkash' ? 'bKash' : 'Nagad'} number:</p>
          <div className="flex items-center justify-between">
            <span className="text-lg font-bold text-[#1E293B] dark:text-[#F1F5F9] tracking-wide">{PAYMENT_NUMBERS[method]}</span>
            <button
              type="button"
              onClick={() => copyToClipboard(PAYMENT_NUMBERS[method])}
              className="text-xs text-emerald-600 dark:text-mint-500 hover:underline font-bold"
            >
              Copy
            </button>
          </div>
          <p className="text-xs text-[#64748B] dark:text-slate-400">Personal / Merchant number</p>
        </div>

        <div>
          <label className="label">Amount (USD)</label>
          <input
            type="number"
            min="1"
            step="0.01"
            className="input font-medium"
            placeholder="Enter deposit amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>

        <div>
          <label className="label">Your sender mobile number</label>
          <input
            type="tel"
            className="input font-medium"
            placeholder="01XXXXXXXXX"
            value={senderMobile}
            onChange={(e) => setSenderMobile(e.target.value)}
          />
        </div>

        <div>
          <label className="label">Transaction ID (TrxID)</label>
          <input
            type="text"
            className="input font-medium"
            placeholder="Enter the TrxID from your SMS"
            value={trxId}
            onChange={(e) => setTrxId(e.target.value)}
          />
        </div>

        {success && (
          <div className="rounded-xl border border-[#BBF7D0] dark:border-mint-500/30 bg-[#DCFCE7] dark:bg-mint-500/10 px-4 py-3 text-sm text-[#166534] dark:text-mint-500 flex items-center gap-2 font-semibold">
            <CheckCircle2 size={16} /> Deposit request submitted. Your balance will be credited after admin approval.
          </div>
        )}
        <ErrorBanner message={error} />

        <button type="submit" disabled={loading} className="btn-primary w-full py-3.5 text-sm font-bold rounded-xl shadow-md">
          {loading ? <Loader2 size={16} className="animate-spin" /> : <ArrowDownToLine size={16} />}
          Submit deposit request
        </button>
        <p className="text-xs text-[#64748B] dark:text-slate-400 text-center">
          Send money to the {method === 'bkash' ? 'bKash' : 'Nagad'} number above, then enter the TrxID. Your request will be reviewed by admin.
        </p>
      </form>

      <div className="card bg-white dark:bg-[#1E293B] border border-[#CBD5E1] dark:border-white/10 rounded-xl">
        <div className="px-5 py-4 border-b border-[#CBD5E1] dark:border-white/10">
          <h2 className="font-bold text-[#1E293B] dark:text-[#F1F5F9]">Deposit history</h2>
        </div>
        {requests.length === 0 ? (
          <div className="p-2">
            <EmptyState title="No deposits yet" subtitle="Your deposit requests will appear here." />
          </div>
        ) : (
          <ul className="divide-y divide-[#E2E8F0] dark:divide-white/10">
            {requests.map((r) => (
              <li key={r.id} className="flex items-center justify-between px-5 py-3 text-sm">
                <div>
                  <p className="text-[#1E293B] dark:text-[#F1F5F9] font-semibold">${Number(r.amount).toFixed(2)} · {r.method === 'bkash' ? 'bKash' : 'Nagad'}</p>
                  <p className="text-xs text-[#64748B] dark:text-slate-400">TrxID: {r.trx_id} · {new Date(r.created_at).toLocaleString()}</p>
                  {r.rejection_reason && (
                    <p className="text-xs text-rose-600 mt-1 font-medium">Rejected: {r.rejection_reason}</p>
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
