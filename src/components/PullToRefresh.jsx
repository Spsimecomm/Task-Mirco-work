import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Check, ArrowDown } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

/**
 * Facebook-style Pull-to-Refresh Component
 * Features:
 * - Authentic circular floating badge with Facebook-style spinner
 * - Natural rubber-band damping physics on touch/drag
 * - Dynamic SVG progress arc that fills and rotates as user pulls
 * - Haptic feedback on reaching threshold (via navigator.vibrate)
 * - Seamless page content elastic bounce
 * - Smooth exit transition and success confirmation
 * - Cross-device support (touch + desktop mouse drag + programmatic triggers)
 */
export default function PullToRefresh({ children, onRefresh, topOffset = '4.5rem' }) {
  const { refreshProfile } = useAuth()
  const [pullDistance, setPullDistance] = useState(0)
  const [isPulling, setIsPulling] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

  const startYRef = useRef(0)
  const startXRef = useRef(0)
  const currentYRef = useRef(0)
  const isMouseDownRef = useRef(false)
  const hasHapticRef = useRef(false)
  const containerRef = useRef(null)

  // Configuration constants
  const PULL_THRESHOLD = 70 // pixels needed to trigger refresh
  const MAX_PULL = 110 // maximum visual pull distance
  const DAMPING = 0.42 // elastic resistance factor

  // Core refresh trigger function
  const triggerRefresh = useCallback(async () => {
    if (isRefreshing) return
    setIsRefreshing(true)
    setIsPulling(false)
    setPullDistance(56) // Snap to resting spinner height

    try {
      // 1. Refresh profile/wallet data via AuthContext
      if (refreshProfile) {
        try {
          await refreshProfile()
        } catch (err) {
          console.warn('Profile refresh notice:', err)
        }
      }

      // 2. Execute custom callback prop if provided
      if (onRefresh) {
        await onRefresh()
      }

      // 3. Dispatch global event so all active views and components re-fetch data
      window.dispatchEvent(new CustomEvent('app:refresh', { detail: { timestamp: Date.now() } }))

      // 4. Ensure realistic minimum animation time for Facebook spinner satisfaction (800ms)
      await new Promise((resolve) => setTimeout(resolve, 800))

      // 5. Briefly show subtle success checkmark
      setIsSuccess(true)
      await new Promise((resolve) => setTimeout(resolve, 350))
    } catch (error) {
      console.error('Pull-to-refresh error:', error)
    } finally {
      setIsSuccess(false)
      setIsRefreshing(false)
      setPullDistance(0)
      hasHapticRef.current = false
    }
  }, [isRefreshing, refreshProfile, onRefresh])

  // Allow triggering refresh from external components or buttons
  useEffect(() => {
    const handleTriggerEvent = () => {
      triggerRefresh()
    }
    window.addEventListener('trigger:pulltorefresh', handleTriggerEvent)
    return () => {
      window.removeEventListener('trigger:pulltorefresh', handleTriggerEvent)
    }
  }, [triggerRefresh])

  // ================= GESTURE & DRAG HANDLING =================
  useEffect(() => {
    const isAtTop = () => {
      const scrollY = window.scrollY || document.documentElement.scrollTop || 0
      return scrollY <= 1
    }

    // Touch events
    const handleTouchStart = (e) => {
      if (isRefreshing) return
      if (!isAtTop()) return

      const touch = e.touches[0]
      startYRef.current = touch.clientY
      startXRef.current = touch.clientX
      currentYRef.current = touch.clientY
      hasHapticRef.current = false
    }

    const handleTouchMove = (e) => {
      if (isRefreshing) return
      if (!startYRef.current) return

      const touch = e.touches[0]
      const currentY = touch.clientY
      const currentX = touch.clientX
      const deltaY = currentY - startYRef.current
      const deltaX = currentX - startXRef.current

      // Check if user is pulling downwards from top
      if (deltaY > 0 && Math.abs(deltaY) > Math.abs(deltaX) * 1.2 && isAtTop()) {
        if (e.cancelable) {
          e.preventDefault()
        }

        setIsPulling(true)
        const distance = Math.min(MAX_PULL, deltaY * DAMPING)
        setPullDistance(distance)

        // Haptic feedback trigger when threshold is reached
        if (distance >= PULL_THRESHOLD && !hasHapticRef.current) {
          hasHapticRef.current = true
          if (typeof window !== 'undefined' && window.navigator?.vibrate) {
            try {
              window.navigator.vibrate(12)
            } catch (err) {}
          }
        } else if (distance < PULL_THRESHOLD) {
          hasHapticRef.current = false
        }
      } else if (!isPulling) {
        setPullDistance(0)
      }
    }

    const handleTouchEnd = () => {
      if (isRefreshing) return

      if (pullDistance >= PULL_THRESHOLD) {
        triggerRefresh()
      } else {
        setIsPulling(false)
        setPullDistance(0)
        hasHapticRef.current = false
      }
      startYRef.current = 0
    }

    // Mouse drag support for desktop testing
    const handleMouseDown = (e) => {
      if (isRefreshing) return
      if (!isAtTop()) return
      if (e.button !== 0) return
      if (e.target.closest('button, a, input, textarea, select, [role="button"], canvas, svg')) return

      isMouseDownRef.current = true
      startYRef.current = e.clientY
      startXRef.current = e.clientX
    }

    const handleMouseMove = (e) => {
      if (!isMouseDownRef.current || isRefreshing) return
      const deltaY = e.clientY - startYRef.current
      const deltaX = e.clientX - startXRef.current

      if (deltaY > 5 && Math.abs(deltaY) > Math.abs(deltaX) * 1.2 && isAtTop()) {
        setIsPulling(true)
        const distance = Math.min(MAX_PULL, deltaY * DAMPING)
        setPullDistance(distance)

        if (distance >= PULL_THRESHOLD && !hasHapticRef.current) {
          hasHapticRef.current = true
          if (typeof window !== 'undefined' && window.navigator?.vibrate) {
            try {
              window.navigator.vibrate(10)
            } catch (err) {}
          }
        } else if (distance < PULL_THRESHOLD) {
          hasHapticRef.current = false
        }
      }
    }

    const handleMouseUp = () => {
      if (!isMouseDownRef.current) return
      isMouseDownRef.current = false

      if (pullDistance >= PULL_THRESHOLD && !isRefreshing) {
        triggerRefresh()
      } else {
        setIsPulling(false)
        setPullDistance(0)
        hasHapticRef.current = false
      }
      startYRef.current = 0
    }

    const touchOptions = { passive: false }
    window.addEventListener('touchstart', handleTouchStart, { passive: true })
    window.addEventListener('touchmove', handleTouchMove, touchOptions)
    window.addEventListener('touchend', handleTouchEnd, { passive: true })
    window.addEventListener('touchcancel', handleTouchEnd, { passive: true })

    window.addEventListener('mousedown', handleMouseDown)
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)

    return () => {
      window.removeEventListener('touchstart', handleTouchStart)
      window.removeEventListener('touchmove', handleTouchMove)
      window.removeEventListener('touchend', handleTouchEnd)
      window.removeEventListener('touchcancel', handleTouchEnd)

      window.removeEventListener('mousedown', handleMouseDown)
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isRefreshing, pullDistance, triggerRefresh])

  // Calculate visual properties
  const pullProgress = Math.min(1, Math.max(0, pullDistance / PULL_THRESHOLD))
  const isReadyToRelease = pullDistance >= PULL_THRESHOLD

  // Dynamic transforms for indicator
  const indicatorVisible = isPulling || isRefreshing || isSuccess
  const indicatorTranslateY = isRefreshing ? 24 : pullDistance > 0 ? Math.min(pullDistance * 0.95, 68) : -60
  const indicatorScale = isSuccess ? 1.05 : isRefreshing ? 1 : Math.min(1, Math.max(0.6, pullProgress))
  const indicatorOpacity = isRefreshing ? 1 : isSuccess ? 1 : Math.min(1, pullProgress * 1.3)

  // Subtle content translation (rubber-band elastic feel)
  const contentTranslateY = isRefreshing ? 44 : isPulling ? pullDistance * 0.35 : 0

  // SVG circle calculations for pull progress arc
  const radius = 10
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference * (1 - pullProgress * 0.85)

  return (
    <div ref={containerRef} className="relative w-full">
      {/* ================= FACEBOOK-STYLE FLOATING REFRESH BADGE ================= */}
      <div
        className="fixed left-1/2 -translate-x-1/2 z-50 pointer-events-none transition-transform select-none"
        style={{
          top: topOffset, // Positions right below top navigation bar
          transform: `translate(-50%, ${indicatorTranslateY}px) scale(${indicatorScale})`,
          opacity: indicatorOpacity,
          transition: isPulling ? 'none' : 'transform 0.28s cubic-bezier(0.175, 0.885, 0.32, 1.275), opacity 0.2s ease',
        }}
        aria-hidden={!indicatorVisible}
      >
        <div
          className={`relative flex items-center justify-center w-11 h-11 rounded-full bg-white dark:bg-[#1E293B] border border-slate-200/90 dark:border-[#2A3348] shadow-[0_8px_24px_rgba(0,0,0,0.14)] dark:shadow-[0_8px_28px_rgba(0,0,0,0.45)] transition-colors ${
            isReadyToRelease && !isRefreshing && !isSuccess
              ? 'ring-2 ring-brand-primary/40'
              : ''
          }`}
        >
          {isSuccess ? (
            /* Refresh Completed Checkmark */
            <div className="flex items-center justify-center text-emerald-500 animate-in zoom-in-75 duration-200">
              <Check size={20} strokeWidth={3} />
            </div>
          ) : isRefreshing ? (
            /* Facebook Signature Animated Spinner */
            <div className="relative flex items-center justify-center w-6 h-6">
              <svg
                className="w-6 h-6 animate-spin text-brand-primary dark:text-emerald-400"
                viewBox="0 0 24 24"
                fill="none"
              >
                <circle
                  className="opacity-20 text-slate-400 dark:text-slate-600"
                  cx="12"
                  cy="12"
                  r="9"
                  stroke="currentColor"
                  strokeWidth="2.75"
                />
                <path
                  className="opacity-95"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
            </div>
          ) : (
            /* Pulling Progress Ring & Directional Arrow */
            <div className="relative flex items-center justify-center w-6 h-6">
              <svg className="w-6 h-6 -rotate-90" viewBox="0 0 24 24">
                <circle
                  cx="12"
                  cy="12"
                  r={radius}
                  stroke="currentColor"
                  strokeWidth="2.5"
                  className="text-slate-200 dark:text-slate-700/80"
                  fill="none"
                />
                <circle
                  cx="12"
                  cy="12"
                  r={radius}
                  stroke="currentColor"
                  strokeWidth="2.75"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  className="text-brand-primary dark:text-emerald-400 transition-all"
                  fill="none"
                />
              </svg>
              {/* Arrow inside ring that flips when reaching pull threshold */}
              <div
                className="absolute inset-0 flex items-center justify-center text-slate-600 dark:text-slate-300 transition-transform duration-200"
                style={{
                  transform: isReadyToRelease ? 'rotate(180deg)' : `rotate(${pullProgress * 180}deg)`,
                }}
              >
                <ArrowDown size={13} strokeWidth={2.75} />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ================= PAGE CONTENT WITH ELASTIC RUBBER-BAND BOUNCE ================= */}
      <div
        className="w-full"
        style={{
          transform: `translateY(${contentTranslateY}px)`,
          transition: isPulling ? 'none' : 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
        }}
      >
        {children}
      </div>
    </div>
  )
}
