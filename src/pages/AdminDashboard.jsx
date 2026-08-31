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
  Bell,
  Send,
  Sliders,
  Settings,
  Megaphone,
  Sparkles,
  AlertTriangle,
  Info,
  Trash2,
  Percent,
  CheckCircle2,
  RefreshCw,
  Calculator,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { StatusBadge, ErrorBanner, EmptyState } from '../components/Shared'

const TABS = [
  { id: 'deposits', label: 'Deposits', icon: ArrowDownToLine },
  { id: 'withdrawals', label: 'Withdrawals', icon: ArrowUpFromLine },
  { id: 'users', label: 'Users', icon: Users },
  { id: 'earnings', label: 'Platform Earnings', icon: TrendingUp },
  { id: 'notifications', label: 'Broadcast Notifications', icon: Bell },
  { id: 'settings', label: 'System & Commissions', icon: Sliders },
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
  const [userFilter, setUserFilter] = useState('all')
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

  // Notifications state
  const [notifications, setNotifications] = useState([])
  const [notifTitle, setNotifTitle] = useState('')
  const [notifMessage, setNotifMessage] = useState('')
  const [notifType, setNotifType] = useState('announcement')
  const [notifTargetRole, setNotifTargetRole] = useState('all')
  const [notifUserId, setNotifUserId] = useState('')
  const [sendingNotif, setSendingNotif] = useState(false)
  const [notifSuccess, setNotifSuccess] = useState('')
  const [deletingNotifId, setDeletingNotifId] = useState(null)

  // System Settings state
  const [systemSettings, setSystemSettings] = useState([])
  const [referralRate, setReferralRate] = useState('5.00')
  const [platformRate, setPlatformRate] = useState('10.00')
  const [withdrawalFeeRate, setWithdrawalFeeRate] = useState('2.00')
  const [savingSettings, setSavingSettings] = useState(false)
  const [settingsSuccess, setSettingsSuccess] = useState('')
  const [simReward, setSimReward] = useState('10.00')

  const loadAll = useCallback(async () => {
    try {
      const [depRes, wdRes, userRes, earnRes, feeRes, notifRes, settingsRes] = await Promise.all([
        supabase.from('deposit_requests').select('*').order('created_at', { ascending: false }),
        supabase.from('withdrawals').select('*').order('created_at', { ascending: false }),
        supabase.from('profiles').select('*').order('created_at', { ascending: false }),
        supabase.from('platform_earnings').select('*').order('created_at', { ascending: false }),
        supabase.from('withdrawal_fee_earnings').select('*').order('created_at', { ascending: false }),
        supabase.from('notifications').select('*').order('created_at', { ascending: false }),
        supabase.from('system_settings').select('*'),
      ])

      setDeposits(depRes.data || [])
      setWithdrawals(wdRes.data || [])
      setUsers(userRes.data || [])
      setEarnings(earnRes.data || [])
      setWithdrawalFees(feeRes.data || [])
      setNotifications(notifRes.data || [])

      if (settingsRes.data && settingsRes.data.length > 0) {
        setSystemSettings(settingsRes.data)
        const refSetting = settingsRes.data.find((s) => s.key === 'referral_commission_rate')
        const platSetting = settingsRes.data.find((s) => s.key === 'platform_commission_rate')
        const wFeeSetting = settingsRes.data.find((s) => s.key === 'withdrawal_fee_rate')

        if (refSetting) setReferralRate(refSetting.value)
        if (platSetting) setPlatformRate(platSetting.value)
        if (wFeeSetting) setWithdrawalFeeRate(wFeeSetting.value)
      }
    } catch (err) {
      console.error('Error loading admin data:', err)
      setError('Could not load some admin data.')
    } finally {
      setLoading(false)
    }
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

  // Send Notification Handler
  const handleSendNotification = async (e) => {
    e.preventDefault()
    setError('')
    setNotifSuccess('')

    if (!notifTitle.trim() || !notifMessage.trim()) {
      setError('Please enter both a notification title and message.')
      return
    }

    setSendingNotif(true)
    try {
      const targetUser = notifUserId.trim() ? notifUserId.trim() : null
      const { error: rpcErr } = await supabase.rpc('admin_send_notification', {
        p_title: notifTitle.trim(),
        p_message: notifMessage.trim(),
        p_type: notifType,
        p_target_role: notifTargetRole,
        p_user_id: targetUser,
      })

      if (rpcErr) throw rpcErr

      setNotifSuccess('Notification broadcasted successfully!')
      setNotifTitle('')
      setNotifMessage('')
      setNotifUserId('')
      await loadAll()

      setTimeout(() => setNotifSuccess(''), 4000)
    } catch (err) {
      setError(err.message || 'Failed to broadcast notification.')
    } finally {
      setSendingNotif(false)
    }
  }

  // Delete Notification Handler
  const handleDeleteNotification = async (notifId) => {
    if (!window.confirm('Are you sure you want to delete this notification broadcast?')) return
    setError('')
    setDeletingNotifId(notifId)
    try {
      const { error: rpcErr } = await supabase.rpc('admin_delete_notification', {
        p_notification_id: notifId,
      })
      if (rpcErr) throw rpcErr
      await loadAll()
    } catch (err) {
      setError(err.message || 'Failed to delete notification.')
    } finally {
      setDeletingNotifId(null)
    }
  }

  // Save Dynamic System Settings
  const handleSaveSettings = async (e) => {
    e.preventDefault()
    setError('')
    setSettingsSuccess('')

    const refNum = parseFloat(referralRate)
    const platNum = parseFloat(platformRate)
    const wFeeNum = parseFloat(withdrawalFeeRate)

    if (isNaN(refNum) || refNum < 0 || refNum > 100) {
      setError('Referral commission rate must be a valid percentage between 0% and 100%.')
      return
    }
    if (isNaN(platNum) || platNum < 0 || platNum > 100) {
      setError('Platform task commission rate must be a valid percentage between 0% and 100%.')
      return
    }
    if (isNaN(wFeeNum) || wFeeNum < 0 || wFeeNum > 100) {
      setError('Withdrawal processing fee rate must be a valid percentage between 0% and 100%.')
      return
    }

    setSavingSettings(true)
    try {
      await Promise.all([
        supabase.rpc('admin_update_system_setting', {
          p_key: 'referral_commission_rate',
          p_value: refNum.toFixed(2),
        }),
        supabase.rpc('admin_update_system_setting', {
          p_key: 'platform_commission_rate',
          p_value: platNum.toFixed(2),
        }),
        supabase.rpc('admin_update_system_setting', {
          p_key: 'withdrawal_fee_rate',
          p_value: wFeeNum.toFixed(2),
        }),
      ])

      setSettingsSuccess('System commission rates updated successfully! All future transactions will use the new dynamic rates.')
      await loadAll()

      setTimeout(() => setSettingsSuccess(''), 5000)
    } catch (err) {
      setError(err.message || 'Failed to save system settings.')
    } finally {
      setSavingSettings(false)
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

  const filteredUsers =
    userFilter === 'employers'
      ? employers
      : userFilter === 'workers'
      ? workers
      : users

  // Simulator values
  const simRewardVal = Math.max(0, parseFloat(simReward) || 0)
  const simPlatPct = Math.max(0, parseFloat(platformRate) || 0)
  const simRefPct = Math.max(0, parseFloat(referralRate) || 0)
  const simPlatFee = (simRewardVal * simPlatPct) / 100
  const simWorkerPay = simRewardVal - simPlatFee
  const simRefBonus = (simRewardVal * simRefPct) / 100
  const simNetProfit = simPlatFee - simRefBonus

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-300 max-w-7xl mx-auto">
      <div>
        <h1 className="font-display font-extrabold text-2xl sm:text-3xl text-[#0F172A] dark:text-[#F1F5F9] tracking-tight">
          Admin Control Center
        </h1>
        <p className="text-xs sm:text-sm font-normal text-[#475569] dark:text-slate-400 mt-1">
          Manage deposits, withdrawals, users, broadcast notifications, and dynamic commission rates
        </p>
      </div>

      {/* 4 Overview Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-5 bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#2A3348] rounded-2xl shadow-xs">
          <div className="flex items-center gap-3.5">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-brand-primary">
              <DollarSign size={22} className="stroke-[2.5]" />
            </div>
            <div>
              <p className="text-xl sm:text-2xl font-display font-extrabold text-[#0F172A] dark:text-[#F1F5F9]">
                ${totalCommission.toFixed(2)}
              </p>
              <p className="text-xs text-[#475569] dark:text-slate-400 font-medium">Platform revenue</p>
            </div>
          </div>
        </div>

        <div className="card p-5 bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#2A3348] rounded-2xl shadow-xs">
          <div className="flex items-center gap-3.5">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <ArrowDownToLine size={22} className="stroke-[2.5]" />
            </div>
            <div>
              <p className="text-xl sm:text-2xl font-display font-extrabold text-[#0F172A] dark:text-[#F1F5F9]">
                {pendingDeposits.length}
              </p>
              <p className="text-xs text-[#475569] dark:text-slate-400 font-medium">Pending deposits</p>
            </div>
          </div>
        </div>

        <div className="card p-5 bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#2A3348] rounded-2xl shadow-xs">
          <div className="flex items-center gap-3.5">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
              <ArrowUpFromLine size={22} className="stroke-[2.5]" />
            </div>
            <div>
              <p className="text-xl sm:text-2xl font-display font-extrabold text-[#0F172A] dark:text-[#F1F5F9]">
                {pendingWithdrawals.length}
              </p>
              <p className="text-xs text-[#475569] dark:text-slate-400 font-medium">Pending withdrawals</p>
            </div>
          </div>
        </div>

        <div className="card p-5 bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#2A3348] rounded-2xl shadow-xs">
          <div className="flex items-center gap-3.5">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              <Users size={22} className="stroke-[2.5]" />
            </div>
            <div>
              <p className="text-xl sm:text-2xl font-display font-extrabold text-[#0F172A] dark:text-[#F1F5F9]">
                {users.length}
              </p>
              <p className="text-xs text-[#475569] dark:text-slate-400 font-medium">Registered users</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Row */}
      <div className="flex gap-2 p-1.5 bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#2A3348] rounded-2xl overflow-x-auto shadow-xs">
        {TABS.map((t) => {
          const isActive = tab === t.id
          return (
            <button
              key={t.id}
              onClick={() => {
                setTab(t.id)
                setError('')
              }}
              className={`flex items-center gap-2 whitespace-nowrap rounded-xl px-4 py-2 text-xs sm:text-sm font-bold transition ${
                isActive
                  ? 'bg-brand-primary text-white shadow-xs'
                  : 'text-[#475569] dark:text-slate-400 hover:text-[#0F172A] dark:hover:text-white'
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
        <div className="text-sm text-[#475569] dark:text-slate-400 py-16 text-center flex items-center justify-center gap-2">
          <Loader2 size={18} className="animate-spin text-brand-primary" />
          <span>Loading…</span>
        </div>
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
                className="card p-5 sm:p-6 bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#2A3348] rounded-2xl shadow-xs"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <p className="font-bold text-base text-[#0F172A] dark:text-[#F1F5F9]">
                      ${money(d.amount)} · <span className="uppercase text-brand-primary font-bold">{d.method}</span>
                    </p>
                    <p className="text-xs text-[#475569] dark:text-slate-400">
                      From Mobile: <span className="font-semibold text-[#0F172A] dark:text-slate-200">{d.sender_mobile}</span> · TrxID:{' '}
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
                          className="w-full rounded-xl border border-[#CBD5E1] dark:border-[#2A3348] bg-white dark:bg-[#0B0F17] px-3.5 py-2 text-xs sm:text-sm text-[#0F172A] dark:text-[#F1F5F9] outline-none transition focus:border-brand-primary"
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
                            className="px-4 py-2 rounded-xl text-xs font-bold border border-[#CBD5E1] dark:border-[#2A3348] text-[#475569] dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
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
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-brand-primary text-white hover:bg-emerald-600 shadow-xs transition"
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
                className="card p-5 sm:p-6 bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#2A3348] rounded-2xl shadow-xs"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <p className="font-bold text-base text-[#0F172A] dark:text-[#F1F5F9]">
                      ${money(w.amount)} · <span className="uppercase text-brand-primary font-bold">{w.method}</span>
                    </p>
                    <p className="text-xs text-[#475569] dark:text-slate-400">
                      Destination Number: <span className="font-mono font-bold text-[#0F172A] dark:text-slate-200">{w.account_details}</span>
                    </p>
                    <p className="text-xs text-[#475569] dark:text-slate-400">
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
                          className="w-full rounded-xl border border-[#CBD5E1] dark:border-[#2A3348] bg-white dark:bg-[#0B0F17] px-3.5 py-2 text-xs sm:text-sm text-[#0F172A] dark:text-[#F1F5F9] outline-none transition focus:border-brand-primary"
                          placeholder="Rejection reason…"
                          value={rejectReason}
                          onChange={(e) => setRejectReason(e.target.value)}
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleRejectWithdrawal(w.id)}
                            disabled={busyId === d.id}
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 text-white hover:bg-rose-700 transition"
                          >
                            {busyId === w.id ? <Loader2 size={14} className="animate-spin" /> : <X size={14} />}
                            <span>Confirm Reject</span>
                          </button>
                          <button
                            onClick={() => setRejectingId(null)}
                            className="px-4 py-2 rounded-xl text-xs font-bold border border-[#CBD5E1] dark:border-[#2A3348] text-[#475569] dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
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
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-brand-primary text-white hover:bg-emerald-600 shadow-xs transition"
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
        <div className="space-y-4">
          <div className="flex gap-2">
            {[
              { id: 'all', label: `All Users (${users.length})` },
              { id: 'employers', label: `Employers (${employers.length})` },
              { id: 'workers', label: `Workers (${workers.length})` },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setUserFilter(f.id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold border transition ${
                  userFilter === f.id
                    ? 'bg-brand-primary text-white border-brand-primary shadow-xs'
                    : 'bg-white dark:bg-[#111827] border-[#E2E8F0] dark:border-[#2A3348] text-[#475569] dark:text-slate-300 hover:border-slate-400'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="card divide-y divide-[#E2E8F0] dark:divide-[#2A3348]/60 bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#2A3348] rounded-2xl overflow-hidden shadow-xs">
            {filteredUsers.length === 0 ? (
              <p className="p-6 text-sm text-[#475569] dark:text-slate-400 text-center">No users match this filter.</p>
            ) : (
              filteredUsers.map((u) => (
                <div key={u.id} className="flex items-center justify-between px-5 py-4 text-xs sm:text-sm hover:bg-slate-50 dark:hover:bg-[#1F2937]/30 transition">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-[#0F172A] dark:text-[#F1F5F9] font-bold">{u.full_name || 'Anonymous User'}</p>
                      <span className="text-[11px] font-mono text-[#64748B] dark:text-slate-400">@{u.username || 'user'}</span>
                    </div>
                    <p className="text-xs text-[#475569] dark:text-slate-400 mt-0.5">
                      {u.role === 'employer' ? (
                        <>Deposited: <span className="font-semibold text-emerald-600 dark:text-brand-primary">${money(u.deposited)}</span> · Reserved: ${money(u.pending)} · Spent: ${money(u.spent)}</>
                      ) : (
                        <>Earnings: <span className="font-semibold text-emerald-600 dark:text-brand-primary">${money(u.earnings)}</span> · Pending: ${money(u.pending)} · Withdrawn: ${money(u.spent)}</>
                      )}
                    </p>
                  </div>
                  <StatusBadge status={u.role} />
                </div>
              ))
            )}
          </div>
        </div>
      ) : tab === 'earnings' ? (
        <div className="space-y-3">
          {totalEarningEntries === 0 ? (
            <EmptyState
              icon={TrendingUp}
              title="No platform earnings recorded"
              subtitle="Platform commission from approved tasks and withdrawal fees will appear here."
            />
          ) : (
            <>
              <div className="card p-5 sm:p-6 flex items-center gap-4 bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#2A3348] rounded-2xl shadow-xs">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-brand-primary font-bold">
                  <TrendingUp size={24} />
                </div>
                <div>
                  <p className="text-2xl font-display font-extrabold text-[#0F172A] dark:text-[#F1F5F9]">
                    ${totalCommission.toFixed(2)}
                  </p>
                  <p className="text-xs sm:text-sm text-[#475569] dark:text-slate-400 font-medium">
                    Total platform commission & processing fees ({totalEarningEntries} transactions)
                  </p>
                </div>
              </div>
              {earnings.map((e) => (
                <div
                  key={e.id}
                  className="card p-5 flex items-center justify-between bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#2A3348] rounded-2xl shadow-xs"
                >
                  <div>
                    <p className="text-xs sm:text-sm font-bold text-[#0F172A] dark:text-[#F1F5F9]">
                      Task commission · Task Reward: ${money(e.reward_amount)}
                    </p>
                    <p className="text-xs text-[#475569] dark:text-slate-400 mt-0.5">
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
                  className="card p-5 flex items-center justify-between bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#2A3348] rounded-2xl shadow-xs"
                >
                  <div>
                    <p className="text-xs sm:text-sm font-bold text-[#0F172A] dark:text-[#F1F5F9]">
                      Withdrawal processing fee · Requested: ${money(e.withdrawal_amount)}
                    </p>
                    <p className="text-xs text-[#475569] dark:text-slate-400 mt-0.5">
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
      ) : tab === 'notifications' ? (
        /* ================= BROADCAST NOTIFICATIONS TAB ================= */
        <div className="space-y-6">
          {/* Create Broadcast Notification Form Card */}
          <div className="card p-6 bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#2A3348] rounded-2xl shadow-xs">
            <div className="flex items-center gap-3 pb-4 border-b border-[#E2E8F0] dark:border-[#2A3348]/60 mb-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-primary/10 text-brand-primary font-bold">
                <Megaphone size={20} />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-display font-bold text-[#0F172A] dark:text-[#F1F5F9]">
                  Send Broadcast Notification
                </h2>
                <p className="text-xs text-[#475569] dark:text-slate-400">
                  Compose real-time global announcements or role-targeted alerts for all users
                </p>
              </div>
            </div>

            {notifSuccess && (
              <div className="mb-5 flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 px-4 py-3 text-xs font-semibold text-emerald-700 dark:text-brand-primary">
                <CheckCircle2 size={16} />
                <span>{notifSuccess}</span>
              </div>
            )}

            <form onSubmit={handleSendNotification} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Title */}
                <div className="md:col-span-2 space-y-1.5">
                  <label className="text-xs font-bold text-[#0F172A] dark:text-slate-200">
                    Notification Title <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Special Weekend Bonus Campaign 🎉"
                    value={notifTitle}
                    onChange={(e) => setNotifTitle(e.target.value)}
                    className="w-full rounded-xl border border-[#CBD5E1] dark:border-[#2A3348] bg-white dark:bg-[#0B0F17] px-3.5 py-2.5 text-xs sm:text-sm text-[#0F172A] dark:text-[#F1F5F9] outline-none transition focus:border-brand-primary"
                  />
                </div>

                {/* Notification Type */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#0F172A] dark:text-slate-200">
                    Notification Type
                  </label>
                  <select
                    value={notifType}
                    onChange={(e) => setNotifType(e.target.value)}
                    className="w-full rounded-xl border border-[#CBD5E1] dark:border-[#2A3348] bg-white dark:bg-[#0B0F17] px-3.5 py-2.5 text-xs sm:text-sm text-[#0F172A] dark:text-[#F1F5F9] outline-none transition focus:border-brand-primary"
                  >
                    <option value="announcement">📢 Global Announcement</option>
                    <option value="system">🛡️ System Update</option>
                    <option value="commission">💰 Commission Alert</option>
                    <option value="reward">🎁 Reward & Bonus</option>
                    <option value="alert">⚠️ Urgent Alert</option>
                  </select>
                </div>
              </div>

              {/* Message Content */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#0F172A] dark:text-slate-200">
                  Message Content <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Type the full message details for the notification..."
                  value={notifMessage}
                  onChange={(e) => setNotifMessage(e.target.value)}
                  className="w-full rounded-xl border border-[#CBD5E1] dark:border-[#2A3348] bg-white dark:bg-[#0B0F17] px-3.5 py-2.5 text-xs sm:text-sm text-[#0F172A] dark:text-[#F1F5F9] outline-none transition focus:border-brand-primary leading-relaxed"
                />
              </div>

              {/* Target Audience Controls */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#0F172A] dark:text-slate-200">
                    Target Audience
                  </label>
                  <div className="flex gap-2">
                    {[
                      { id: 'all', label: 'All Users (Global)' },
                      { id: 'worker', label: 'Workers Only' },
                      { id: 'employer', label: 'Employers Only' },
                    ].map((t) => (
                      <button
                        type="button"
                        key={t.id}
                        onClick={() => setNotifTargetRole(t.id)}
                        className={`flex-1 px-3 py-2 rounded-xl text-xs font-bold border transition ${
                          notifTargetRole === t.id
                            ? 'bg-brand-primary text-white border-brand-primary shadow-xs'
                            : 'bg-[#F8FAFC] dark:bg-[#0B0F17] border-[#E2E8F0] dark:border-[#2A3348] text-[#475569] dark:text-slate-300 hover:border-slate-400'
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#0F172A] dark:text-slate-200 flex items-center justify-between">
                    <span>Optional Direct User Recipient</span>
                    <span className="text-[10px] text-[#94A3B8] dark:text-slate-500">(Leave blank for broadcast)</span>
                  </label>
                  <select
                    value={notifUserId}
                    onChange={(e) => setNotifUserId(e.target.value)}
                    className="w-full rounded-xl border border-[#CBD5E1] dark:border-[#2A3348] bg-white dark:bg-[#0B0F17] px-3.5 py-2 text-xs text-[#0F172A] dark:text-[#F1F5F9] outline-none transition focus:border-brand-primary"
                  >
                    <option value="">-- Broadcast to All in Target Role --</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.full_name || 'User'} ({u.role}) - {u.id.substring(0, 8)}...
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-3 flex justify-end">
                <button
                  type="submit"
                  disabled={sendingNotif}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-brand-primary text-white hover:bg-emerald-600 shadow-xs transition disabled:opacity-50"
                >
                  {sendingNotif ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Send size={16} />
                  )}
                  <span>{sendingNotif ? 'Sending Broadcast…' : 'Publish Broadcast'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Broadcast History Table */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold uppercase tracking-wider text-[#0F172A] dark:text-[#F1F5F9]">
                Broadcast History ({notifications.length})
              </h3>
              <button
                onClick={loadAll}
                className="flex items-center gap-1 text-xs text-brand-primary font-semibold hover:underline"
              >
                <RefreshCw size={12} />
                <span>Refresh</span>
              </button>
            </div>

            {notifications.length === 0 ? (
              <EmptyState
                icon={Bell}
                title="No broadcast notifications sent yet"
                subtitle="Published notifications will be archived here for tracking."
              />
            ) : (
              <div className="space-y-2.5">
                {notifications.map((n) => (
                  <div
                    key={n.id}
                    className="card p-4 sm:p-5 bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#2A3348] rounded-2xl shadow-xs flex items-start justify-between gap-4"
                  >
                    <div className="space-y-1.5 min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-sm text-[#0F172A] dark:text-[#F1F5F9]">
                          {n.title}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                          {n.type}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 dark:bg-slate-800 text-[#475569] dark:text-slate-300">
                          Audience: {n.user_id ? 'Direct User' : n.target_role === 'all' ? 'All Users' : `${n.target_role}s`}
                        </span>
                      </div>
                      <p className="text-xs text-[#475569] dark:text-slate-300 leading-relaxed">
                        {n.message}
                      </p>
                      <p className="text-[11px] text-[#94A3B8] dark:text-slate-500">
                        Broadcasted on {new Date(n.created_at).toLocaleString()}
                      </p>
                    </div>

                    <button
                      onClick={() => handleDeleteNotification(n.id)}
                      disabled={deletingNotifId === n.id}
                      className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition shrink-0"
                      title="Delete notification"
                      aria-label="Delete notification"
                    >
                      {deletingNotifId === n.id ? (
                        <Loader2 size={16} className="animate-spin text-rose-600" />
                      ) : (
                        <Trash2 size={16} />
                      )}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : tab === 'settings' ? (
        /* ================= DYNAMIC COMMISSION & SYSTEM SETTINGS TAB ================= */
        <div className="space-y-6">
          <div className="card p-6 bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#2A3348] rounded-2xl shadow-xs">
            <div className="flex items-center gap-3 pb-4 border-b border-[#E2E8F0] dark:border-[#2A3348]/60 mb-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-brand-primary font-bold">
                <Sliders size={20} />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-display font-bold text-[#0F172A] dark:text-[#F1F5F9]">
                  Dynamic Commission Rates & Platform Settings
                </h2>
                <p className="text-xs text-[#475569] dark:text-slate-400">
                  Update platform fee cuts and referral percentages dynamically stored in <span className="font-mono font-bold">system_settings</span>
                </p>
              </div>
            </div>

            {settingsSuccess && (
              <div className="mb-5 flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 px-4 py-3 text-xs font-semibold text-emerald-700 dark:text-brand-primary">
                <CheckCircle2 size={16} />
                <span>{settingsSuccess}</span>
              </div>
            )}

            <form onSubmit={handleSaveSettings} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {/* 1. Referral Commission Rate */}
                <div className="p-4 rounded-2xl border border-[#E2E8F0] dark:border-[#2A3348] bg-[#F8FAFC] dark:bg-[#0E1526]/60 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold uppercase tracking-wider text-[#0F172A] dark:text-slate-200">
                      Referral Commission
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-extrabold bg-emerald-500/10 text-emerald-600 dark:text-brand-primary">
                      {referralRate}%
                    </span>
                  </div>
                  <p className="text-[11px] text-[#475569] dark:text-slate-400">
                    Percentage awarded to the referrer whenever their referred user completes approved work or deposits.
                  </p>
                  <div className="flex items-center gap-2 pt-1">
                    <div className="relative flex-1">
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        max="100"
                        required
                        value={referralRate}
                        onChange={(e) => setReferralRate(e.target.value)}
                        className="w-full rounded-xl border border-[#CBD5E1] dark:border-[#2A3348] bg-white dark:bg-[#0B0F17] px-3 py-2 text-sm font-bold text-[#0F172A] dark:text-[#F1F5F9] outline-none transition focus:border-brand-primary"
                      />
                      <Percent size={14} className="absolute right-3 top-3 text-slate-400" />
                    </div>
                  </div>
                  <div className="flex gap-1.5 pt-1">
                    {['3.00', '5.00', '7.50', '10.00'].map((preset) => (
                      <button
                        type="button"
                        key={preset}
                        onClick={() => setReferralRate(preset)}
                        className="px-2 py-0.5 rounded-lg text-[10px] font-bold border border-[#CBD5E1] dark:border-[#2A3348] bg-white dark:bg-[#111827] text-[#475569] dark:text-slate-300 hover:border-brand-primary"
                      >
                        {preset}%
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2. Platform Task Commission Rate */}
                <div className="p-4 rounded-2xl border border-[#E2E8F0] dark:border-[#2A3348] bg-[#F8FAFC] dark:bg-[#0E1526]/60 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold uppercase tracking-wider text-[#0F172A] dark:text-slate-200">
                      Platform Task Fee
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-extrabold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                      {platformRate}%
                    </span>
                  </div>
                  <p className="text-[11px] text-[#475569] dark:text-slate-400">
                    Platform commission cut deducted from the task reward when an employer approves a submission.
                  </p>
                  <div className="flex items-center gap-2 pt-1">
                    <div className="relative flex-1">
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        max="100"
                        required
                        value={platformRate}
                        onChange={(e) => setPlatformRate(e.target.value)}
                        className="w-full rounded-xl border border-[#CBD5E1] dark:border-[#2A3348] bg-white dark:bg-[#0B0F17] px-3 py-2 text-sm font-bold text-[#0F172A] dark:text-[#F1F5F9] outline-none transition focus:border-brand-primary"
                      />
                      <Percent size={14} className="absolute right-3 top-3 text-slate-400" />
                    </div>
                  </div>
                  <div className="flex gap-1.5 pt-1">
                    {['5.00', '10.00', '15.00', '20.00'].map((preset) => (
                      <button
                        type="button"
                        key={preset}
                        onClick={() => setPlatformRate(preset)}
                        className="px-2 py-0.5 rounded-lg text-[10px] font-bold border border-[#CBD5E1] dark:border-[#2A3348] bg-white dark:bg-[#111827] text-[#475569] dark:text-slate-300 hover:border-brand-primary"
                      >
                        {preset}%
                      </button>
                    ))}
                  </div>
                </div>

                {/* 3. Withdrawal Processing Fee Rate */}
                <div className="p-4 rounded-2xl border border-[#E2E8F0] dark:border-[#2A3348] bg-[#F8FAFC] dark:bg-[#0E1526]/60 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold uppercase tracking-wider text-[#0F172A] dark:text-slate-200">
                      Withdrawal Fee Rate
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-extrabold bg-amber-500/10 text-amber-600 dark:text-amber-400">
                      {withdrawalFeeRate}%
                    </span>
                  </div>
                  <p className="text-[11px] text-[#475569] dark:text-slate-400">
                    Network processing fee deducted when workers withdraw earnings to bKash or Nagad.
                  </p>
                  <div className="flex items-center gap-2 pt-1">
                    <div className="relative flex-1">
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        max="100"
                        required
                        value={withdrawalFeeRate}
                        onChange={(e) => setWithdrawalFeeRate(e.target.value)}
                        className="w-full rounded-xl border border-[#CBD5E1] dark:border-[#2A3348] bg-white dark:bg-[#0B0F17] px-3 py-2 text-sm font-bold text-[#0F172A] dark:text-[#F1F5F9] outline-none transition focus:border-brand-primary"
                      />
                      <Percent size={14} className="absolute right-3 top-3 text-slate-400" />
                    </div>
                  </div>
                  <div className="flex gap-1.5 pt-1">
                    {['1.00', '2.00', '3.00', '5.00'].map((preset) => (
                      <button
                        type="button"
                        key={preset}
                        onClick={() => setWithdrawalFeeRate(preset)}
                        className="px-2 py-0.5 rounded-lg text-[10px] font-bold border border-[#CBD5E1] dark:border-[#2A3348] bg-white dark:bg-[#111827] text-[#475569] dark:text-slate-300 hover:border-brand-primary"
                      >
                        {preset}%
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Live Interactive Simulator */}
              <div className="p-5 rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.03] dark:bg-brand-primary/[0.04] space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calculator size={18} className="text-brand-primary" />
                    <h3 className="text-xs sm:text-sm font-bold text-[#0F172A] dark:text-[#F1F5F9]">
                      Live Commission Simulator
                    </h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[#475569] dark:text-slate-400">Sample Task Reward: $</span>
                    <input
                      type="number"
                      step="1"
                      min="1"
                      value={simReward}
                      onChange={(e) => setSimReward(e.target.value)}
                      className="w-20 rounded-lg border border-[#CBD5E1] dark:border-[#2A3348] bg-white dark:bg-[#0B0F17] px-2 py-1 text-xs font-bold text-center text-[#0F172A] dark:text-[#F1F5F9]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 rounded-xl bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#2A3348]">
                    <p className="text-[10px] font-medium text-[#64748B] dark:text-slate-400 uppercase">Worker Receives</p>
                    <p className="text-base sm:text-lg font-bold text-emerald-600 dark:text-brand-primary mt-0.5">
                      ${simWorkerPay.toFixed(2)}
                    </p>
                    <p className="text-[10px] text-slate-400">{(100 - simPlatPct).toFixed(1)}% of reward</p>
                  </div>

                  <div className="p-3 rounded-xl bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#2A3348]">
                    <p className="text-[10px] font-medium text-[#64748B] dark:text-slate-400 uppercase">Platform Gross Fee</p>
                    <p className="text-base sm:text-lg font-bold text-indigo-600 dark:text-indigo-400 mt-0.5">
                      ${simPlatFee.toFixed(2)}
                    </p>
                    <p className="text-[10px] text-slate-400">{simPlatPct.toFixed(1)}% fee rate</p>
                  </div>

                  <div className="p-3 rounded-xl bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#2A3348]">
                    <p className="text-[10px] font-medium text-[#64748B] dark:text-slate-400 uppercase">Referrer Bonus</p>
                    <p className="text-base sm:text-lg font-bold text-purple-600 dark:text-purple-400 mt-0.5">
                      ${simRefBonus.toFixed(2)}
                    </p>
                    <p className="text-[10px] text-slate-400">{simRefPct.toFixed(1)}% referral rate</p>
                  </div>

                  <div className="p-3 rounded-xl bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#2A3348]">
                    <p className="text-[10px] font-medium text-[#64748B] dark:text-slate-400 uppercase">Net Platform Profit</p>
                    <p className={`text-base sm:text-lg font-bold mt-0.5 ${simNetProfit >= 0 ? 'text-emerald-600 dark:text-brand-primary' : 'text-rose-600'}`}>
                      ${simNetProfit.toFixed(2)}
                    </p>
                    <p className="text-[10px] text-slate-400">After referral payout</p>
                  </div>
                </div>
              </div>

              {/* Save Button */}
              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={savingSettings}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-brand-primary text-white hover:bg-emerald-600 shadow-xs transition disabled:opacity-50"
                >
                  {savingSettings ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Check size={16} />
                  )}
                  <span>{savingSettings ? 'Saving Rates…' : 'Save System Settings'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  )
}
