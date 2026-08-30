import React, { useState } from 'react'
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  Store,
  ClipboardCheck,
  ArrowUpRight,
  CreditCard,
  Users,
  PlusCircle,
  Briefcase,
  ShieldCheck,
  LogOut,
  ChevronDown,
  X
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export default function Sidebar({ isOpen, onClose }) {
  const { profile, role, signOut, user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [showProfileMenu, setShowProfileMenu] = useState(false)

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  // Define nav links strictly based on user role
  const workerNav = [
    { to: '/worker', label: 'Overview', icon: LayoutDashboard },
    { to: '/marketplace', label: 'Marketplace', icon: Store },
    { to: '/my-submissions', label: 'My Submissions', icon: ClipboardCheck },
    { to: '/withdraw', label: 'Withdraw', icon: ArrowUpRight },
  ]

  const employerNav = [
    { to: '/employer', label: 'Overview', icon: LayoutDashboard },
    { to: '/create-task', label: 'Post a Task', icon: PlusCircle },
    { to: '/review-submissions', label: 'Review Submissions', icon: Briefcase },
    { to: '/deposit', label: 'Deposit Funds', icon: CreditCard },
  ]

  const adminNav = [
    { to: '/admin', label: 'Admin Console', icon: ShieldCheck },
  ]

  const mainLinks = role === 'admin' ? adminNav : role === 'employer' ? employerNav : workerNav

  const displayName = profile?.username || profile?.full_name || user?.email?.split('@')[0] || 'User'
  const displayRole = role === 'admin' ? 'Administrator' : role === 'employer' ? 'Employer' : 'Worker'

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 left-0 z-50 flex h-full w-64 flex-col border-r border-[#E2E8F0] dark:border-[#2A3348] bg-white dark:bg-[#0B1020] transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="flex h-16 items-center justify-between px-6 border-b border-[#E2E8F0] dark:border-[#2A3348]/60">
          <Link to="/dashboard" className="flex items-center gap-3" onClick={() => onClose && onClose()}>
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-primary text-white font-display font-black text-lg shadow-xs shadow-brand-primary/20">
              T
            </span>
            <span className="font-display font-extrabold text-xl tracking-tight text-[#0F172A] dark:text-[#F1F5F9]">
              Taskly
            </span>
          </Link>

          {/* Close button for mobile */}
          <button
            onClick={onClose}
            className="p-1.5 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white lg:hidden"
            aria-label="Close sidebar"
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Navigation Area */}
        <div className="flex-1 overflow-y-auto px-4 py-5 space-y-6 scrollbar-thin">
          {/* Main Navigation Group */}
          <div className="space-y-1">
            <p className="px-3.5 text-[11px] font-bold uppercase tracking-wider text-[#64748B] dark:text-slate-500 mb-2">
              Menu
            </p>
            {mainLinks.map((item) => (
              <NavLink
                key={item.to + item.label}
                to={item.to}
                onClick={() => onClose && onClose()}
                className={({ isActive }) =>
                  `group flex items-center gap-3.5 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-emerald-500/10 dark:bg-brand-primary/15 text-emerald-600 dark:text-brand-primary font-bold shadow-xs'
                      : 'text-[#475569] dark:text-slate-400 hover:bg-[#F1F5F9] dark:hover:bg-[#111827] hover:text-[#0F172A] dark:hover:text-white'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <item.icon
                      size={18}
                      className={`transition-colors ${
                        isActive
                          ? 'text-emerald-600 dark:text-brand-primary'
                          : 'text-[#64748B] dark:text-slate-400 group-hover:text-[#0F172A] dark:group-hover:text-white'
                      }`}
                    />
                    <span>{item.label}</span>
                  </>
                )}
              </NavLink>
            ))}
          </div>
        </div>

        {/* User Profile Footer Card */}
        <div className="p-4 border-t border-[#E2E8F0] dark:border-[#2A3348] bg-[#F8FAFC] dark:bg-[#0E1428]">
          <div className="relative">
            <button
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="flex w-full items-center justify-between rounded-xl p-2 hover:bg-white dark:hover:bg-[#111827] border border-transparent hover:border-[#E2E8F0] dark:hover:border-[#2A3348] transition"
            >
              <div className="flex items-center gap-3 text-left min-w-0">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-brand-primary to-emerald-400 text-white font-bold text-sm shadow-xs">
                  {displayName.charAt(0).toUpperCase()}
                </div>
                <div className="truncate">
                  <p className="text-sm font-bold text-[#0F172A] dark:text-[#F1F5F9] truncate">
                    {displayName}
                  </p>
                  <p className="text-xs text-[#64748B] dark:text-slate-400 capitalize">
                    {displayRole}
                  </p>
                </div>
              </div>
              <ChevronDown size={16} className="text-slate-400 shrink-0" />
            </button>

            {/* Profile Dropdown Popup */}
            {showProfileMenu && (
              <div className="absolute bottom-full left-0 mb-2 w-full rounded-xl bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#2A3348] p-1.5 shadow-lg shadow-black/10 z-50 animate-in fade-in slide-in-from-bottom-2">
                <div className="px-3 py-2 border-b border-[#E2E8F0] dark:border-[#2A3348]/60 mb-1">
                  <p className="text-xs font-semibold text-[#0F172A] dark:text-[#F1F5F9] truncate">
                    {user?.email}
                  </p>
                  <p className="text-[11px] text-[#64748B] dark:text-slate-400">
                    Role: <span className="font-semibold text-emerald-600 dark:text-brand-primary">{displayRole}</span>
                  </p>
                </div>
                <button
                  onClick={handleSignOut}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition"
                >
                  <LogOut size={14} />
                  <span>Sign out</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  )
}
