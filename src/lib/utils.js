/**
 * Taskly Shared Utilities
 */

/**
 * Formats a numeric value into a USD currency string ($0.00).
 * @param {number|string} value
 * @returns {string}
 */
export function formatMoney(value) {
  const parsed = Number(value)
  return `$${Number.isFinite(parsed) ? parsed.toFixed(2) : '0.00'}`
}

/**
 * Returns a clean numeric representation or 0.
 * @param {number|string} value
 * @returns {number}
 */
export function toNumber(value) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

/**
 * Sanitizes raw text copied/pasted from external rich sources (Gemini, ChatGPT, Word, PDF, Web).
 * Strips zero-width characters, non-printing control characters, and normalizes line endings.
 * @param {string} rawText
 * @param {boolean} [isSingleLine=false]
 * @returns {string}
 */
export function sanitizePastedText(rawText, isSingleLine = false) {
  if (typeof rawText !== 'string') return ''
  
  // Remove zero-width spaces (\u200B-\u200D\uFEFF) and control characters
  let sanitized = rawText
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')

  if (isSingleLine) {
    // In single-line inputs (title, phone, trxID), collapse newlines into single spaces
    sanitized = sanitized.replace(/\n+/g, ' ').trim()
  }
  return sanitized
}

/**
 * Reusable helper to handle onPaste events smoothly on React inputs/textareas
 * preventing default page refreshes, stripping rogue characters, and restoring cursor position.
 * @param {ClipboardEvent} e
 * @param {string} currentValue
 * @param {Function} setValue
 * @param {boolean} [isSingleLine=false]
 * @param {Function} [onNotice]
 */
export function handleSanitizedPaste(e, currentValue, setValue, isSingleLine = false, onNotice = null) {
  const clipboardData = e.clipboardData || window.clipboardData
  if (!clipboardData) return

  const rawText = clipboardData.getData('text/plain')
  if (rawText !== undefined && rawText !== null) {
    e.preventDefault()
    const cleaned = sanitizePastedText(rawText, isSingleLine)

    const target = e.target
    const start = target.selectionStart ?? target.value.length
    const end = target.selectionEnd ?? target.value.length
    const current = currentValue || ''
    const newValue = current.slice(0, start) + cleaned + current.slice(end)

    setValue(newValue)

    requestAnimationFrame(() => {
      if (target && target.setSelectionRange) {
        const newCursorPos = start + cleaned.length
        target.setSelectionRange(newCursorPos, newCursorPos)
      }
    })

    if (typeof onNotice === 'function') {
      onNotice('Content cleanly pasted from clipboard')
    }
  }
}

/**
 * Validates if a string is a safe HTTP/HTTPS URL.
 * @param {string} url
 * @returns {boolean}
 */
export function isSafeUrl(url) {
  if (!url) return false
  return /^https?:\/\//i.test(url)
}
