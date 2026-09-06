import React from 'react'
import { Inbox, AlertCircle, RefreshCw } from 'lucide-react'

const statusStyles = {
  pending: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30',
  approved: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30',
  rejected: 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/30',
  completed: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30',
  open: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30',
  closed: 'bg-slate-500/10 text-slate-700 dark:text-slate-400 border-slate-500/30',
}

export function StatusBadge({ status }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-0.5 text-xs font-semibold border capitalize tracking-wide ${statusStyles[status] || 'bg-slate-500/10 text-slate-700 dark:text-slate-400 border-slate-500/30'}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-75 shrink-0" />
      <span>{status}</span>
    </span>
  )
}

export function EmptyState({ title, subtitle, icon: Icon = Inbox, action }) {
  const isBengaliTitle = hasBengaliText(title)
  const isBengaliSubtitle = hasBengaliText(subtitle)
  return (
    <div className="card flex flex-col items-center justify-center gap-2 px-6 py-14 text-center rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#2A3348] shadow-xs">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200/80 dark:border-[#2A3348] text-slate-500 dark:text-slate-400 mb-2">
        <Icon size={22} />
      </div>
      <p
        lang={isBengaliTitle ? 'bn' : 'en'}
        className={`text-slate-900 dark:text-[#F1F5F9] font-bold text-base ${
          isBengaliTitle ? 'font-bengali leading-[1.6]' : 'font-sans'
        }`}
        style={isBengaliTitle ? { fontFamily: "'Hind Siliguri', 'Inter', sans-serif" } : undefined}
      >
        {title}
      </p>
      {subtitle && (
        <p
          lang={isBengaliSubtitle ? 'bn' : 'en'}
          className={`text-xs sm:text-sm font-normal text-slate-500 dark:text-slate-400 max-w-sm ${
            isBengaliSubtitle ? 'font-bengali leading-[1.65]' : 'font-sans'
          }`}
          style={isBengaliSubtitle ? { fontFamily: "'Hind Siliguri', 'Inter', sans-serif" } : undefined}
        >
          {subtitle}
        </p>
      )}
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}

export function ErrorBanner({ message, onRetry }) {
  if (!message) return null
  return (
    <div className="rounded-2xl border border-rose-500/30 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-950/40 px-4 py-3 text-xs sm:text-sm text-rose-700 dark:text-rose-300 font-medium flex items-center justify-between gap-3 shadow-xs">
      <div className="flex items-center gap-2.5">
        <AlertCircle size={17} className="shrink-0 text-rose-600 dark:text-rose-400" />
        <span className="leading-[1.6]">{message}</span>
      </div>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-rose-200/80 dark:bg-rose-900/60 text-rose-800 dark:text-rose-200 hover:bg-rose-300 dark:hover:bg-rose-800 transition cursor-pointer"
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

export function hasBengaliText(str) {
  if (!str || typeof str !== 'string') return false
  return /[\u0980-\u09FF]/.test(str)
}

export function FormattedTaskText({ text, className = '' }) {
  if (!text) return null

  const lines = text.split('\n')
  const isOverallBengali = hasBengaliText(text)

  return (
    <div
      lang={isOverallBengali ? 'bn' : 'en'}
      className={`space-y-2.5 font-normal text-xs sm:text-sm leading-[1.65] text-slate-600 dark:text-slate-400 ${
        isOverallBengali ? 'font-bengali' : 'font-sans'
      } ${className}`}
      style={isOverallBengali ? { fontFamily: "'Hind Siliguri', 'Noto Sans Bengali', 'Inter', sans-serif" } : undefined}
    >
      {lines.map((rawLine, idx) => {
        const trimmed = rawLine.trim()
        if (!trimmed) {
          return <div key={idx} className="h-1.5" />
        }

        const isLineBengali = hasBengaliText(trimmed)

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
          const isHeadingBengali = hasBengaliText(heading)

          return (
            <p
              key={idx}
              lang={isLineBengali ? 'bn' : 'en'}
              className={`${
                isLineBengali ? 'font-bengali' : 'font-sans'
              } font-normal text-xs sm:text-sm leading-[1.65] text-slate-600 dark:text-slate-400`}
              style={isLineBengali ? { fontFamily: "'Hind Siliguri', 'Noto Sans Bengali', 'Inter', sans-serif" } : undefined}
            >
              <strong
                className={`${
                  isHeadingBengali ? 'font-bengali' : 'font-sans'
                } font-semibold text-slate-900 dark:text-slate-100 mr-1.5`}
                style={isHeadingBengali ? { fontFamily: "'Hind Siliguri', 'Noto Sans Bengali', 'Inter', sans-serif" } : undefined}
              >
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
          const isHeadingBengali = hasBengaliText(heading)

          return (
            <p
              key={idx}
              lang={isLineBengali ? 'bn' : 'en'}
              className={`${
                isLineBengali ? 'font-bengali' : 'font-sans'
              } font-normal text-xs sm:text-sm leading-[1.65] text-slate-600 dark:text-slate-400`}
              style={isLineBengali ? { fontFamily: "'Hind Siliguri', 'Noto Sans Bengali', 'Inter', sans-serif" } : undefined}
            >
              <strong
                className={`${
                  isHeadingBengali ? 'font-bengali' : 'font-sans'
                } font-semibold text-slate-900 dark:text-slate-100 mr-1.5`}
                style={isHeadingBengali ? { fontFamily: "'Hind Siliguri', 'Noto Sans Bengali', 'Inter', sans-serif" } : undefined}
              >
                {heading}
              </strong>
              <span>{renderTextWithLinks(body)}</span>
            </p>
          )
        }

        return (
          <p
            key={idx}
            lang={isLineBengali ? 'bn' : 'en'}
            className={`${
              isLineBengali ? 'font-bengali' : 'font-sans'
            } font-normal text-xs sm:text-sm leading-[1.65] text-slate-600 dark:text-slate-400`}
            style={isLineBengali ? { fontFamily: "'Hind Siliguri', 'Inter', sans-serif" } : undefined}
          >
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
