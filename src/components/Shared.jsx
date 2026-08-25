import React from 'react'
import { Inbox } from 'lucide-react'

const statusStyles = {
  pending: 'bg-signal-amber/10 text-signal-amber',
  approved: 'bg-mint-500/10 text-mint-400',
  rejected: 'bg-signal-rose/10 text-signal-rose',
  completed: 'bg-mint-500/10 text-mint-400',
  open: 'bg-signal-indigo/10 text-signal-indigo',
  closed: 'bg-base-700 text-slate-400',
}

export function StatusBadge({ status }) {
  return (
    <span className={`badge capitalize ${statusStyles[status] || 'bg-base-700 text-slate-300'}`}>
      {status}
    </span>
  )
}

export function EmptyState({ title, subtitle, icon: Icon = Inbox, action }) {
  return (
    <div className="card flex flex-col items-center justify-center gap-2 px-6 py-16 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-base-800 text-slate-500 mb-2">
        <Icon size={22} />
      </div>
      <p className="text-white font-medium">{title}</p>
      {subtitle && <p className="text-sm text-slate-500 max-w-sm">{subtitle}</p>}
      {action}
    </div>
  )
}

export function ErrorBanner({ message }) {
  if (!message) return null
  return (
    <div className="rounded-lg border border-signal-rose/30 bg-signal-rose/10 px-4 py-3 text-sm text-signal-rose">
      {message}
    </div>
  )
}

export function isSafeUrl(url) {
  if (!url) return false
  return /^https?:\/\//i.test(url)
}
