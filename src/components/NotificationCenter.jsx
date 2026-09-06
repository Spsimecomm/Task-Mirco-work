import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Bell,
  Check,
  CheckCheck,
  Megaphone,
  Sparkles,
  DollarSign,
  AlertTriangle,
  Info,
  X,
  ChevronDown,
  ChevronUp,
  Loader2,
  ExternalLink,
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

// Default route to navigate to when a notification has no explicit action_url,
// determined by notification type and user role.
function getDefaultRoute(type, role) {
  switch (type) {
    case 'commission':
      return '/referrals'
    case 'reward':
      return role === 'worker' ? '/my-submissions' : '/review-submissions'
    case 'alert':
      return role === 'employer' ? '/deposit' : role === 'worker' ? '/withdraw' : '/dashboard'
    case 'announcement':
    case 'system':
    default:
      return role === 'admin' ? '/admin' : role === 'employer' ? '/employer' : '/worker'
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
  const navigate = useNavigate()
  const [isOpen, setIsOpen] = useState(false)
  const [activeFilter, setActiveFilter] = useState('all') // 'all' | 'unread'
  const [notifications, setNotifications] = useState([])
  const [readIds, setReadIds] = useState(new Set())
  const [expandedIds, setExpandedIds] = useState(new Set())
  const [loading, setLoading] = useState(true)
  const [markingAll, setMarkingAll] = useState(false)
  const dropdownRef = useRef(null)

  // Fetch notifications and read receipts
  const fetchNotifications = useCallback(async () => {
    if (!user || !supabase) return

    try {
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

    const handleRefresh = () => {
      fetchNotifications()
    }
    window.addEventListener('app:refresh', handleRefresh)

    return () => {
      window.removeEventListener('app:refresh', handleRefresh)
      supabase.removeChannel(channel)
    }
  }, [fetchNotifications, user])

  // Close dropdown on outside click or Escape key
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }
    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('touchstart', handleClickOutside)
      document.addEventListener('keydown', handleKeyDown)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('touchstart', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  const toggleExpand = (notifId, e) => {
    if (e) e.stopPropagation()
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(notifId)) {
        next.delete(notifId)
      } else {
        next.add(notifId)
      }
      return next
    })
  }

  const handleMarkAsRead = async (notifId, e) => {
    if (e) e.stopPropagation()
    if (!user || readIds.has(notifId)) return

    setReadIds((prev) => new Set([...prev, notifId]))

    try {
      await supabase.rpc('mark_notification_as_read', { p_notification_id: notifId })
    } catch (err) {
      console.error('Failed to mark notification as read:', err)
      fetchNotifications()
    }
  }

  const handleMarkAllAsRead = async () => {
    if (!user || unreadCount === 0) return
    setMarkingAll(true)

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

  // Navigate to the notification's target page, falling back to a type/role default
  const handleNotificationClick = (notif) => {
    handleMarkAsRead(notif.id)
    const target = notif.action_url || getDefaultRoute(notif.type, role || profile?.role)
    if (target) {
      setIsOpen(false)
      navigate(target)
    } else if ((notif.message || '').length > 110) {
      toggleExpand(notif.id)
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
        className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 dark:border-[#2A3348] bg-slate-50 dark:bg-[#111827] text-slate-800 dark:text-slate-200 hover:border-slate-400 dark:hover:border-slate-500 transition shadow-xs cursor-pointer"
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

      {/* Notifications Dropdown / Modal Panel */}
      {isOpen && (
        <>
          {/* Backdrop on mobile screens — z-[60] to escape the header's z-40 stacking context */}
          <div
            className="fixed inset-0 z-[60] bg-slate-950/50 dark:bg-black/70 backdrop-blur-xs sm:hidden transition-opacity"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />

          {/* Panel Container: Mobile Top Dropdown (below header) & Desktop Dropdown */}
          <div
            id="notification-dropdown-panel"
            className="fixed top-16 inset-x-0 z-[70] w-full sm:absolute sm:inset-x-auto sm:bottom-auto sm:right-0 sm:top-full sm:mt-2 sm:w-[26rem] sm:max-w-md rounded-b-3xl sm:rounded-2xl border-b sm:border border-t-0 sm:border-t border-slate-200 dark:border-[#2A3348] bg-white dark:bg-[#111827] shadow-2xl overflow-hidden flex flex-col max-h-[calc(100vh-4rem)] sm:max-h-[34rem] animate-in fade-in slide-in-from-top-4 sm:slide-in-from-top-0 sm:zoom-in-95 duration-150"
          >
            {/* Mobile Sheet Drag Indicator Bar */}
            <div className="pt-2.5 pb-1 flex justify-center sm:hidden bg-slate-50/90 dark:bg-[#0E1526]/90 shrink-0">
              <div className="h-1 w-10 rounded-full bg-slate-300 dark:bg-slate-700" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-4 sm:px-5 py-3 border-b border-slate-200 dark:border-[#2A3348]/70 bg-slate-50/90 dark:bg-[#0E1526]/90 backdrop-blur-xs shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-sans font-bold text-xs sm:text-sm uppercase tracking-wider text-slate-900 dark:text-slate-100 truncate">
                  Notifications
                </span>
                {unreadCount > 0 ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-brand-primary/10 text-brand-primary border border-brand-primary/20 shrink-0">
                    {unreadCount} new
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 shrink-0">
                    All caught up
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={handleMarkAllAsRead}
                    disabled={markingAll}
                    className="inline-flex items-center gap-1 text-[11px] text-brand-primary font-bold hover:underline transition disabled:opacity-50 cursor-pointer"
                  >
                    {markingAll ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : (
                      <CheckCheck size={13} />
                    )}
                    <span className="hidden sm:inline">Mark all read</span>
                    <span className="sm:hidden">Read all</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition cursor-pointer"
                  aria-label="Close notification panel"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 px-3 sm:px-4 py-2 border-b border-slate-200/80 dark:border-[#2A3348]/40 bg-white dark:bg-[#111827] shrink-0">
              <button
                type="button"
                onClick={() => setActiveFilter('all')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  activeFilter === 'all'
                    ? 'bg-brand-primary text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                All ({notifications.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveFilter('unread')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  activeFilter === 'unread'
                    ? 'bg-brand-primary text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                Unread ({unreadCount})
              </button>
            </div>

            {/* Notification Items List */}
            <div className="flex-1 overflow-y-auto overscroll-contain divide-y divide-slate-100 dark:divide-[#2A3348]/50 min-h-0">
              {loading ? (
                <div className="py-12 text-center text-xs text-slate-500 dark:text-slate-400 flex items-center justify-center gap-2">
                  <Loader2 size={15} className="animate-spin text-brand-primary" />
                  <span>Loading notifications…</span>
                </div>
              ) : filteredNotifications.length === 0 ? (
                <div className="py-12 px-4 text-center">
                  <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 dark:bg-[#1F2937] text-slate-400 mb-2.5">
                    <Bell size={20} />
                  </div>
                  <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100">
                    {activeFilter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
                  </p>
                  <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs mx-auto">
                    Announcements, job alerts, and commission updates will appear here.
                  </p>
                </div>
              ) : (
                filteredNotifications.map((notif) => {
                  const isRead = readIds.has(notif.id)
                  const style = getNotificationIcon(notif.type)
                  const IconComponent = style.icon
                  const isBengali = /[\u0980-\u09FF]/.test((notif.title || '') + ' ' + (notif.message || ''))
                  const isExpanded = expandedIds.has(notif.id)
                  const isLongMessage = (notif.message || '').length > 110
                  const hasTarget = !!(notif.action_url || getDefaultRoute(notif.type, role || profile?.role))

                  return (
                    <div
                      key={notif.id}
                      lang={isBengali ? 'bn' : 'en'}
                      onClick={() => handleNotificationClick(notif)}
                      role={hasTarget ? 'button' : undefined}
                      tabIndex={hasTarget ? 0 : undefined}
                      onKeyDown={(e) => {
                        if (hasTarget && (e.key === 'Enter' || e.key === ' ')) {
                          e.preventDefault()
                          handleNotificationClick(notif)
                        }
                      }}
                      className={`group relative flex items-start gap-2.5 sm:gap-3 px-3.5 sm:px-4 py-3.5 sm:py-4 text-xs transition cursor-pointer ${
                        isBengali ? 'font-bengali' : ''
                      } ${
                        isRead
                          ? 'bg-white dark:bg-[#111827] hover:bg-slate-50/90 dark:hover:bg-slate-800/30'
                          : 'bg-emerald-500/[0.05] dark:bg-brand-primary/[0.08] hover:bg-emerald-500/[0.09] dark:hover:bg-brand-primary/[0.12] border-l-[3px] border-brand-primary'
                      }`}
                      style={isBengali ? { fontFamily: "'Hind Siliguri', 'Noto Sans Bengali', 'Inter', sans-serif" } : undefined}
                    >
                      {/* Icon Badge */}
                      <div className={`flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-xl ${style.bg} ${style.color} mt-0.5`}>
                        <IconComponent size={16} />
                      </div>

                      {/* Content Container */}
                      <div className="flex-1 min-w-0 overflow-hidden">
                        {/* Title row */}
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <p
                            className={`text-xs sm:text-sm font-bold leading-[1.5] break-words [overflow-wrap:anywhere] ${
                              isBengali ? 'font-bengali leading-[1.6]' : 'font-sans'
                            } ${
                              isRead
                                ? 'text-slate-800 dark:text-slate-200 font-semibold'
                                : 'text-slate-900 dark:text-white font-bold'
                            }`}
                          >
                            {notif.title}
                          </p>
                          <span className="text-[10px] sm:text-[11px] font-normal text-slate-400 dark:text-slate-500 shrink-0 whitespace-nowrap mt-0.5">
                            {timeAgo(notif.created_at)}
                          </span>
                        </div>

                        {/* Message body */}
                        <p
                          className={`font-normal text-xs sm:text-[13px] leading-[1.65] text-slate-600 dark:text-slate-300 break-words [overflow-wrap:anywhere] ${
                            isBengali ? 'font-bengali leading-[1.7]' : 'font-sans'
                          } ${
                            !isExpanded && isLongMessage ? 'line-clamp-2 sm:line-clamp-3' : ''
                          }`}
                        >
                          {notif.message}
                        </p>

                        {isLongMessage && (
                          <button
                            type="button"
                            onClick={(e) => toggleExpand(notif.id, e)}
                            className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-brand-primary hover:underline mt-1.5 focus:outline-none cursor-pointer"
                          >
                            <span>{isExpanded ? 'Show less' : 'Read more'}</span>
                            {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                          </button>
                        )}

                        {/* Footer tags */}
                        <div className="flex items-center flex-wrap gap-2 mt-2">
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                            {notif.type || 'announcement'}
                          </span>
                          {notif.target_role && notif.target_role !== 'all' && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-semibold bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                              {notif.target_role}s
                            </span>
                          )}
                          {hasTarget && (
                            <span className="inline-flex items-center gap-0.5 text-[9px] font-semibold text-brand-primary/70 dark:text-brand-primary/60">
                              <ExternalLink size={9} />
                              <span>Tap to open</span>
                            </span>
                          )}
                          {!isRead && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 dark:text-brand-primary">
                              <span className="h-1.5 w-1.5 rounded-full bg-brand-primary animate-pulse" />
                              <span>Unread</span>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Mark as read tick button */}
                      {!isRead && (
                        <button
                          type="button"
                          onClick={(e) => handleMarkAsRead(notif.id, e)}
                          className="shrink-0 p-1.5 rounded-lg text-slate-400 hover:text-brand-primary dark:hover:text-brand-primary hover:bg-slate-100 dark:hover:bg-slate-800 opacity-70 sm:opacity-0 group-hover:opacity-100 transition cursor-pointer"
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
            <div className="px-4 py-2.5 text-center border-t border-slate-200 dark:border-[#2A3348]/60 bg-slate-50/90 dark:bg-[#0E1526]/60 shrink-0">
              <p className="text-[10px] text-slate-400 dark:text-slate-500">
                Taskly Live Broadcast & System Alerts
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
