import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  Bell, 
  Check, 
  CheckCheck, 
  Inbox, 
  FileCheck, 
  CheckCircle2, 
  AlertCircle, 
  DollarSign, 
  ArrowUpRight,
  Sparkles,
  X
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'

function formatTimeAgo(isoString) {
  if (!isoString) return 'Just now'
  const date = new Date(isoString)
  const now = new Date()
  const diffSec = Math.floor((now - date) / 1000)

  if (diffSec < 60) return 'Just now'
  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr}h ago`
  const diffDays = Math.floor(diffHr / 24)
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function getNotificationIcon(type) {
  switch (type) {
    case 'submission':
      return <FileCheck size={16} className="text-signal-indigo" />
    case 'approval':
      return <CheckCircle2 size={16} className="text-mint-400" />
    case 'rejection':
      return <AlertCircle size={16} className="text-signal-rose" />
    case 'deposit':
    case 'withdrawal':
      return <DollarSign size={16} className="text-signal-amber" />
    default:
      return <Sparkles size={16} className="text-mint-400" />
  }
}

export function NotificationBell() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const dropdownRef = useRef(null)

  // Fetch notifications
  const fetchNotifications = async () => {
    if (!user) return
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20)

      if (!error && data) {
        setNotifications(data)
        const unread = data.filter((n) => !n.is_read).length
        setUnreadCount(unread)
      }
    } catch (err) {
      console.error('Error fetching notifications:', err)
    }
  }

  useEffect(() => {
    fetchNotifications()

    if (!user) return

    // Supabase Real-time Subscription for instant alerts
    const channel = supabase
      .channel(`user-notifications-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newNotif = payload.new
            if (newNotif.user_id === user.id) {
              setNotifications((prev) => [newNotif, ...prev.filter((n) => n.id !== newNotif.id)])
              setUnreadCount((prev) => prev + (newNotif.is_read ? 0 : 1))
            }
          } else if (payload.eventType === 'UPDATE') {
            const updated = payload.new
            if (updated.user_id === user.id) {
              setNotifications((prev) => {
                const next = prev.map((n) => (n.id === updated.id ? updated : n))
                const unread = next.filter((n) => !n.is_read).length
                setUnreadCount(unread)
                return next
              })
            }
          } else if (payload.eventType === 'DELETE') {
            const deleted = payload.old
            setNotifications((prev) => {
              const next = prev.filter((n) => n.id !== deleted.id)
              const unread = next.filter((n) => !n.is_read).length
              setUnreadCount(unread)
              return next
            })
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user?.id])

  // Handle outside click to close dropdown
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpen(false)
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [open])

  // Mark all notifications as read
  const handleMarkAllRead = async () => {
    if (!user || unreadCount === 0) return
    setLoading(true)
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false)

      if (!error) {
        setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
        setUnreadCount(0)
      }
    } catch (err) {
      console.error('Error marking all as read:', err)
    } finally {
      setLoading(false)
    }
  }

  // Handle clicking a single notification
  const handleNotificationClick = async (notif) => {
    if (!notif.is_read) {
      try {
        await supabase
          .from('notifications')
          .update({ is_read: true })
          .eq('id', notif.id)

        setNotifications((prev) =>
          prev.map((n) => (n.id === notif.id ? { ...n, is_read: true } : n))
        )
        setUnreadCount((prev) => Math.max(0, prev - 1))
      } catch (err) {
        console.error('Error marking notification as read:', err)
      }
    }

    setOpen(false)

    if (notif.link) {
      navigate(notif.link)
    }
  }

  if (!user) return null

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        id="notification-bell-btn"
        type="button"
        onClick={() => setOpen(!open)}
        className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-base-700 bg-base-900 text-slate-300 transition-colors hover:border-base-600 hover:text-white focus:outline-none"
        aria-label="Notifications"
      >
        <Bell size={17} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-signal-rose px-1 text-[10px] font-bold text-white shadow-sm ring-2 ring-base-950 animate-pulse">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {open && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-xl border border-base-700 bg-base-900/95 p-0 shadow-2xl backdrop-blur-md z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-base-800 px-4 py-3 bg-base-950/40">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-white">Notifications</span>
              {unreadCount > 0 && (
                <span className="rounded-full bg-mint-500/10 px-2 py-0.5 text-xs font-medium text-mint-400">
                  {unreadCount} new
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                disabled={loading}
                className="flex items-center gap-1 text-xs text-slate-400 hover:text-mint-400 transition-colors"
              >
                <CheckCheck size={14} />
                Mark all read
              </button>
            )}
          </div>

          {/* Notification List */}
          <div className="max-h-[380px] overflow-y-auto divide-y divide-base-800/60">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-base-800 text-slate-500 mb-2">
                  <Inbox size={20} />
                </div>
                <p className="text-sm font-medium text-slate-300">No notifications yet</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  When tasks are submitted or updated, alerts will appear here.
                </p>
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => handleNotificationClick(notif)}
                  className={`group flex items-start gap-3 p-3.5 transition-colors cursor-pointer text-left ${
                    notif.is_read
                      ? 'bg-transparent hover:bg-base-800/40 opacity-75'
                      : 'bg-mint-500/[0.03] hover:bg-mint-500/[0.07]'
                  }`}
                >
                  {/* Type Icon */}
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-base-800 border border-base-700/60 mt-0.5">
                    {getNotificationIcon(notif.type)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <p className={`text-xs font-semibold truncate ${notif.is_read ? 'text-slate-300' : 'text-white'}`}>
                        {notif.title}
                      </p>
                      <span className="text-[10px] text-slate-500 shrink-0">
                        {formatTimeAgo(notif.created_at)}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                      {notif.message}
                    </p>
                  </div>

                  {/* Unread indicator dot */}
                  {!notif.is_read && (
                    <span className="h-2 w-2 rounded-full bg-mint-400 shrink-0 mt-1.5" />
                  )}
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="border-t border-base-800/80 bg-base-950/40 p-2 text-center">
              <span className="text-[11px] text-slate-500">
                Real-time task and proof alerts
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
