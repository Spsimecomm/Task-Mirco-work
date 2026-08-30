import React, { useEffect, useState, useCallback } from 'react'
import {
  Loader2,
  Check,
  X,
  Users,
  DollarSign,
  TrendingUp,
  Wallet,
  ArrowDownToLine,
  ArrowUpFromLine,
  Banknote,
  ShieldAlert,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { StatusBadge, ErrorBanner, EmptyState } from '../components/Shared'

const TABS = [
  { id: 'deposits', label: 'Deposits', icon: ArrowDownToLine },
  { id: 'withdrawals', label: 'Withdrawals', icon: ArrowUpFromLine },
  { id: 'users', label: 'Users', icon: Users },
  { id: 'earnings', label: 'Platform Earnings', icon: TrendingUp },
]

function money(value) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed.toFixed(2) : '0.00'
}

function numericValue(value) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

export default function AdminDashboard() {
  const { profile } = useAuth()
  const [tab, setTab] = useState('deposits')
  const [deposits, setDeposits] = useState([])
  const [withdrawals, setWithdrawals] = useState([])
  const [users, setUsers] = useState([])
  const [earnings, setEarnings] = useState([])
  const [withdrawalFees, setWithdrawalFees] = useState([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState(null)
  const [rejectingId, setRejectingId] = useState(null)
  const [rejectReason, setRejectReason] = useState('')
  const [error, setError] = useState('')

  const loadAll = useCallback(async () => {
    const [depRes, wdRes, userRes, earnRes, feeRes] = await Promise.all([
      supabase.from('deposit_requests').select('*').order('created_at', { ascending: false }),
      supabase.from('withdrawals').select('*').order('created_at', { ascending: false }),
      supabase.from('profiles').select('*').order('created_at', { ascending: false }),
      supabase.from('platform_earnings').select('*').order('created_at', { ascending: false }),
      supabase.from('withdrawal_fee_earnings').select('*').order('created_at', { ascending: false }),
    ])
    setDeposits(depRes.data || [])
    setWithdrawals(wdRes.data || [])
    setUsers(userRes.data || [])
    setEarnings(earnRes.data || [])
    setWithdrawalFees(feeRes.data || [])
    setLoading(false)
  }, [])

  useEffect(() => {
    loadAll()
  }, [loadAll])

  const handleApproveDeposit = async (id) => {
    setError('')
    setBusyId(id)
    try {
      const { error: rpcError } = await supabase.rpc('admin_approve_deposit', { p_deposit_id: id })
      if (rpcError) throw rpcError
      await loadAll()
    } catch (err) {
      setError(err.message || 'Could not approve deposit.')
    } finally {
      setBusyId(null)
    }
  }

  const handleRejectDeposit = async (id) => {
    setError('')
    setBusyId(id)
    try {
      const { error: rpcError } = await supabase.rpc('admin_reject_deposit', {
        p_deposit_id: id,
        p_reason: rejectReason || 'Invalid transaction.',
      })
      if (rpcError) throw rpcError
      setRejectingId(null)
      setRejectReason('')
      await loadAll()
    } catch (err) {
      setError(err.message || 'Could not reject deposit.')
    } finally {
      setBusyId(null)
    }
  }

  const handleApproveWithdrawal = async (id) => {
    setError('')
    setBusyId(id)
    try {
      const { error: rpcError } = await supabase.rpc('admin_approve_withdrawal', { p_withdrawal_id: id })
      if (rpcError) throw rpcError
      await loadAll()
    } catch (err) {
      setError(err.message || 'Could not approve withdrawal.')
    } finally {
      setBusyId(null)
    }
  }

  const handleRejectWithdrawal = async (id) => {
    setError('')
    setBusyId(id)
    try {
      const { error: rpcError } = await supabase.rpc('admin_reject_withdrawal', {
        p_withdrawal_id: id,
        p_reason: rejectReason || 'Rejected by admin.',
      })
      if (rpcError) throw rpcError
      setRejectingId(null)
      setRejectReason('')
      await loadAll()
    } catch (err) {
      setError(err.message || 'Could not reject withdrawal.')
    } finally {
      setBusyId(null)
    }
  }

  const totalCommission =
    earnings.reduce((sum, e) => sum + numericValue(e.commission_amount), 0) +
    withdrawalFees.reduce((sum, e) => sum + numericValue(e.fee_amount), 0)
  const totalEarningEntries = earnings.length + withdrawalFees.length
  const pendingDeposits = deposits.filter((d) => d.status === 'pending')
  const pendingWithdrawals = withdrawals.filter((w) => w.status === 'pending')
  const employers = users.filter((u) => u.role === 'employer')
  const workers = users.filter((u) => u.role === 'worker')

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-300 max-w-7xl mx-auto">
      <div>
        <h1 className="font-display font-extrabold text-2xl sm:text-3xl text-[#1E293B] dark:text-[#F1F5F9] tracking-tight">
          Admin Control Center
        </h1>
        <p className="text-xs sm:text-sm font-normal text-[#64748B] dark:text-slate-400 mt-1">
          Manage deposits, worker withdrawals, registered accounts, and platform fees
        </p>
      </div>

      {/* 4 Overview Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-5 bg-white dark:bg-[#111827] border border-[#CBD5E1] dark:border-[#2A3348] rounded-2xl shadow-sm">
          <div className="flex items-center gap-3.5">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-brand-primary">
              <DollarSign size={22} className="stroke-[2.5]" />
            </div>
            <div>
              <p className="text-xl sm:text-2xl font-display font-extrabold text-[#1E293B] dark:text-[#F1F5F9]">
                ${totalCommission.toFixed(2)}
              </p>
              <p className="text-xs text-[#64748B] dark:text-slate-400 font-medium">Total platform revenue</p>
            </div>
          </div>
        </div>

        <div className="card p-5 bg-white dark:bg-[#111827] border border-[#CBD5E1] dark:border-[#2A3348] rounded-2xl shadow-sm">
          <div className="flex items-center gap-3.5">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <ArrowDownToLine size={22} className="stroke-[2.5]" />
            </div>
            <div>
              <p className="text-xl sm:text-2xl font-display font-extrabold text-[#1E293B] dark:text-[#F1F5F9]">
                {pendingDeposits.length}
              </p>
              <p className="text-xs text-[#64748B] dark:text-slate-400 font-medium">Pending deposits</p>
            </div>
          </div>
        </div>

        <div className="card p-5 bg-white dark:bg-[#111827] border border-[#CBD5E1] dark:border-[#2A3348] rounded-2xl shadow-sm">
          <div className="flex items-center gap-3.5">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
              <ArrowUpFromLine size={22} className="stroke-[2.5]" />
            </div>
            <div>
              <p className="text-xl sm:text-2xl font-display font-extrabold text-[#1E293B] dark:text-[#F1F5F9]">
                {pendingWithdrawals.length}
              </p>
              <p className="text-xs text-[#64748B] dark:text-slate-400 font-medium">Pending withdrawals</p>
            </div>
          </div>
        </div>

        <div className="card p-5 bg-white dark:bg-[#111827] border border-[#CBD5E1] dark:border-[#2A3348] rounded-2xl shadow-sm">
          <div className="flex items-center gap-3.5">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              <Users size={22} className="stroke-[2.5]" />
            </div>
            <div>
              <p className="text-xl sm:text-2xl font-display font-extrabold text-[#1E293B] dark:text-[#F1F5F9]">
                {users.length}
              </p>
              <p className="text-xs text-[#64748B] dark:text-slate-400 font-medium">Total registered users</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Row */}
      <div className="flex gap-2 p-1.5 bg-white dark:bg-[#111827] border border-[#CBD5E1] dark:border-[#2A3348] rounded-2xl overflow-x-auto">
        {TABS.map((t) => {
          const isActive = tab === t.id
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 whitespace-nowrap rounded-xl px-4 py-2 text-xs sm:text-sm font-bold transition ${
                isActive
                  ? 'bg-brand-primary text-white shadow-sm'
                  : 'text-[#64748B] dark:text-slate-400 hover:text-[#1E293B] dark:hover:text-white'
              }`}
            >
              <t.icon size={16} />
              <span>{t.label}</span>
            </button>
          )
        })}
      </div>

      <ErrorBanner message={error} />

      {loading ? (
        <div className="text-sm text-[#64748B] dark:text-slate-400 py-16 text-center">Loading…</div>
      ) : tab === 'deposits' ? (
        <div className="space-y-3">
          {deposits.length === 0 ? (
            <EmptyState
              icon={Banknote}
              title="No deposit requests"
              subtitle="Employer deposit requests will appear here."
            />
          ) : (
            deposits.map((d) => (
              <div
                key={d.id}
                className="card p-5 sm:p-6 bg-white dark:bg-[#111827] border border-[#CBD5E1] dark:border-[#2A3348] rounded-2xl shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <p className="font-bold text-base text-[#1E293B] dark:text-[#F1F5F9]">
                      ${money(d.amount)} · <span className="uppercase text-brand-primary">{d.method}</span>
                    </p>
                    <p className="text-xs text-[#64748B] dark:text-slate-400">
                      From Mobile: <span className="font-semibold text-[#1E293B] dark:text-slate-200">{d.sender_mobile}</span> · TrxID:{' '}
                      <span className="font-mono font-bold text-emerald-600 dark:text-brand-primary">{d.trx_id}</span>
                    </p>
                    <p className="text-xs text-[#64748B] dark:text-slate-400">
                      Requested on {new Date(d.created_at).toLocaleString()}
                    </p>
                    {d.rejection_reason && (
                      <p className="text-xs text-rose-600 dark:text-rose-400 mt-1 font-medium">
                        Rejected: {d.rejection_reason}
                      </p>
                    )}
                  </div>
                  <StatusBadge status={d.status} />
                </div>
                {d.status === 'pending' && (
                  <div className="mt-4 pt-4 border-t border-[#E2E8F0] dark:border-[#2A3348]/60">
                    {rejectingId === d.id ? (
                      <div className="space-y-2.5">
                        <input
                          className="w-full rounded-xl border border-[#CBD5E1] dark:border-[#2A3348] bg-white dark:bg-[#0B0F17] px-3.5 py-2 text-xs sm:text-sm text-[#1E293B] dark:text-[#F1F5F9] outline-none transition focus:border-brand-primary"
                          placeholder="Rejection reason…"
                          value={rejectReason}
                          onChange={(e) => setRejectReason(e.target.value)}
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleRejectDeposit(d.id)}
                            disabled={busyId === d.id}
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 text-white hover:bg-rose-700 transition"
                          >
                            {busyId === d.id ? <Loader2 size={14} className="animate-spin" /> : <X size={14} />}
                            <span>Confirm Reject</span>
                          </button>
                          <button
                            onClick={() => setRejectingId(null)}
                            className="px-4 py-2 rounded-xl text-xs font-bold border border-[#CBD5E1] dark:border-[#2A3348] text-[#64748B] dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleApproveDeposit(d.id)}
                          disabled={busyId === d.id}
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-brand-primary text-white hover:bg-emerald-600 shadow-sm transition"
                        >
                          {busyId === d.id ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                          <span>Approve & Credit Balance</span>
                        </button>
                        <button
                          onClick={() => setRejectingId(d.id)}
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold border border-rose-500/30 text-rose-600 dark:text-rose-400 bg-rose-500/5 hover:bg-rose-500/10 transition"
                        >
                          <X size={14} /> <span>Reject</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      ) : tab === 'withdrawals' ? (
        <div className="space-y-3">
          {withdrawals.length === 0 ? (
            <EmptyState
              icon={ArrowUpFromLine}
              title="No withdrawal requests"
              subtitle="Worker withdrawal requests will appear here."
            />
          ) : (
            withdrawals.map((w) => (
              <div
                key={w.id}
                className="card p-5 sm:p-6 bg-white dark:bg-[#111827] border border-[#CBD5E1] dark:border-[#2A3348] rounded-2xl shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <p className="font-bold text-base text-[#1E293B] dark:text-[#F1F5F9]">
                      ${money(w.amount)} · <span className="uppercase text-brand-primary">{w.method}</span>
                    </p>
                    <p className="text-xs text-[#64748B] dark:text-slate-400">
                      Destination Number: <span className="font-mono font-bold text-[#1E293B] dark:text-slate-200">{w.account_details}</span>
                    </p>
                    <p className="text-xs text-[#64748B] dark:text-slate-400">
                      Fee: ${money(w.fee_amount)} · Worker receives:{' '}
                      <span className="font-bold text-emerald-600 dark:text-brand-primary">${money(w.net_amount ?? w.amount)}</span>
                    </p>
                    <p className="text-xs text-[#64748B] dark:text-slate-400">
                      Requested on {new Date(w.created_at).toLocaleString()}
                    </p>
                  </div>
                  <StatusBadge status={w.status} />
                </div>
                {w.status === 'pending' && (
                  <div className="mt-4 pt-4 border-t border-[#E2E8F0] dark:border-[#2A3348]/60">
                    {rejectingId === w.id ? (
                      <div className="space-y-2.5">
                        <input
                          className="w-full rounded-xl border border-[#CBD5E1] dark:border-[#2A3348] bg-white dark:bg-[#0B0F17] px-3.5 py-2 text-xs sm:text-sm text-[#1E293B] dark:text-[#F1F5F9] outline-none transition focus:border-brand-primary"
                          placeholder="Rejection reason…"
                          value={rejectReason}
                          onChange={(e) => setRejectReason(e.target.value)}
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleRejectWithdrawal(w.id)}
                            disabled={busyId === w.id}
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 text-white hover:bg-rose-700 transition"
                          >
                            {busyId === w.id ? <Loader2 size={14} className="animate-spin" /> : <X size={14} />}
                            <span>Confirm Reject</span>
                          </button>
                          <button
                            onClick={() => setRejectingId(null)}
                            className="px-4 py-2 rounded-xl text-xs font-bold border border-[#CBD5E1] dark:border-[#2A3348] text-[#64748B] dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleApproveWithdrawal(w.id)}
                          disabled={busyId === w.id}
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-brand-primary text-white hover:bg-emerald-600 shadow-sm transition"
                        >
                          {busyId === w.id ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                          <span>Mark as Paid & Completed</span>
                        </button>
                        <button
                          onClick={() => setRejectingId(w.id)}
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold border border-rose-500/30 text-rose-600 dark:text-rose-400 bg-rose-500/5 hover:bg-rose-500/10 transition"
                        >
                          <X size={14} /> <span>Reject</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      ) : tab === 'users' ? (
        <div className="space-y-6">
          <div>
            <h3 className="text-sm font-bold text-[#1E293B] dark:text-[#F1F5F9] mb-3">
              Employers ({employers.length})
            </h3>
            <div className="card divide-y divide-[#E2E8F0] dark:divide-[#2A3348]/60 bg-white dark:bg-[#111827] border border-[#CBD5E1] dark:border-[#2A3348] rounded-2xl overflow-hidden">
              {employers.length === 0 ? (
                <p className="p-5 text-sm text-[#64748B] dark:text-slate-400">No employers registered.</p>
              ) : (
                employers.map((u) => (
                  <div key={u.id} className="flex items-center justify-between px-5 py-3.5 text-xs sm:text-sm">
                    <div>
                      <p className="text-[#1E293B] dark:text-[#F1F5F9] font-bold">{u.full_name || 'Anonymous'}</p>
                      <p className="text-xs text-[#64748B] dark:text-slate-400 mt-0.5">
                        Balance: ${money(u.deposited)} · Reserved: ${money(u.pending)} · Spent: ${money(u.spent)}
                      </p>
                    </div>
                    <StatusBadge status={u.role} />
                  </div>
                ))
              )}
            </div>
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#1E293B] dark:text-[#F1F5F9] mb-3">
              Workers ({workers.length})
            </h3>
            <div className="card divide-y divide-[#E2E8F0] dark:divide-[#2A3348]/60 bg-white dark:bg-[#111827] border border-[#CBD5E1] dark:border-[#2A3348] rounded-2xl overflow-hidden">
              {workers.length === 0 ? (
                <p className="p-5 text-sm text-[#64748B] dark:text-slate-400">No workers registered.</p>
              ) : (
                workers.map((u) => (
                  <div key={u.id} className="flex items-center justify-between px-5 py-3.5 text-xs sm:text-sm">
                    <div>
                      <p className="text-[#1E293B] dark:text-[#F1F5F9] font-bold">{u.full_name || 'Anonymous'}</p>
                      <p className="text-xs text-[#64748B] dark:text-slate-400 mt-0.5">
                        Earned: ${money(u.earnings)} · Pending: ${money(u.pending)} · Withdrawn: ${money(u.spent)}
                      </p>
                    </div>
                    <StatusBadge status={u.role} />
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      ) : tab === 'earnings' ? (
        <div className="space-y-3">
          {totalEarningEntries === 0 ? (
            <EmptyState
              icon={TrendingUp}
              title="No earnings yet"
              subtitle="Platform commission from approved tasks and withdrawal fees will appear here."
            />
          ) : (
            <>
              <div className="card p-5 sm:p-6 flex items-center gap-4 bg-white dark:bg-[#111827] border border-[#CBD5E1] dark:border-[#2A3348] rounded-2xl shadow-sm">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-brand-primary font-bold">
                  <Wallet size={24} />
                </div>
                <div>
                  <p className="text-2xl font-display font-extrabold text-[#1E293B] dark:text-[#F1F5F9]">
                    ${totalCommission.toFixed(2)}
                  </p>
                  <p className="text-xs sm:text-sm text-[#64748B] dark:text-slate-400">
                    Total platform commission collected ({totalEarningEntries} transactions)
                  </p>
                </div>
              </div>
              {earnings.map((e) => (
                <div
                  key={e.id}
                  className="card p-5 flex items-center justify-between bg-white dark:bg-[#111827] border border-[#CBD5E1] dark:border-[#2A3348] rounded-2xl"
                >
                  <div>
                    <p className="text-xs sm:text-sm font-bold text-[#1E293B] dark:text-[#F1F5F9]">
                      Task commission · Task Reward: ${money(e.reward_amount)}
                    </p>
                    <p className="text-xs text-[#64748B] dark:text-slate-400 mt-0.5">
                      Commission ({numericValue(e.commission_rate).toFixed(0)}%): ${money(e.commission_amount)} ·{' '}
                      {new Date(e.created_at).toLocaleString()}
                    </p>
                  </div>
                  <span className="text-sm font-display font-extrabold text-emerald-600 dark:text-brand-primary">
                    +${money(e.commission_amount)}
                  </span>
                </div>
              ))}
              {withdrawalFees.map((e) => (
                <div
                  key={e.id}
                  className="card p-5 flex items-center justify-between bg-white dark:bg-[#111827] border border-[#CBD5E1] dark:border-[#2A3348] rounded-2xl"
                >
                  <div>
                    <p className="text-xs sm:text-sm font-bold text-[#1E293B] dark:text-[#F1F5F9]">
                      Withdrawal fee · Requested: ${money(e.withdrawal_amount)}
                    </p>
                    <p className="text-xs text-[#64748B] dark:text-slate-400 mt-0.5">
                      Fee ({numericValue(e.fee_rate).toFixed(0)}%): ${money(e.fee_amount)} ·{' '}
                      {new Date(e.created_at).toLocaleString()}
                    </p>
                  </div>
                  <span className="text-sm font-display font-extrabold text-emerald-600 dark:text-brand-primary">
                    +${money(e.fee_amount)}
                  </span>
                </div>
              ))}
            </>
          )}
        </div>
      ) : null}
    </div>
  )
}

