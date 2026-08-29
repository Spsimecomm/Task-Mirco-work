import React, { useEffect, useState, useCallback } from 'react'
import { Loader as Loader2, Check, X, Users, DollarSign, TrendingUp, Wallet, ArrowDownToLine, ArrowUpFromLine, Banknote } from 'lucide-react'
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

  const totalCommission = earnings.reduce((sum, e) => sum + numericValue(e.commission_amount), 0)
    + withdrawalFees.reduce((sum, e) => sum + numericValue(e.fee_amount), 0)
  const totalEarningEntries = earnings.length + withdrawalFees.length
  const pendingDeposits = deposits.filter((d) => d.status === 'pending')
  const pendingWithdrawals = withdrawals.filter((w) => w.status === 'pending')
  const employers = users.filter((u) => u.role === 'employer')
  const workers = users.filter((u) => u.role === 'worker')

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-[#1E293B] dark:text-[#F1F5F9]">Admin Dashboard</h1>
        <p className="text-sm font-normal text-[#64748B] dark:text-slate-400 mt-1">Manage deposits, withdrawals, users, and platform earnings.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-5 bg-white dark:bg-[#1E293B] border border-[#CBD5E1] dark:border-white/10 rounded-xl">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#DCFCE7] dark:bg-mint-500/10 text-[#166534] dark:text-mint-500 font-bold">
              <DollarSign size={20} />
            </div>
            <div>
              <p className="text-2xl font-bold text-[#1E293B] dark:text-[#F1F5F9]">${totalCommission.toFixed(2)}</p>
              <p className="text-xs text-[#64748B] dark:text-slate-400">Total commission</p>
            </div>
          </div>
        </div>
        <div className="card p-5 bg-white dark:bg-[#1E293B] border border-[#CBD5E1] dark:border-white/10 rounded-xl">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#FEF3C7] dark:bg-signal-amber/10 text-[#B45309] dark:text-signal-amber font-bold">
              <ArrowDownToLine size={20} />
            </div>
            <div>
              <p className="text-2xl font-bold text-[#1E293B] dark:text-[#F1F5F9]">{pendingDeposits.length}</p>
              <p className="text-xs text-[#64748B] dark:text-slate-400">Pending deposits</p>
            </div>
          </div>
        </div>
        <div className="card p-5 bg-white dark:bg-[#1E293B] border border-[#CBD5E1] dark:border-white/10 rounded-xl">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#FFE4E6] dark:bg-signal-rose/10 text-[#E11D48] dark:text-signal-rose font-bold">
              <ArrowUpFromLine size={20} />
            </div>
            <div>
              <p className="text-2xl font-bold text-[#1E293B] dark:text-[#F1F5F9]">{pendingWithdrawals.length}</p>
              <p className="text-xs text-[#64748B] dark:text-slate-400">Pending withdrawals</p>
            </div>
          </div>
        </div>
        <div className="card p-5 bg-white dark:bg-[#1E293B] border border-[#CBD5E1] dark:border-white/10 rounded-xl">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#E0E7FF] dark:bg-signal-indigo/10 text-[#4338CA] dark:text-signal-indigo font-bold">
              <Users size={20} />
            </div>
            <div>
              <p className="text-2xl font-bold text-[#1E293B] dark:text-[#F1F5F9]">{users.length}</p>
              <p className="text-xs text-[#64748B] dark:text-slate-400">Total users</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 whitespace-nowrap rounded-lg px-4 py-2.5 text-sm font-medium border transition ${
              tab === t.id
                ? 'bg-emerald-600 dark:bg-mint-500 text-white dark:text-slate-900 border-emerald-600 dark:border-mint-500 font-semibold'
                : 'border-[#CBD5E1] dark:border-white/10 bg-white dark:bg-slate-800 text-[#1E293B] dark:text-slate-300 hover:border-slate-400 dark:hover:border-white/20 hover:bg-[#E2E8F0] dark:hover:text-white'
            }`}
          >
            <t.icon size={16} />
            {t.label}
          </button>
        ))}
      </div>

      <ErrorBanner message={error} />

      {loading ? (
        <div className="text-sm text-[#64748B] dark:text-slate-400 py-16 text-center">Loading…</div>
      ) : tab === 'deposits' ? (
        <div className="space-y-3">
          {deposits.length === 0 ? (
            <EmptyState icon={Banknote} title="No deposit requests" subtitle="Employer deposit requests will appear here." />
          ) : (
            deposits.map((d) => (
              <div key={d.id} className="card p-5 bg-white dark:bg-[#1E293B] border border-[#CBD5E1] dark:border-white/10 rounded-xl">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <p className="font-bold text-[#1E293B] dark:text-[#F1F5F9]">${money(d.amount)} · {d.method === 'bkash' ? 'bKash' : 'Nagad'}</p>
                    <p className="text-xs text-[#64748B] dark:text-slate-400">From: {d.sender_mobile} · TrxID: {d.trx_id}</p>
                    <p className="text-xs text-[#64748B] dark:text-slate-400">{new Date(d.created_at).toLocaleString()}</p>
                    {d.rejection_reason && (
                      <p className="text-xs text-rose-600 mt-1 font-medium">Rejected: {d.rejection_reason}</p>
                    )}
                  </div>
                  <StatusBadge status={d.status} />
                </div>
                {d.status === 'pending' && (
                  <div className="mt-4 pt-4 border-t border-[#CBD5E1] dark:border-white/10">
                    {rejectingId === d.id ? (
                      <div className="space-y-2">
                        <input
                          className="input"
                          placeholder="Rejection reason…"
                          value={rejectReason}
                          onChange={(e) => setRejectReason(e.target.value)}
                        />
                        <div className="flex gap-2">
                          <button onClick={() => handleRejectDeposit(d.id)} disabled={busyId === d.id} className="btn-secondary">
                            {busyId === d.id ? <Loader2 size={14} className="animate-spin" /> : <X size={14} />}
                            Confirm reject
                          </button>
                          <button onClick={() => setRejectingId(null)} className="btn-ghost">Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <button onClick={() => handleApproveDeposit(d.id)} disabled={busyId === d.id} className="btn-primary">
                          {busyId === d.id ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                          Approve & credit
                        </button>
                        <button onClick={() => setRejectingId(d.id)} className="btn-secondary">
                          <X size={14} /> Reject
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
            <EmptyState icon={ArrowUpFromLine} title="No withdrawal requests" subtitle="Worker withdrawal requests will appear here." />
          ) : (
            withdrawals.map((w) => (
              <div key={w.id} className="card p-5 bg-white dark:bg-[#1E293B] border border-[#CBD5E1] dark:border-white/10 rounded-xl">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <p className="font-bold text-[#1E293B] dark:text-[#F1F5F9]">${money(w.amount)} · {w.method === 'bkash' ? 'bKash' : 'Nagad'}</p>
                    <p className="text-xs text-[#64748B] dark:text-slate-400">To: {w.account_details}</p>
                    <p className="text-xs text-[#64748B] dark:text-slate-400">Fee: ${money(w.fee_amount)} · Worker receives: ${money(w.net_amount ?? w.amount)}</p>
                    <p className="text-xs text-[#64748B] dark:text-slate-400">{new Date(w.created_at).toLocaleString()}</p>
                  </div>
                  <StatusBadge status={w.status} />
                </div>
                {w.status === 'pending' && (
                  <div className="mt-4 pt-4 border-t border-[#CBD5E1] dark:border-white/10">
                    {rejectingId === w.id ? (
                      <div className="space-y-2">
                        <input
                          className="input"
                          placeholder="Rejection reason…"
                          value={rejectReason}
                          onChange={(e) => setRejectReason(e.target.value)}
                        />
                        <div className="flex gap-2">
                          <button onClick={() => handleRejectWithdrawal(w.id)} disabled={busyId === w.id} className="btn-secondary">
                            {busyId === w.id ? <Loader2 size={14} className="animate-spin" /> : <X size={14} />}
                            Confirm reject
                          </button>
                          <button onClick={() => setRejectingId(null)} className="btn-ghost">Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <button onClick={() => handleApproveWithdrawal(w.id)} disabled={busyId === w.id} className="btn-primary">
                          {busyId === w.id ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                          Mark as paid
                        </button>
                        <button onClick={() => setRejectingId(w.id)} className="btn-secondary">
                          <X size={14} /> Reject
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
            <h3 className="text-sm font-bold text-[#1E293B] dark:text-[#F1F5F9] mb-3">Employers ({employers.length})</h3>
            <div className="card divide-y divide-[#E2E8F0] dark:divide-white/10 bg-white dark:bg-[#1E293B] border border-[#CBD5E1] dark:border-white/10 rounded-xl">
              {employers.length === 0 ? (
                <p className="p-5 text-sm text-[#64748B] dark:text-slate-400">No employers registered.</p>
              ) : (
                employers.map((u) => (
                  <div key={u.id} className="flex items-center justify-between px-5 py-3 text-sm">
                    <div>
                      <p className="text-[#1E293B] dark:text-[#F1F5F9] font-semibold">{u.full_name}</p>
                      <p className="text-xs text-[#64748B] dark:text-slate-400">Balance: ${money(u.deposited)} · Reserved: ${money(u.pending)} · Spent: ${money(u.spent)}</p>
                    </div>
                    <StatusBadge status={u.role} />
                  </div>
                ))
              )}
            </div>
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#1E293B] dark:text-[#F1F5F9] mb-3">Workers ({workers.length})</h3>
            <div className="card divide-y divide-[#E2E8F0] dark:divide-white/10 bg-white dark:bg-[#1E293B] border border-[#CBD5E1] dark:border-white/10 rounded-xl">
              {workers.length === 0 ? (
                <p className="p-5 text-sm text-[#64748B] dark:text-slate-400">No workers registered.</p>
              ) : (
                workers.map((u) => (
                  <div key={u.id} className="flex items-center justify-between px-5 py-3 text-sm">
                    <div>
                      <p className="text-[#1E293B] dark:text-[#F1F5F9] font-semibold">{u.full_name}</p>
                      <p className="text-xs text-[#64748B] dark:text-slate-400">Earned: ${money(u.earnings)} · Pending: ${money(u.pending)} · Withdrawn: ${money(u.spent)}</p>
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
            <EmptyState icon={TrendingUp} title="No earnings yet" subtitle="Platform commission from approved tasks and withdrawal fees will appear here." />
          ) : (
            <>
              <div className="card p-5 flex items-center gap-4 bg-white dark:bg-[#1E293B] border border-[#CBD5E1] dark:border-white/10 rounded-xl">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#DCFCE7] dark:bg-mint-500/10 text-[#166534] dark:text-mint-500 font-bold">
                  <Wallet size={24} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-[#1E293B] dark:text-[#F1F5F9]">${totalCommission.toFixed(2)}</p>
                  <p className="text-sm text-[#64748B] dark:text-slate-400">Total platform commission ({totalEarningEntries} entries)</p>
                </div>
              </div>
              {earnings.map((e) => (
                <div key={e.id} className="card p-5 flex items-center justify-between bg-white dark:bg-[#1E293B] border border-[#CBD5E1] dark:border-white/10 rounded-xl">
                  <div>
                    <p className="text-sm font-semibold text-[#1E293B] dark:text-[#F1F5F9]">Task commission · Reward: ${money(e.reward_amount)}</p>
                    <p className="text-xs text-[#64748B] dark:text-slate-400 mt-0.5">
                      Commission ({numericValue(e.commission_rate).toFixed(0)}%): ${money(e.commission_amount)} · {new Date(e.created_at).toLocaleString()}
                    </p>
                  </div>
                  <span className="text-sm font-bold text-emerald-600 dark:text-mint-500">+${money(e.commission_amount)}</span>
                </div>
              ))}
              {withdrawalFees.map((e) => (
                <div key={e.id} className="card p-5 flex items-center justify-between bg-white dark:bg-[#1E293B] border border-[#CBD5E1] dark:border-white/10 rounded-xl">
                  <div>
                    <p className="text-sm font-semibold text-[#1E293B] dark:text-[#F1F5F9]">Withdrawal fee · Requested: ${money(e.withdrawal_amount)}</p>
                    <p className="text-xs text-[#64748B] dark:text-slate-400 mt-0.5">
                      Fee ({numericValue(e.fee_rate).toFixed(0)}%): ${money(e.fee_amount)} · {new Date(e.created_at).toLocaleString()}
                    </p>
                  </div>
                  <span className="text-sm font-bold text-emerald-600 dark:text-mint-500">+${money(e.fee_amount)}</span>
                </div>
              ))}
            </>
          )}
        </div>
      ) : null}
    </div>
  )
}
