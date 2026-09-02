import React, { useState, useEffect, useCallback } from 'react'
import {
  Gift,
  Copy,
  Check,
  Users,
  DollarSign,
  TrendingUp,
  Share2,
  ExternalLink,
  ArrowUpRight,
  ShieldCheck,
  Sparkles,
  Calendar,
  Layers,
  Search,
  MessageCircle,
  Send,
  Facebook,
  Info,
} from 'lucide-react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import StatCard from '../components/StatCard'
import { EmptyState, StatusBadge } from '../components/Shared'
import { Link } from 'react-router-dom'

export default function Referrals() {
  const { user, profile } = useAuth()
  const [copiedLink, setCopiedLink] = useState(false)
  const [copiedCode, setCopiedCode] = useState(false)
  const [commissions, setCommissions] = useState([])
  const [referredUsers, setReferredUsers] = useState([])
  const [referralRate, setReferralRate] = useState('5.00')
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('commissions') // 'commissions' | 'members'
  const [searchQuery, setSearchQuery] = useState('')

  // Derive domain and dynamic unique referral code (NO hardcoded TASKLY fallback)
  const appDomain =
    import.meta.env.VITE_APP_URL ||
    (typeof window !== 'undefined' ? window.location.origin : 'https://taskly.app')
  
  const fallbackCode = (profile?.full_name || user?.email?.split('@')[0] || 'WORK')
    .replace(/[^a-zA-Z]/g, '')
    .slice(0, 4)
    .toUpperCase()
    .padEnd(4, 'X') + (user?.id ? user.id.replace(/[^0-9]/g, '').slice(0, 4) || '8021' : '8021')

  const referralCode = profile?.referral_code || fallbackCode
  const referralLink = `${appDomain}/register?ref=${referralCode}`

  // Copy helpers
  const handleCopyLink = () => {
    navigator.clipboard.writeText(referralLink)
    setCopiedLink(true)
    setTimeout(() => setCopiedLink(false), 2000)
  }

  const handleCopyCode = () => {
    navigator.clipboard.writeText(referralCode)
    setCopiedCode(true)
    setTimeout(() => setCopiedCode(false), 2000)
  }

  // Load referral data from database
  const loadReferralData = useCallback(async () => {
    if (!user || !supabase) {
      setLoading(false)
      return
    }

    try {
      // 1. Fetch commission ledger
      const { data: commData, error: commErr } = await supabase
        .from('referral_commissions')
        .select(`
          id,
          source_type,
          source_id,
          eligible_amount,
          commission_rate,
          commission_amount,
          status,
          created_at,
          referred:profiles!referred_id(id, full_name, role)
        `)
        .eq('referrer_id', user.id)
        .order('created_at', { ascending: false })

      if (!commErr && commData) {
        setCommissions(commData)
      }

      // 2. Fetch referred profiles
      const { data: refData, error: refErr } = await supabase
        .from('profiles')
        .select('id, full_name, role, created_at')
        .eq('referred_by', user.id)
        .order('created_at', { ascending: false })

      if (!refErr && refData) {
        setReferredUsers(refData)
      }

      // 3. Fetch current system settings for referral rate
      const { data: settingData } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'referral_commission_rate')
        .maybeSingle()

      if (settingData?.value) {
        setReferralRate(settingData.value)
      }
    } catch (err) {
      console.error('Error fetching referral data:', err)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    loadReferralData()

    if (!isSupabaseConfigured || !supabase || !user?.id) return undefined

    // Realtime subscriptions for live commission updates
    const channel = supabase
      .channel(`referral-updates-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'referral_commissions',
          filter: `referrer_id=eq.${user.id}`,
        },
        () => loadReferralData()
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles',
          filter: `referred_by=eq.${user.id}`,
        },
        () => loadReferralData()
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'system_settings',
        },
        () => loadReferralData()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user, loadReferralData])

  // Aggregate stats
  const totalCommissionEarned = commissions.reduce(
    (acc, curr) => acc + Number(curr.commission_amount || 0),
    0
  )
  const totalReferralsCount = referredUsers.length

  // Filter commissions
  const filteredCommissions = commissions.filter((c) => {
    const name = c.referred?.full_name?.toLowerCase() || ''
    const type = c.source_type?.toLowerCase() || ''
    const q = searchQuery.toLowerCase()
    return name.includes(q) || type.includes(q)
  })

  // Filter members
  const filteredMembers = referredUsers.filter((m) => {
    const name = m.full_name?.toLowerCase() || ''
    const role = m.role?.toLowerCase() || ''
    const q = searchQuery.toLowerCase()
    return name.includes(q) || role.includes(q)
  })

  // Social Share URLs
  const shareText = `Join Taskly and earn money with micro-tasks or post tasks for fast results! Use my invite link to get started: ${referralLink}`
  const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`
  const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${encodeURIComponent('Join Taskly to earn money completing micro-tasks!')}`
  const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(referralLink)}`

  // Role constraint: If accessed by an employer or admin, show role constraint banner
  if (profile?.role && profile.role !== 'worker') {
    return (
      <div className="max-w-2xl mx-auto my-12 p-8 rounded-3xl bg-white dark:bg-[#111827] border border-[#CBD5E1] dark:border-[#2A3348] text-center shadow-sm">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 mb-4">
          <Gift size={28} />
        </div>
        <h2 className="font-display font-extrabold text-xl sm:text-2xl text-[#0F172A] dark:text-[#F1F5F9] mb-2">
          Worker-Exclusive Referral Program
        </h2>
        <p className="text-xs sm:text-sm text-[#475569] dark:text-slate-400 max-w-md mx-auto mb-6">
          The Taskly Referral & Commission Program is exclusively designed for <strong>Worker accounts</strong>. Your account is registered as an <strong>{profile.role}</strong>.
        </p>
        <Link
          to={profile.role === 'admin' ? '/admin' : '/employer'}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-primary px-6 py-3 text-xs sm:text-sm font-bold text-white shadow-md shadow-brand-primary/20 hover:bg-emerald-600 transition"
        >
          Return to Dashboard
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-300">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-extrabold text-2xl sm:text-3xl text-[#0F172A] dark:text-[#F1F5F9] tracking-tight flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-primary/10 text-emerald-600 dark:text-brand-primary">
              <Gift size={22} />
            </span>
            <span>Refer & Earn</span>
          </h1>
          <p className="text-xs sm:text-sm font-normal text-[#475569] dark:text-slate-400 mt-1">
            Invite friends to Taskly and earn <strong>{parseFloat(referralRate) || 5}% lifetime commission</strong> on their task earnings and deposits.
          </p>
        </div>

        {/* Commission Rate Badge */}
        <div className="inline-flex items-center gap-2 self-start sm:self-auto rounded-full bg-emerald-500/10 border border-emerald-500/20 px-3.5 py-1.5 text-xs font-bold text-emerald-600 dark:text-brand-primary shadow-xs">
          <Sparkles size={14} />
          <span>{parseFloat(referralRate) || 5}% Instant Lifetime Commission</span>
        </div>
      </div>

      {/* Referral Link & Code Action Card */}
      <div className="rounded-3xl bg-gradient-to-br from-white via-white to-slate-50 dark:from-[#111827] dark:via-[#111827] dark:to-[#0B1020] border border-[#E2E8F0] dark:border-[#2A3348] p-6 sm:p-8 shadow-sm relative overflow-hidden">
        <div className="absolute right-0 top-0 -mr-16 -mt-16 h-64 w-64 rounded-full bg-brand-primary/5 blur-3xl pointer-events-none" />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          {/* Left Column: Link and Code */}
          <div className="lg:col-span-8 space-y-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-brand-primary">
                Your Unique Invite Link
              </span>
              <h2 className="font-display font-extrabold text-lg sm:text-xl text-[#0F172A] dark:text-[#F1F5F9] mt-0.5">
                Share with friends & start earning automatically
              </h2>
            </div>

            {/* Link Input Bar with Copy Button */}
            <div className="flex flex-col sm:flex-row items-stretch gap-2.5">
              <div className="relative flex-1">
                <input
                  type="text"
                  readOnly
                  value={referralLink}
                  className="w-full rounded-xl border border-[#CBD5E1] dark:border-[#2A3348] bg-[#F8FAFC] dark:bg-[#0B1020] px-4 py-3 text-xs sm:text-sm font-mono text-[#0F172A] dark:text-[#F1F5F9] outline-none select-all"
                />
              </div>
              <button
                id="copy-referral-link-btn"
                type="button"
                onClick={handleCopyLink}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-primary px-5 py-3 text-xs sm:text-sm font-bold text-white shadow-md shadow-brand-primary/20 hover:bg-emerald-600 active:scale-95 transition"
              >
                {copiedLink ? <Check size={16} /> : <Copy size={16} />}
                <span>{copiedLink ? 'Link Copied!' : 'Copy Link'}</span>
              </button>
            </div>

            {/* Social Share Buttons */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="text-xs text-[#64748B] dark:text-slate-400 mr-1 font-medium">Quick share:</span>
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#E2E8F0] dark:border-[#2A3348] bg-white dark:bg-[#1E293B] px-3 py-1.5 text-xs font-semibold text-[#0F172A] dark:text-[#F1F5F9] hover:border-emerald-500 hover:text-emerald-600 dark:hover:text-brand-primary transition"
              >
                <MessageCircle size={14} className="text-emerald-500" />
                <span>WhatsApp</span>
              </a>
              <a
                href={telegramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#E2E8F0] dark:border-[#2A3348] bg-white dark:bg-[#1E293B] px-3 py-1.5 text-xs font-semibold text-[#0F172A] dark:text-[#F1F5F9] hover:border-blue-500 hover:text-blue-600 transition"
              >
                <Send size={14} className="text-blue-500" />
                <span>Telegram</span>
              </a>
              <a
                href={facebookUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#E2E8F0] dark:border-[#2A3348] bg-white dark:bg-[#1E293B] px-3 py-1.5 text-xs font-semibold text-[#0F172A] dark:text-[#F1F5F9] hover:border-blue-600 hover:text-blue-600 transition"
              >
                <Facebook size={14} className="text-blue-600" />
                <span>Facebook</span>
              </a>
            </div>
          </div>

          {/* Right Column: Code Badge Box */}
          <div className="lg:col-span-4 flex flex-col items-center justify-center p-5 rounded-2xl bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/20 text-center">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#64748B] dark:text-slate-400 mb-1">
              Your Referral Code
            </span>
            <div className="font-mono font-extrabold text-2xl tracking-wider text-emerald-600 dark:text-brand-primary my-1">
              {referralCode}
            </div>
            <p className="text-[11px] text-[#64748B] dark:text-slate-400 mb-3">
              Friends can type this code at registration
            </p>
            <button
              id="copy-referral-code-btn"
              type="button"
              onClick={handleCopyCode}
              className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl border border-emerald-500/30 bg-white dark:bg-[#0B1020] px-4 py-2 text-xs font-bold text-emerald-600 dark:text-brand-primary shadow-xs hover:bg-emerald-500/10 transition"
            >
              {copiedCode ? <Check size={14} /> : <Copy size={14} />}
              <span>{copiedCode ? 'Code Copied!' : 'Copy Code'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4 Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Users}
          label="Total Referrals"
          value={totalReferralsCount}
          tone="blue"
          hint="Registered with your link"
        />
        <StatCard
          icon={DollarSign}
          label="Total Commission Earned"
          value={`$${totalCommissionEarned.toFixed(2)}`}
          tone="green"
          hint="Automatically credited"
        />
        <StatCard
          icon={TrendingUp}
          label="Commission Rate"
          value="5.0%"
          tone="green"
          hint="On tasks & deposits"
        />
        <StatCard
          icon={Layers}
          label="Commissions Received"
          value={commissions.length}
          tone="purple"
          hint="Total completed events"
        />
      </div>

      {/* How it Works Step Flow */}
      <div className="rounded-2xl bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#2A3348] p-6 shadow-xs">
        <h3 className="font-display font-bold text-sm sm:text-base text-[#0F172A] dark:text-[#F1F5F9] mb-4 flex items-center gap-2">
          <Info size={18} className="text-emerald-600 dark:text-brand-primary" />
          <span>How the Referral & Commission System Works</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-start gap-3.5 p-4 rounded-xl bg-[#F8FAFC] dark:bg-[#0B1020] border border-[#E2E8F0]/60 dark:border-[#2A3348]/60">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-brand-primary font-display font-extrabold text-sm">
              1
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-bold text-[#0F172A] dark:text-[#F1F5F9]">
                Share your invite link
              </h4>
              <p className="text-xs text-[#64748B] dark:text-slate-400 mt-1 leading-relaxed">
                Send your unique referral link or code to friends, workers, or business owners looking to hire.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3.5 p-4 rounded-xl bg-[#F8FAFC] dark:bg-[#0B1020] border border-[#E2E8F0]/60 dark:border-[#2A3348]/60">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-display font-extrabold text-sm">
              2
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-bold text-[#0F172A] dark:text-[#F1F5F9]">
                They complete tasks or deposit
              </h4>
              <p className="text-xs text-[#64748B] dark:text-slate-400 mt-1 leading-relaxed">
                When a referred Worker’s submission is approved or an Employer’s deposit is verified.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3.5 p-4 rounded-xl bg-[#F8FAFC] dark:bg-[#0B1020] border border-[#E2E8F0]/60 dark:border-[#2A3348]/60">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 font-display font-extrabold text-sm">
              3
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-bold text-[#0F172A] dark:text-[#F1F5F9]">
                Get 5% instant payout
              </h4>
              <p className="text-xs text-[#64748B] dark:text-slate-400 mt-1 leading-relaxed">
                5% commission is instantly added to your available earnings (Workers) or deposit balance (Employers).
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Table / Ledger Section */}
      <div className="rounded-2xl bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#2A3348] shadow-xs overflow-hidden">
        {/* Table Header Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 sm:p-6 border-b border-[#E2E8F0] dark:border-[#2A3348]">
          {/* Tabs */}
          <div className="flex items-center gap-2 bg-[#F1F5F9] dark:bg-[#0B1020] p-1 rounded-xl border border-[#CBD5E1] dark:border-[#2A3348]">
            <button
              type="button"
              onClick={() => setActiveTab('commissions')}
              className={`rounded-lg px-4 py-2 text-xs sm:text-sm font-bold transition ${
                activeTab === 'commissions'
                  ? 'bg-white dark:bg-[#1E293B] text-[#0F172A] dark:text-[#F1F5F9] shadow-xs'
                  : 'text-[#64748B] dark:text-slate-400 hover:text-[#0F172A] dark:hover:text-white'
              }`}
            >
              Commission Ledger ({commissions.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('members')}
              className={`rounded-lg px-4 py-2 text-xs sm:text-sm font-bold transition ${
                activeTab === 'members'
                  ? 'bg-white dark:bg-[#1E293B] text-[#0F172A] dark:text-[#F1F5F9] shadow-xs'
                  : 'text-[#64748B] dark:text-slate-400 hover:text-[#0F172A] dark:hover:text-white'
              }`}
            >
              My Referrals ({referredUsers.length})
            </button>
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-64">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder={activeTab === 'commissions' ? 'Search commissions...' : 'Search members...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-[#CBD5E1] dark:border-[#2A3348] bg-[#F8FAFC] dark:bg-[#0B1020] pl-10 pr-4 py-2 text-xs sm:text-sm text-[#0F172A] dark:text-[#F1F5F9] placeholder-slate-400 outline-none transition focus:border-brand-primary"
            />
          </div>
        </div>

        {/* Content Area */}
        {activeTab === 'commissions' ? (
          /* Commissions Table */
          loading ? (
            <div className="p-12 text-center text-xs text-[#64748B] dark:text-slate-400">
              Loading commission records...
            </div>
          ) : filteredCommissions.length === 0 ? (
            <div className="p-8">
              <EmptyState
                icon={Gift}
                title="No commission records yet"
                description="Share your referral link with friends. When they get approved for tasks or make deposits, your 5% commissions will appear here."
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="border-b border-[#E2E8F0] dark:border-[#2A3348] bg-[#F8FAFC] dark:bg-[#0B1020]/50 text-[11px] font-bold uppercase tracking-wider text-[#64748B] dark:text-slate-400">
                  <tr>
                    <th className="px-5 py-3.5">Date</th>
                    <th className="px-5 py-3.5">Referred User</th>
                    <th className="px-5 py-3.5">Source Event</th>
                    <th className="px-5 py-3.5">Eligible Amount</th>
                    <th className="px-5 py-3.5">Rate</th>
                    <th className="px-5 py-3.5">Commission Earned</th>
                    <th className="px-5 py-3.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0] dark:divide-[#2A3348]">
                  {filteredCommissions.map((c) => (
                    <tr
                      key={c.id}
                      className="hover:bg-slate-50 dark:hover:bg-[#1E293B]/40 transition"
                    >
                      <td className="px-5 py-4 whitespace-nowrap text-xs text-[#64748B] dark:text-slate-400">
                        {new Date(c.created_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-xs font-bold text-[#0F172A] dark:text-white">
                            {c.referred?.full_name?.charAt(0) || 'U'}
                          </div>
                          <div>
                            <p className="font-semibold text-[#0F172A] dark:text-[#F1F5F9]">
                              {c.referred?.full_name || 'Anonymous'}
                            </p>
                            <span className="text-[10px] uppercase font-bold text-[#64748B] dark:text-slate-400">
                              {c.referred?.role || 'worker'}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-[#0F172A] dark:text-slate-200">
                          {c.source_type === 'task_approval' ? (
                            <span className="rounded-md bg-emerald-500/10 px-2 py-0.5 text-emerald-600 dark:text-brand-primary text-[11px] font-bold">
                              Task Approved
                            </span>
                          ) : (
                            <span className="rounded-md bg-blue-500/10 px-2 py-0.5 text-blue-600 dark:text-blue-400 text-[11px] font-bold">
                              Escrow Deposit
                            </span>
                          )}
                        </span>
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap font-medium text-[#475569] dark:text-slate-300">
                        ${Number(c.eligible_amount || 0).toFixed(2)}
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap font-semibold text-[#64748B] dark:text-slate-400">
                        {c.commission_rate || 5}%
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        <span className="font-bold text-emerald-600 dark:text-brand-primary">
                          +${Number(c.commission_amount || 0).toFixed(2)}
                        </span>
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        <StatusBadge status={c.status || 'completed'} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : (
          /* Referred Members List */
          loading ? (
            <div className="p-12 text-center text-xs text-[#64748B] dark:text-slate-400">
              Loading referred team members...
            </div>
          ) : filteredMembers.length === 0 ? (
            <div className="p-8">
              <EmptyState
                icon={Users}
                title="No referred members yet"
                description="Share your link above to invite friends, team members, or clients to Taskly."
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="border-b border-[#E2E8F0] dark:border-[#2A3348] bg-[#F8FAFC] dark:bg-[#0B1020]/50 text-[11px] font-bold uppercase tracking-wider text-[#64748B] dark:text-slate-400">
                  <tr>
                    <th className="px-5 py-3.5">User</th>
                    <th className="px-5 py-3.5">Role</th>
                    <th className="px-5 py-3.5">Joined Date</th>
                    <th className="px-5 py-3.5">Total Commission Generated</th>
                    <th className="px-5 py-3.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0] dark:divide-[#2A3348]">
                  {filteredMembers.map((m) => {
                    // Calculate total commissions generated by this user
                    const userCommissions = commissions.filter((c) => c.referred?.id === m.id)
                    const totalFromUser = userCommissions.reduce(
                      (acc, c) => acc + Number(c.commission_amount || 0),
                      0
                    )

                    return (
                      <tr
                        key={m.id}
                        className="hover:bg-slate-50 dark:hover:bg-[#1E293B]/40 transition"
                      >
                        <td className="px-5 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-primary/10 text-emerald-600 dark:text-brand-primary font-bold text-sm">
                              {m.full_name?.charAt(0) || 'U'}
                            </div>
                            <div>
                              <p className="font-bold text-[#0F172A] dark:text-[#F1F5F9]">
                                {m.full_name || 'Taskly Member'}
                              </p>
                              <span className="text-[11px] text-[#64748B] dark:text-slate-400">
                                ID: {m.id.substring(0, 8)}...
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap">
                          <span
                            className={`rounded-md px-2.5 py-1 text-[11px] font-bold uppercase ${
                              m.role === 'employer'
                                ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400'
                                : 'bg-emerald-500/10 text-emerald-600 dark:text-brand-primary'
                            }`}
                          >
                            {m.role || 'Worker'}
                          </span>
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap text-xs text-[#64748B] dark:text-slate-400">
                          {new Date(m.created_at).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap font-bold text-emerald-600 dark:text-brand-primary">
                          ${totalFromUser.toFixed(2)}
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-brand-primary bg-emerald-500/10 px-2 py-0.5 rounded-full">
                            Active
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )
        )}
      </div>
    </div>
  )
}
