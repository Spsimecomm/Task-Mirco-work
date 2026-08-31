import React, { useState, useEffect, useCallback, useRef } from 'react'
import {
  Bell,
  Check,
  CheckCheck,
  Megaphone,
  Sparkles,
  DollarSign,
  AlertTriangle,
  Info,
  ShieldCheck,
  X,
  Radio,
  Clock,
  Loader2,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

function getNotificationIcon(type) {
  switch (type) {
    case 'announcement':
      return { icon: Megaphone, color: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-50 dark:bg-indigo-500/10' }
    case 'commission':
      return { icon: DollarSign, color: 'text-emerald-600 dark:text-brand-primary', bg: 'bg-emerald-50 dark:bg-emerald-500/10' }
    case 'reward':
      return { icon: Sparkles, color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-50 dark:bg-purple-500/10' }
    case 'alert':
      return { icon: AlertTriangle, color: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-50 dark:bg-rose-500/10' }
    case 'system':
    default:
      return { icon: Info, color: 'text-sky-600 dark:text-sky-400', bg: 'bg-sky-50 dark:bg-sky-500/10' }
  }
}

function timeAgo(dateString) {
  try {
    const now = new Date()
    const past = new Date(dateString)
    const diffMs = now - past
    const diffSec = Math.floor(diffMs / 1000)
    const diffMin = Math.floor(diffSec / 60)
    const diffHour = Math.floor(diffMin / 60)
    const diffDay = Math.floor(diffHour / 24)

    if (diffMin < 1) return 'Just now'
    if (diffMin < 60) return `${diffMin}m ago`
    if (diffHour < 24) return `${diffHour}h ago`
    if (diffDay < 7) return `${diffDay}d ago`
    return past.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  } catch {
    return 'Recently'
  }
}

export default function NotificationCenter() {
  const { user, profile, role } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const [activeFilter, setActiveFilter] = useState('all') // 'all' | 'unread'
  const [notifications, setNotifications] = useState([])
  const [readIds, setReadIds] = useState(new Set())
  const [loading, setLoading] = useState(true)
  const [markingAll, setMarkingAll] = useState(false)
  const dropdownRef = useRef(null)

  // Fetch notifications and read receipts
  const fetchNotifications = useCallback(async () => {
    if (!user || !supabase) return

    try {
      // 1. Fetch relevant notifications: directed to this user, or global broadcast for 'all' / user's role
      const userRole = role || profile?.role || 'worker'
      let query = supabase.from('notifications').select('*')
      if (typeof query.or === 'function') {
        query = query.or(`user_id.eq.${user.id},and(user_id.is.null,target_role.in.(all,${userRole}))`)
      }

      const { data: notifData, error: notifErr } = await query
        .order('created_at', { ascending: false })
        .limit(40)

      if (!notifErr && notifData) {
        const filtered = notifData.filter(
          (n) => n.user_id === user.id || (!n.user_id && (n.target_role === 'all' || n.target_role === userRole))
        )
        setNotifications(filtered)
      }

      // 2. Fetch read receipts for this user
      const { data: readData, error: readErr } = await supabase
        .from('notification_reads')
        .select('notification_id')
        .eq('user_id', user.id)

      if (!readErr && readData) {
        setReadIds(new Set(readData.map((r) => r.notification_id)))
      }
    } catch (err) {
      console.error('Error fetching notifications:', err)
    } finally {
      setLoading(false)
    }
  }, [user, profile?.role, role])

  useEffect(() => {
    fetchNotifications()

    if (!supabase || !user) return

    // Realtime channel for instant notification broadcasts
    const channel = supabase
      .channel('public:notifications_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications' },
        () => {
          fetchNotifications()
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notification_reads', filter: `user_id=eq.${user.id}` },
        () => {
          fetchNotifications()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchNotifications, user])

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  // Mark single notification as read
  const handleMarkAsRead = async (notifId, e) => {
    if (e) e.stopPropagation()
    if (!user || readIds.has(notifId)) return

    // Optimistic UI update
    setReadIds((prev) => new Set([...prev, notifId]))

    try {
      await supabase.rpc('mark_notification_as_read', { p_notification_id: notifId })
    } catch (err) {
      console.error('Failed to mark notification as read:', err)
      fetchNotifications()
    }
  }

  // Mark all notifications as read
  const handleMarkAllAsRead = async () => {
    if (!user || unreadCount === 0) return
    setMarkingAll(true)

    // Optimistic update
    const allIds = new Set(notifications.map((n) => n.id))
    setReadIds(allIds)

    try {
      await supabase.rpc('mark_all_notifications_as_read')
    } catch (err) {
      console.error('Failed to mark all as read:', err)
      fetchNotifications()
    } finally {
      setMarkingAll(false)
    }
  }

  const unreadCount = notifications.filter((n) => !readIds.has(n.id)).length
  const filteredNotifications =
    activeFilter === 'unread'
      ? notifications.filter((n) => !readIds.has(n.id))
      : notifications

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Trigger Button */}
      <button
        id="notification-bell-btn"
        onClick={() => setIsOpen(!isOpen)}
        className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-[#E2E8F0] dark:border-[#2A3348] bg-[#F8FAFC] dark:bg-[#111827] text-[#0F172A] dark:text-slate-200 hover:border-slate-400 dark:hover:border-slate-500 transition shadow-xs"
        aria-label="View notifications"
        title="Notifications"
      >
        <Bell size={17} />
        {unreadCount > 0 && (
          <>
            <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-primary px-1 text-[10px] font-extrabold text-white shadow-xs animate-in zoom-in-75">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
            <span className="absolute -top-1 -right-1 h-4 min-w-4 rounded-full bg-brand-primary animate-ping opacity-60" />
          </>
        )}
      </button>

      {/* Notifications Dropdown Panel */}
      {isOpen && (
        <div
          id="notification-dropdown-panel"
          className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl border border-[#E2E8F0] dark:border-[#2A3348] bg-white dark:bg-[#111827] p-0 shadow-2xl z-50 animate-in fade-in slide-in-from-top-2 duration-150 overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#E2E8F0] dark:border-[#2A3348]/70 bg-[#F8FAFC] dark:bg-[#0E1526]/80">
            <div className="flex items-center gap-2">
              <span className="font-display font-bold text-xs uppercase tracking-wider text-[#0F172A] dark:text-[#F1F5F9]">
                Notifications
              </span>
              {unreadCount > 0 ? (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-brand-primary/10 text-brand-primary border border-brand-primary/20">
                  {unreadCount} new
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-[#64748B] dark:text-slate-400">
                  All caught up
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllAsRead}
                disabled={markingAll}
                className="inline-flex items-center gap-1 text-[11px] text-brand-primary font-bold hover:underline transition disabled:opacity-50"
              >
                {markingAll ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  <CheckCheck size={13} />
                )}
                <span>Mark all read</span>
              </button>
            )}
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 px-3 py-2 border-b border-[#E2E8F0] dark:border-[#2A3348]/40 bg-white dark:bg-[#111827]">
            <button
              onClick={() => setActiveFilter('all')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                activeFilter === 'all'
                  ? 'bg-brand-primary text-white shadow-xs'
                  : 'text-[#64748B] dark:text-slate-400 hover:bg-[#F1F5F9] dark:hover:bg-[#1F2937]'
              }`}
            >
              All ({notifications.length})
            </button>
            <button
              onClick={() => setActiveFilter('unread')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                activeFilter === 'unread'
                  ? 'bg-brand-primary text-white shadow-xs'
                  : 'text-[#64748B] dark:text-slate-400 hover:bg-[#F1F5F9] dark:hover:bg-[#1F2937]'
              }`}
            >
              Unread ({unreadCount})
            </button>
          </div>

          {/* Notification Items List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-[#E2E8F0] dark:divide-[#2A3348]/50">
            {loading ? (
              <div className="py-8 text-center text-xs text-[#64748B] dark:text-slate-400 flex items-center justify-center gap-2">
                <Loader2 size={15} className="animate-spin text-brand-primary" />
                <span>Loading notifications…</span>
              </div>
            ) : filteredNotifications.length === 0 ? (
              <div className="py-10 px-4 text-center">
                <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 dark:bg-[#1F2937] text-slate-400 mb-2">
                  <Bell size={18} />
                </div>
                <p className="text-xs font-bold text-[#0F172A] dark:text-[#F1F5F9]">
                  {activeFilter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
                </p>
                <p className="text-[11px] text-[#64748B] dark:text-slate-400 mt-0.5">
                  Announcements and updates will appear here.
                </p>
              </div>
            ) : (
              filteredNotifications.map((notif) => {
                const isRead = readIds.has(notif.id)
                const style = getNotificationIcon(notif.type)
                const IconComponent = style.icon

                return (
                  <div
                    key={notif.id}
                    onClick={() => handleMarkAsRead(notif.id)}
                    className={`group relative flex items-start gap-3 p-3.5 text-xs transition cursor-pointer ${
                      isRead
                        ? 'bg-white dark:bg-[#111827] hover:bg-[#F8FAFC] dark:hover:bg-[#1F2937]/30'
                        : 'bg-emerald-500/[0.04] dark:bg-brand-primary/[0.06] hover:bg-emerald-500/[0.08] dark:hover:bg-brand-primary/[0.1]'
                    }`}
                  >
                    {/* Icon Badge */}
                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${style.bg} ${style.color}`}>
                      <IconComponent size={16} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 pr-1">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <p className={`text-xs truncate ${isRead ? 'font-semibold text-[#0F172A] dark:text-slate-200' : 'font-bold text-[#0F172A] dark:text-white'}`}>
                          {notif.title}
                        </p>
                        <span className="text-[10px] text-[#94A3B8] dark:text-slate-500 shrink-0">
                          {timeAgo(notif.created_at)}
                        </span>
                      </div>

                      <p className="text-[11px] text-[#475569] dark:text-slate-300 line-clamp-2 leading-relaxed">
                        {notif.message}
                      </p>

                      {/* Footer tags */}
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-[#475569] dark:text-slate-400">
                          {notif.type || 'announcement'}
                        </span>
                        {notif.target_role && notif.target_role !== 'all' && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-semibold bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                            {notif.target_role}s
                          </span>
                        )}
                        {!isRead && (
                          <span className="inline-block h-1.5 w-1.5 rounded-full bg-brand-primary" />
                        )}
                      </div>
                    </div>

                    {/* Mark as read tick button */}
                    {!isRead && (
                      <button
                        type="button"
                        onClick={(e) => handleMarkAsRead(notif.id, e)}
                        className="opacity-0 group-hover:opacity-100 transition p-1 text-[#94A3B8] hover:text-brand-primary"
                        title="Mark as read"
                        aria-label="Mark as read"
                      >
                        <Check size={14} />
                      </button>
                    )}
                  </div>
                )
              })
            )}
          </div>

          {/* Footer note */}
          <div className="px-4 py-2 text-center border-t border-[#E2E8F0] dark:border-[#2A3348]/60 bg-[#F8FAFC] dark:bg-[#0E1526]/50">
            <p className="text-[10px] text-[#94A3B8] dark:text-slate-500">
              Taskly Live Broadcast & System Alerts
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
