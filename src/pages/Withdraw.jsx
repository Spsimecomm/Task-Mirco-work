import React, { useEffect, useState, useCallback } from 'react'
import { ArrowUpFromLine, Loader2, CheckCircle2, Smartphone, ShieldCheck, Wallet } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { StatusBadge, ErrorBanner, EmptyState } from '../components/Shared'

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

const MIN_WITHDRAWAL = 2
const WITHDRAWAL_FEE_RATE = 0.02

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
    try {
      const { data, error: fetchErr } = await supabase
        .from('withdrawals')
        .select('*')
        .order('created_at', { ascending: false })
      if (fetchErr) throw fetchErr
      setRequests(data || [])
    } catch (err) {
      console.error('Error loading withdrawal requests:', err)
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
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-300 max-w-3xl mx-auto">
      <div>
        <h1 className="font-display font-extrabold text-2xl sm:text-3xl text-[#1E293B] dark:text-[#F1F5F9] tracking-tight">
          Withdraw Earnings
        </h1>
        <p className="text-xs sm:text-sm font-normal text-[#64748B] dark:text-slate-400 mt-1">
          Available balance:{' '}
          <span className="text-emerald-600 dark:text-brand-primary font-extrabold">
            ${Number(profile?.earnings ?? 0).toFixed(2)}
          </span>
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="card p-6 sm:p-8 space-y-5 rounded-2xl bg-white dark:bg-[#111827] border border-[#CBD5E1] dark:border-[#2A3348] shadow-sm"
      >
        <div>
          <label className="block text-xs font-bold text-[#1E293B] dark:text-slate-200 uppercase tracking-wider mb-2">
            Withdraw Amount (USD)
          </label>
          <input
            type="number"
            min={MIN_WITHDRAWAL}
            step="0.01"
            className="w-full rounded-xl border border-[#CBD5E1] dark:border-[#2A3348] bg-white dark:bg-[#0B0F17] px-4 py-3 text-xs sm:text-sm text-[#1E293B] dark:text-[#F1F5F9] placeholder-slate-400 dark:placeholder-slate-500 outline-none transition focus:border-brand-primary focus:ring-1 focus:ring-brand-primary"
            placeholder={`Minimum $${MIN_WITHDRAWAL.toFixed(2)}`}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>

        {requestedAmount > 0 && (
          <div className="rounded-xl border border-[#CBD5E1] dark:border-[#2A3348] bg-[#F8FAFC] dark:bg-[#1E293B]/60 p-4 space-y-2 text-xs sm:text-sm">
            <div className="flex items-center justify-between text-[#64748B] dark:text-slate-400">
              <span>Requested</span>
              <span className="text-[#1E293B] dark:text-[#F1F5F9] font-bold">${requestedAmount.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between text-[#64748B] dark:text-slate-400">
              <span>Fee ({(WITHDRAWAL_FEE_RATE * 100).toFixed(0)}%)</span>
              <span className="text-amber-600 dark:text-amber-400 font-bold">-${withdrawalFee.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between border-t border-[#E2E8F0] dark:border-[#2A3348] pt-2 font-bold">
              <span className="text-[#1E293B] dark:text-[#F1F5F9]">You will receive</span>
              <span className="text-emerald-600 dark:text-brand-primary font-display font-extrabold text-base sm:text-lg">
                ${netAmount.toFixed(2)}
              </span>
            </div>
          </div>
        )}

        <div>
          <label className="block text-xs font-bold text-[#1E293B] dark:text-slate-200 uppercase tracking-wider mb-2">
            Payout Method
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

        <div>
          <label className="block text-xs font-bold text-[#1E293B] dark:text-slate-200 uppercase tracking-wider mb-2">
            Your {method === 'bkash' ? 'bKash' : 'Nagad'} Number
          </label>
          <input
            type="tel"
            className="w-full rounded-xl border border-[#CBD5E1] dark:border-[#2A3348] bg-white dark:bg-[#0B0F17] px-4 py-3 text-xs sm:text-sm text-[#1E293B] dark:text-[#F1F5F9] placeholder-slate-400 dark:placeholder-slate-500 outline-none transition focus:border-brand-primary focus:ring-1 focus:ring-brand-primary"
            placeholder="01XXXXXXXXX"
            value={account}
            onChange={(e) => setAccount(e.target.value)}
          />
        </div>

        {success && (
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-xs sm:text-sm text-emerald-600 dark:text-brand-primary flex items-center gap-2 font-bold">
            <CheckCircle2 size={16} />
            <span>Withdrawal request submitted! Payout will be sent upon admin verification.</span>
          </div>
        )}
        <ErrorBanner message={error} />

        <button
          type="submit"
          disabled={loading}
          className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-brand-primary py-3.5 text-xs sm:text-sm font-bold text-white shadow-md shadow-brand-primary/20 hover:bg-emerald-600 transition"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <ArrowUpFromLine size={16} />}
          <span>Request Withdrawal</span>
        </button>
        <p className="text-xs text-[#64748B] dark:text-slate-400 text-center">
          Withdrawals are processed manually via official bKash / Nagad merchant gateway.
        </p>
      </form>

      {/* History */}
      <div className="card rounded-2xl bg-white dark:bg-[#111827] border border-[#CBD5E1] dark:border-[#2A3348] shadow-sm overflow-hidden">
        <div className="px-5 sm:px-6 py-4 border-b border-[#CBD5E1] dark:border-[#2A3348]">
          <h2 className="font-display font-bold text-base text-[#1E293B] dark:text-[#F1F5F9]">
            Withdrawal History
          </h2>
        </div>
        {requests.length === 0 ? (
          <div className="p-4">
            <EmptyState
              title="No withdrawals yet"
              subtitle="Your previous withdrawal requests and receipts will appear here."
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
                    Fee: ${Number(r.fee_amount ?? 0).toFixed(2)} · Net: ${Number(r.net_amount ?? r.amount).toFixed(2)}
                  </p>
                  <p className="text-[11px] text-[#64748B] dark:text-slate-500 mt-0.5">
                    {r.account_details} ·{' '}
                    {new Date(r.created_at).toLocaleString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
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

