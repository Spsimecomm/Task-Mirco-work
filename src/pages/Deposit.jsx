import React, { useEffect, useState, useCallback } from 'react'
import { ArrowDownToLine, Loader2, CheckCircle2, Smartphone, Copy, Check } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { StatusBadge, ErrorBanner, EmptyState } from '../components/Shared'

const PAYMENT_NUMBERS = {
  bkash: '01617-177380',
  nagad: 'Coming Soon',
}

const METHODS = [
  {
    id: 'bkash',
    label: 'bKash',
    activeClass:
      'bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-500/40 ring-2 ring-pink-500/20',
  },
  {
    id: 'nagad',
    label: 'Nagad',
    activeClass:
      'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/40 ring-2 ring-orange-500/20',
  },
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
  const [copied, setCopied] = useState(false)
  const [requests, setRequests] = useState([])

  const loadRequests = useCallback(async () => {
    try {
      const { data, error: fetchErr } = await supabase
        .from('deposit_requests')
        .select('*')
        .order('created_at', { ascending: false })
      if (fetchErr) throw fetchErr
      setRequests(data || [])
    } catch (err) {
      console.error('Error loading deposit requests:', err)
    }
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
      setError('Enter a valid deposit amount.')
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
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-300 max-w-3xl mx-auto">
      <div>
        <h1 className="font-display font-extrabold text-2xl sm:text-3xl text-[#1E293B] dark:text-[#F1F5F9] tracking-tight">
          Deposit Funds
        </h1>
        <p className="text-xs sm:text-sm font-normal text-[#64748B] dark:text-slate-400 mt-1">
          Current deposit balance:{' '}
          <span className="text-emerald-600 dark:text-brand-primary font-extrabold">
            ${Number(profile?.deposited ?? 0).toFixed(2)}
          </span>
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="card p-6 sm:p-8 space-y-5 rounded-2xl bg-white dark:bg-[#111827] border border-[#CBD5E1] dark:border-[#2A3348] shadow-sm"
      >
        <div>
          <label className="block text-xs font-bold text-[#1E293B] dark:text-slate-200 uppercase tracking-wider mb-2">
            Payment Method
          </label>
          <div className="grid grid-cols-2 gap-3">
            {METHODS.map((m) => (
              <button
                type="button"
                key={m.id}
                onClick={() => setMethod(m.id)}
                className={`flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-xs sm:text-sm font-bold transition-all ${
                  method === m.id
                    ? m.activeClass
                    : 'border-[#CBD5E1] dark:border-[#2A3348] bg-white dark:bg-[#0B0F17] text-[#64748B] dark:text-slate-400 hover:border-slate-400 dark:hover:border-slate-500'
                }`}
              >
                <Smartphone size={16} />
                <span>{m.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-[#CBD5E1] dark:border-[#2A3348] bg-[#F8FAFC] dark:bg-[#1E293B]/60 p-4 space-y-2 text-xs sm:text-sm">
          <p className="text-xs text-[#64748B] dark:text-slate-400">
            Send money to this official {method === 'bkash' ? 'bKash' : 'Nagad'} account:
          </p>
          <div className="flex items-center justify-between">
            <span className="font-display font-extrabold text-base sm:text-lg text-[#1E293B] dark:text-[#F1F5F9] tracking-wider">
              {PAYMENT_NUMBERS[method]}
            </span>
            <button
              type="button"
              onClick={() => copyToClipboard(PAYMENT_NUMBERS[method])}
              className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-brand-primary hover:underline"
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
              <span>{copied ? 'Copied' : 'Copy Number'}</span>
            </button>
          </div>
          <p className="text-[11px] text-[#64748B] dark:text-slate-500">
            Send Money (Personal / Merchant)
          </p>
        </div>

        <div>
          <label className="block text-xs font-bold text-[#1E293B] dark:text-slate-200 uppercase tracking-wider mb-2">
            Deposit Amount (USD)
          </label>
          <input
            type="number"
            min="1"
            step="0.01"
            className="w-full rounded-xl border border-[#CBD5E1] dark:border-[#2A3348] bg-white dark:bg-[#0B0F17] px-4 py-3 text-xs sm:text-sm text-[#1E293B] dark:text-[#F1F5F9] placeholder-slate-400 dark:placeholder-slate-500 outline-none transition focus:border-brand-primary focus:ring-1 focus:ring-brand-primary"
            placeholder="Enter deposit amount in USD ($)"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-[#1E293B] dark:text-slate-200 uppercase tracking-wider mb-2">
            Your Sender Mobile Number
          </label>
          <input
            type="tel"
            className="w-full rounded-xl border border-[#CBD5E1] dark:border-[#2A3348] bg-white dark:bg-[#0B0F17] px-4 py-3 text-xs sm:text-sm text-[#1E293B] dark:text-[#F1F5F9] placeholder-slate-400 dark:placeholder-slate-500 outline-none transition focus:border-brand-primary focus:ring-1 focus:ring-brand-primary"
            placeholder="01XXXXXXXXX"
            value={senderMobile}
            onChange={(e) => setSenderMobile(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-[#1E293B] dark:text-slate-200 uppercase tracking-wider mb-2">
            Transaction ID (TrxID)
          </label>
          <input
            type="text"
            className="w-full rounded-xl border border-[#CBD5E1] dark:border-[#2A3348] bg-white dark:bg-[#0B0F17] px-4 py-3 text-xs sm:text-sm text-[#1E293B] dark:text-[#F1F5F9] placeholder-slate-400 dark:placeholder-slate-500 outline-none transition focus:border-brand-primary focus:ring-1 focus:ring-brand-primary uppercase"
            placeholder="e.g. 9J3K92LLP1"
            value={trxId}
            onChange={(e) => setTrxId(e.target.value)}
          />
        </div>

        {success && (
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-xs sm:text-sm text-emerald-600 dark:text-brand-primary flex items-center gap-2 font-bold">
            <CheckCircle2 size={16} />
            <span>Deposit request submitted! Your balance will be credited after admin approval.</span>
          </div>
        )}
        <ErrorBanner message={error} />

        <button
          type="submit"
          disabled={loading}
          className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-brand-primary py-3.5 text-xs sm:text-sm font-bold text-white shadow-md shadow-brand-primary/20 hover:bg-emerald-600 transition"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <ArrowDownToLine size={16} />}
          <span>Submit Deposit Request</span>
        </button>
        <p className="text-xs text-[#64748B] dark:text-slate-400 text-center">
          Send money to the number above, then enter the TrxID. Deposits are credited instantly after automated or admin check.
        </p>
      </form>

      {/* History */}
      <div className="card rounded-2xl bg-white dark:bg-[#111827] border border-[#CBD5E1] dark:border-[#2A3348] shadow-sm overflow-hidden">
        <div className="px-5 sm:px-6 py-4 border-b border-[#CBD5E1] dark:border-[#2A3348]">
          <h2 className="font-display font-bold text-base text-[#1E293B] dark:text-[#F1F5F9]">
            Deposit History
          </h2>
        </div>
        {requests.length === 0 ? (
          <div className="p-4">
            <EmptyState
              title="No deposits yet"
              subtitle="Your submitted deposit requests will appear here."
            />
          </div>
        ) : (
          <ul className="divide-y divide-[#E2E8F0] dark:divide-[#2A3348]/60">
            {requests.map((r) => (
              <li key={r.id} className="flex items-center justify-between px-5 sm:px-6 py-3.5 text-xs sm:text-sm">
                <div>
                  <p className="text-[#1E293B] dark:text-[#F1F5F9] font-bold">
                    ${Number(r.amount).toFixed(2)} · {r.method === 'bkash' ? 'bKash' : 'Nagad'}
                  </p>
                  <p className="text-xs text-[#64748B] dark:text-slate-400 mt-0.5">
                    TrxID: <span className="font-mono">{r.trx_id}</span> ·{' '}
                    {new Date(r.created_at).toLocaleString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                  {r.rejection_reason && (
                    <p className="text-xs text-rose-600 mt-1 font-medium">
                      Rejected: {r.rejection_reason}
                    </p>
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

