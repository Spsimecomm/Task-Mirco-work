import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Bell,
  Sun,
  Moon,
  Wallet,
  Menu,
  LogOut,
  ChevronDown,
  ShieldCheck,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'

function fmt(n) {
  return `$${Number(n ?? 0).toFixed(2)}`
}

export default function Topbar({ onOpenSidebar }) {
  const { profile, role, signOut, user } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()
  const [showNotifications, setShowNotifications] = useState(false)
  const [showUserDropdown, setShowUserDropdown] = useState(false)

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  const displayName = profile?.username || profile?.full_name || user?.email?.split('@')[0] || 'User'
  const displayRole = role === 'admin' ? 'Administrator' : role === 'employer' ? 'Employer' : 'Worker'

  const balance =
    role === 'employer'
      ? fmt(profile?.deposited)
      : role === 'worker'
      ? fmt(profile?.earnings)
      : null

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-[#E2E8F0] dark:border-[#2A3348] bg-white/95 dark:bg-[#0B1020]/95 px-4 sm:px-6 lg:px-8 backdrop-blur-md transition-colors">
      {/* Left section: Mobile menu trigger & Brand/Workspace indicator */}
      <div className="flex items-center gap-3">
        {/* Mobile menu trigger */}
        <button
          onClick={onOpenSidebar}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#CBD5E1] dark:border-[#2A3348] text-[#0F172A] dark:text-slate-200 hover:bg-[#F1F5F9] dark:hover:bg-[#111827] lg:hidden transition"
          aria-label="Open navigation menu"
        >
          <Menu size={18} />
        </button>

        {/* Workspace Context Tag */}
        <div className="hidden sm:flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-brand-primary animate-pulse" />
          <span className="text-xs font-bold text-[#0F172A] dark:text-slate-200 uppercase tracking-wider">
            {role === 'admin' ? 'Admin Portal' : role === 'employer' ? 'Employer Workspace' : 'Worker Workspace'}
          </span>
        </div>
      </div>

      {/* Right Section: Theme Toggle, Notifications, Balance Pill, User Profile */}
      <div className="flex items-center gap-2.5 sm:gap-3">
        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#E2E8F0] dark:border-[#2A3348] bg-[#F8FAFC] dark:bg-[#111827] text-[#0F172A] dark:text-slate-200 hover:border-slate-400 dark:hover:border-slate-500 transition shadow-xs"
          title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? (
            <Sun size={17} className="text-amber-400" />
          ) : (
            <Moon size={17} className="text-slate-800" />
          )}
        </button>

        {/* Notifications Bell */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-[#E2E8F0] dark:border-[#2A3348] bg-[#F8FAFC] dark:bg-[#111827] text-[#0F172A] dark:text-slate-200 hover:border-slate-400 dark:hover:border-slate-500 transition shadow-xs"
            aria-label="Notifications"
          >
            <Bell size={17} />
            <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-brand-primary ring-2 ring-white dark:ring-[#0B1020]" />
          </button>

          {/* Notifications Dropdown */}
          {showNotifications && (
            <div className="absolute right-0 mt-2 w-72 sm:w-80 rounded-2xl border border-[#E2E8F0] dark:border-[#2A3348] bg-white dark:bg-[#111827] p-3 shadow-xl z-50 animate-in fade-in">
              <div className="flex items-center justify-between pb-2 border-b border-[#E2E8F0] dark:border-[#2A3348]/60">
                <p className="font-bold text-xs uppercase tracking-wider text-[#0F172A] dark:text-[#F1F5F9]">
                  Notifications
                </p>
                <button
                  type="button"
                  onClick={() => setShowNotifications(false)}
                  className="text-[11px] text-brand-primary font-semibold hover:underline"
                >
                  Mark all read
                </button>
              </div>
              <div className="py-2 space-y-2 text-xs">
                <div className="p-2.5 rounded-xl bg-[#F8FAFC] dark:bg-[#1F2937]/50 border border-[#E2E8F0] dark:border-[#2A3348]/50">
                  <p className="font-bold text-[#0F172A] dark:text-[#F1F5F9]">System Notice</p>
                  <p className="text-[#475569] dark:text-slate-400 text-[11px] mt-0.5">Welcome to Taskly. All transactions & proofs are protected.</p>
                </div>
                <div className="p-2.5 rounded-xl bg-[#F8FAFC] dark:bg-[#1F2937]/50 border border-[#E2E8F0] dark:border-[#2A3348]/50">
                  <p className="font-bold text-[#0F172A] dark:text-[#F1F5F9]">Tasks Active</p>
                  <p className="text-[#475569] dark:text-slate-400 text-[11px] mt-0.5">High-reward verified campaigns are active in the platform.</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Balance Pill Button (Workers & Employers Only) */}
        {role !== 'admin' && balance !== null && (
          <Link
            to={role === 'employer' ? '/deposit' : '/withdraw'}
            className="flex items-center gap-2 rounded-xl border border-emerald-500/30 dark:border-brand-primary/30 bg-emerald-50 dark:bg-brand-primary/10 px-3 py-1.5 text-xs sm:text-sm font-bold text-emerald-700 dark:text-brand-primary hover:bg-emerald-100 dark:hover:bg-brand-primary/20 transition shadow-xs"
          >
            <Wallet size={15} />
            <span>{balance}</span>
          </Link>
        )}

        {/* Admin Badge Pill (Admin Only) */}
        {role === 'admin' && (
          <Link
            to="/admin"
            className="flex items-center gap-1.5 rounded-xl border border-indigo-500/30 bg-indigo-50 dark:bg-indigo-500/10 px-3 py-1.5 text-xs sm:text-sm font-bold text-indigo-700 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition shadow-xs"
          >
            <ShieldCheck size={16} />
            <span>Admin</span>
          </Link>
        )}

        {/* User Avatar Menu Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowUserDropdown(!showUserDropdown)}
            className="flex items-center gap-2 rounded-xl p-1 hover:bg-[#F1F5F9] dark:hover:bg-[#111827] transition"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-tr from-brand-primary to-emerald-400 text-white font-bold text-xs shadow-xs">
              {displayName.charAt(0).toUpperCase()}
            </div>
            <div className="hidden md:block text-left">
              <p className="text-xs font-bold text-[#0F172A] dark:text-[#F1F5F9] leading-none">
                {displayName}
              </p>
              <p className="text-[10px] text-[#475569] dark:text-slate-400 capitalize mt-0.5">
                {displayRole}
              </p>
            </div>
            <ChevronDown size={14} className="hidden md:block text-slate-400" />
          </button>

          {showUserDropdown && (
            <div className="absolute right-0 mt-2 w-48 rounded-xl border border-[#E2E8F0] dark:border-[#2A3348] bg-white dark:bg-[#111827] p-1.5 shadow-xl z-50 animate-in fade-in">
              <div className="px-3 py-2 border-b border-[#E2E8F0] dark:border-[#2A3348]/60 mb-1">
                <p className="text-xs font-bold text-[#0F172A] dark:text-[#F1F5F9] truncate">
                  {displayName}
                </p>
                <p className="text-[11px] text-[#475569] dark:text-slate-400 truncate">
                  {user?.email}
                </p>
              </div>
              <Link
                to="/dashboard"
                onClick={() => setShowUserDropdown(false)}
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-[#0F172A] dark:text-slate-200 hover:bg-[#F1F5F9] dark:hover:bg-[#1F2937] transition"
              >
                Dashboard
              </Link>
              {role === 'admin' ? (
                <Link
                  to="/admin"
                  onClick={() => setShowUserDropdown(false)}
                  className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-[#0F172A] dark:text-slate-200 hover:bg-[#F1F5F9] dark:hover:bg-[#1F2937] transition"
                >
                  Admin Console
                </Link>
              ) : (
                <Link
                  to={role === 'employer' ? '/deposit' : '/withdraw'}
                  onClick={() => setShowUserDropdown(false)}
                  className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-[#0F172A] dark:text-slate-200 hover:bg-[#F1F5F9] dark:hover:bg-[#1F2937] transition"
                >
                  Wallet ({balance})
                </Link>
              )}
              <button
                onClick={handleSignOut}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition mt-1 border-t border-[#E2E8F0] dark:border-[#2A3348]/60"
              >
                <LogOut size={14} />
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
