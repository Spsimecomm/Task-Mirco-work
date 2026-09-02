import React from 'react'
import { Inbox, AlertCircle, RefreshCw } from 'lucide-react'

const statusStyles = {
  pending: 'bg-[#FEF3C7] text-[#92400E] border-[#FDE68A] dark:bg-[#451A03] dark:text-[#FBBF24] dark:border-[#78350F]',
  approved: 'bg-[#DCFCE7] text-[#166534] border-[#BBF7D0] dark:bg-[#064E3B] dark:text-[#34D399] dark:border-[#047857]',
  rejected: 'bg-[#FFE4E6] text-[#9F1239] border-[#FECDD3] dark:bg-[#4C0519] dark:text-[#FB7185] dark:border-[#9F1239]',
  completed: 'bg-[#DCFCE7] text-[#166534] border-[#BBF7D0] dark:bg-[#064E3B] dark:text-[#34D399] dark:border-[#047857]',
  open: 'bg-[#EEF2FF] text-[#3730A3] border-[#C7D2FE] dark:bg-[#1E1B4B] dark:text-[#818CF8] dark:border-[#3730A3]',
  closed: 'bg-[#E2E8F0] text-[#334155] border-[#CBD5E1] dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700',
}

export function StatusBadge({ status }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-3 py-0.5 text-xs font-semibold border capitalize ${statusStyles[status] || 'bg-[#E2E8F0] text-[#334155] border-[#CBD5E1] dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'}`}>
      {status}
    </span>
  )
}

export function EmptyState({ title, subtitle, icon: Icon = Inbox, action }) {
  return (
    <div className="card flex flex-col items-center justify-center gap-2 px-6 py-16 text-center rounded-xl bg-white dark:bg-[#1E293B] border border-[#CBD5E1] dark:border-white/10">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#F1F5F9] dark:bg-slate-900 border border-[#CBD5E1] dark:border-white/10 text-slate-500 dark:text-slate-400 mb-2">
        <Icon size={22} />
      </div>
      <p className="text-[#1E293B] dark:text-[#F1F5F9] font-bold text-base">{title}</p>
      {subtitle && <p className="text-sm font-normal text-[#64748B] dark:text-slate-400 max-w-sm">{subtitle}</p>}
      {action}
    </div>
  )
}

export function ErrorBanner({ message, onRetry }) {
  if (!message) return null
  return (
    <div className="rounded-xl border border-[#FECDD3] dark:border-rose-900/40 bg-[#FFE4E6] dark:bg-rose-950/40 px-4 py-3 text-xs sm:text-sm text-[#9F1239] dark:text-rose-300 font-medium flex items-center justify-between gap-3 shadow-xs">
      <div className="flex items-center gap-2">
        <AlertCircle size={16} className="shrink-0 text-rose-600 dark:text-rose-400" />
        <span className="leading-snug">{message}</span>
      </div>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold bg-rose-200/80 dark:bg-rose-900/60 text-[#9F1239] dark:text-rose-200 hover:bg-rose-300 dark:hover:bg-rose-800 transition cursor-pointer"
        >
          <RefreshCw size={12} />
          <span>Retry</span>
        </button>
      )}
    </div>
  )
}

export function renderTextWithLinks(text) {
  if (!text) return null

  const urlRegex = /(https?:\/\/[^\s<]+|(?:www\.|t\.me\/)[^\s<]+)/gi
  const parts = text.split(urlRegex)

  return parts.map((part, i) => {
    if (!part) return null
    if (part.match(urlRegex)) {
      let url = part
      let trailing = ''
      const trailMatch = url.match(/[.,;:!?)]+$/)
      if (trailMatch) {
        trailing = trailMatch[0]
        url = url.slice(0, -trailing.length)
      }

      const href = url.startsWith('http://') || url.startsWith('https://')
        ? url
        : `https://${url}`

      return (
        <React.Fragment key={i}>
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#2563EB] dark:text-[#60A5FA] underline hover:opacity-80 break-all font-medium"
            onClick={(e) => e.stopPropagation()}
          >
            {url}
          </a>
          {trailing}
        </React.Fragment>
      )
    }
    return part
  })
}

export function FormattedTaskText({ text, className = '' }) {
  if (!text) return null

  const lines = text.split('\n')

  return (
    <div className={`space-y-2 text-sm leading-relaxed ${className}`}>
      {lines.map((rawLine, idx) => {
        const trimmed = rawLine.trim()
        if (!trimmed) {
          return <div key={idx} className="h-1.5" />
        }

        // Clean redundant line emojis (keeping text clean so only main section heading has the primary icon)
        const cleanLine = trimmed.replace(/^[🔹🔸👉🎯📌🚀⭐✨➡️⚡📝💡✔️•\-*]+\s*/, '')

        // Detect section headings like:
        // "ধাপ ১:", "Step 1:", "রিওয়ার্ড:", "গুরুত্বপূর্ণ:", "নোট:", "শর্তাবলী:", "নিয়মাবলী:", "প্রমাণ:", "Note:", "Rules:", "Important:"
        const headingRegex = /^(\*\*[^*]+:\*\*|(?:\d+\.\s*)?(?:ধাপ\s*\d+|Step\s*\d+|রিওয়ার্ড|রিওয়ার্ড|Reward|বাজেট|Budget|গুরুত্বপূর্ণ|Important|নোট|Note|সতর্কতা|Warning|শর্তাবলী|শর্ত|Rules|Terms|নিয়মাবলী|নিয়ম|প্রমাণ|Proof|প্রমাণের\s*নির্দেশাবলী|লিঙ্ক|Link|URL|বিবরণ|Description)[\s:]*[:\-–])\s*(.*)$/i

        const match = cleanLine.match(headingRegex)

        if (match) {
          let heading = match[1].replace(/\*\*/g, '').trim()
          if (!heading.endsWith(':') && !heading.endsWith('-') && !heading.endsWith('–')) {
            heading = heading + ':'
          }
          const body = match[2].trim()

          return (
            <p key={idx} className="text-slate-600 dark:text-slate-300 font-normal">
              <strong className="font-semibold text-slate-900 dark:text-[#F1F5F9] mr-1.5">
                {heading}
              </strong>
              <span>{renderTextWithLinks(body)}</span>
            </p>
          )
        }

        // Detect Markdown bold prefix like **Bold:** or **Heading**
        const boldPrefixMatch = cleanLine.match(/^(\*\*[^*]+\*\*[:\-]?)\s*(.*)$/)
        if (boldPrefixMatch) {
          const heading = boldPrefixMatch[1].replace(/\*\*/g, '').trim()
          const body = boldPrefixMatch[2].trim()
          return (
            <p key={idx} className="text-slate-600 dark:text-slate-300 font-normal">
              <strong className="font-semibold text-slate-900 dark:text-[#F1F5F9] mr-1.5">
                {heading}
              </strong>
              <span>{renderTextWithLinks(body)}</span>
            </p>
          )
        }

        return (
          <p key={idx} className="text-slate-600 dark:text-slate-300 font-normal">
            {renderTextWithLinks(cleanLine)}
          </p>
        )
      })}
    </div>
  )
}

export function isSafeUrl(url) {
  if (!url) return false
  return /^(https?:\/\/|www\.|t\.me\/)/i.test(url)
}
