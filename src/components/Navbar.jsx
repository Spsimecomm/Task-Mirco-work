import React, { useState } from 'react'
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { Wallet, LayoutGrid, ListChecks, CirclePlus as PlusCircle, LogOut, Menu, X, Briefcase, ClipboardCheck, ArrowDownToLine, ArrowUpFromLine, Sun, Moon, LogIn, UserPlus, Gift } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import NotificationCenter from './NotificationCenter'

function fmt(n) {
  return `$${Number(n ?? 0).toFixed(2)}`
}

export default function Navbar() {
  const { profile, role, signOut, user } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()
  const location = useLocation()
  const [open, setOpen] = useState(false)

  const workerLinks = [
    { to: '/worker', label: 'Dashboard', icon: LayoutGrid },
    { to: '/marketplace', label: 'Browse tasks', icon: ListChecks },
    { to: '/my-submissions', label: 'My submissions', icon: ClipboardCheck },
    { to: '/withdraw', label: 'Withdraw', icon: ArrowUpFromLine },
    { to: '/referrals', label: 'Refer & Earn', icon: Gift },
  ]

  const employerLinks = [
    { to: '/employer', label: 'Dashboard', icon: LayoutGrid },
    { to: '/create-task', label: 'Post a task', icon: PlusCircle },
    { to: '/review-submissions', label: 'Review submissions', icon: Briefcase },
    { to: '/deposit', label: 'Deposit', icon: ArrowDownToLine },
  ]

  const adminLinks = [
    { to: '/admin', label: 'Admin dashboard', icon: LayoutGrid },
  ]

  const publicLinks = [
    { to: '/about', label: 'About' },
    { to: '/how-it-works', label: 'How It Works' },
    { to: '/faq', label: 'FAQ' },
  ]

  // Select links strictly based on user role
  const links =
    role === 'admin'
      ? adminLinks
      : role === 'employer'
      ? employerLinks
      : workerLinks

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  // যদি ইউজার লগইন না করা থাকে এবং হোমপেজে থাকে, হোমপেজের নিজস্ব হিরো সেকশন থাকবে
  if (!user && location.pathname === '/') {
    return null
  }

  // পাবলিক পেজগুলোর জন্য ন্যাভবার (যখন ইউজার লগইন নেই)
  if (!user) {
    return (
      <header className="sticky top-0 z-40 border-b border-[#CBD5E1] dark:border-white/10 bg-white dark:bg-slate-950">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-8">
              <Link to="/" className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-mint-500 text-white dark:text-slate-900 font-display font-extrabold shadow-sm">T</span>
                <span className="font-display font-bold text-[#1E293B] dark:text-[#F1F5F9] text-lg tracking-tight">Taskly</span>
              </Link>
              <nav className="hidden md:flex items-center gap-1">
                {publicLinks.map((l) => (
                  <NavLink
                    key={l.to}
                    to={l.to}
                    className={({ isActive }) =>
                      `flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${
                        isActive ? 'bg-[#E2E8F0] dark:bg-slate-800 text-[#1E293B] dark:text-[#F1F5F9]' : 'text-[#64748B] dark:text-slate-400 hover:text-[#1E293B] dark:hover:text-white hover:bg-[#E2E8F0] dark:hover:bg-slate-800/60'
                      }`
                    }
                  >
                    {l.label}
                  </NavLink>
                ))}
              </nav>
            </div>

            <div className="hidden md:flex items-center gap-3">
              {/* Theme Toggle Button */}
              <button
                id="public-theme-toggle-btn"
                type="button"
                onClick={toggleTheme}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#CBD5E1] dark:border-white/10 bg-[#F1F5F9] dark:bg-slate-900 text-[#1E293B] dark:text-slate-300 transition hover:border-slate-400 dark:hover:border-white/20 hover:text-slate-900 dark:hover:text-white"
                title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                aria-label="Toggle theme"
              >
                {theme === 'dark' ? (
                  <Sun size={18} className="text-amber-400" />
                ) : (
                  <Moon size={18} className="text-slate-700" />
                )}
              </button>

              <Link to="/login" className="btn-ghost">
                <LogIn size={16} />
                Sign in
              </Link>
              <Link to="/register" className="btn-primary">
                <UserPlus size={16} />
                Get Started
              </Link>
            </div>

            <div className="flex items-center gap-2 md:hidden">
              <button
                id="public-mobile-theme-toggle-btn"
                type="button"
                onClick={toggleTheme}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#CBD5E1] dark:border-white/10 bg-[#F1F5F9] dark:bg-slate-900 text-[#1E293B] dark:text-slate-300 transition hover:text-slate-900 dark:hover:text-white"
                title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                aria-label="Toggle theme"
              >
                {theme === 'dark' ? <Sun size={18} className="text-amber-400" /> : <Moon size={18} className="text-slate-700" />}
              </button>
              <button className="text-slate-700 dark:text-slate-300 p-1.5" onClick={() => setOpen(!open)} aria-label="Toggle menu">
                {open ? <X size={22} /> : <Menu size={22} />}
              </button>
            </div>
          </div>
        </div>

        {open && (
          <div className="md:hidden border-t border-[#CBD5E1] dark:border-white/10 bg-white dark:bg-slate-950 px-4 py-3 space-y-2">
            {publicLinks.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium ${
                    isActive ? 'bg-[#E2E8F0] dark:bg-slate-800 text-[#1E293B] dark:text-[#F1F5F9]' : 'text-[#64748B] dark:text-slate-400'
                  }`
                }
              >
                {l.label}
              </NavLink>
            ))}
            <div className="pt-2 border-t border-[#CBD5E1] dark:border-white/10 flex flex-col gap-2">
              <Link to="/login" onClick={() => setOpen(false)} className="btn-ghost w-full justify-start">
                <LogIn size={16} />
                Sign in
              </Link>
              <Link to="/register" onClick={() => setOpen(false)} className="btn-primary w-full justify-center">
                <UserPlus size={16} />
                Get Started
              </Link>
            </div>
          </div>
        )}
      </header>
    )
  }

  // লগইন করা ইউজারদের জন্য ন্যাভবার
  return (
    <header className="sticky top-0 z-40 border-b border-[#CBD5E1] dark:border-white/10 bg-white dark:bg-slate-950">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-8">
            <Link to={role === 'admin' ? '/admin' : role === 'employer' ? '/employer' : '/worker'} className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-mint-500 text-white dark:text-slate-900 font-display font-extrabold shadow-sm">T</span>
              <span className="font-display font-bold text-[#1E293B] dark:text-[#F1F5F9] text-lg tracking-tight">Taskly</span>
            </Link>
            <nav className="hidden md:flex items-center gap-1">
              {links.map((l) => (
                <NavLink
                  key={l.to}
                  to={l.to}
                  className={({ isActive }) =>
                    `flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${
                      isActive ? 'bg-[#E2E8F0] dark:bg-slate-800 text-[#1E293B] dark:text-[#F1F5F9]' : 'text-[#64748B] dark:text-slate-400 hover:text-[#1E293B] dark:hover:text-white hover:bg-[#E2E8F0] dark:hover:bg-slate-800/60'
                    }`
                  }
                >
                  <l.icon size={16} />
                  {l.label}
                </NavLink>
              ))}
            </nav>
          </div>

          <div className="hidden md:flex items-center gap-3">
            <div className="flex items-center gap-2 rounded-lg border border-[#CBD5E1] dark:border-white/10 bg-[#F1F5F9] dark:bg-slate-900 px-3 py-1.5">
              <Wallet size={15} className="text-emerald-600 dark:text-mint-500" />
              <span className="text-sm font-bold text-[#1E293B] dark:text-[#F1F5F9]">
                {role === 'employer' ? fmt(profile?.deposited) : role === 'worker' ? fmt(profile?.earnings) : 'Admin'}
              </span>
              <span className="text-xs text-[#64748B] dark:text-slate-400">{role === 'employer' ? 'balance' : role === 'worker' ? 'earned' : 'panel'}</span>
            </div>

            {/* Notification Center */}
            <NotificationCenter />

            {/* Theme Toggle Button */}
            <button
              id="theme-toggle-btn"
              type="button"
              onClick={toggleTheme}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#CBD5E1] dark:border-white/10 bg-[#F1F5F9] dark:bg-slate-900 text-[#1E293B] dark:text-slate-300 transition hover:border-slate-400 dark:hover:border-white/20 hover:text-slate-900 dark:hover:text-white"
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? (
                <Sun size={18} className="text-amber-400" />
              ) : (
                <Moon size={18} className="text-slate-700" />
              )}
            </button>

            <button onClick={handleSignOut} className="btn-ghost">
              <LogOut size={16} />
              Sign out
            </button>
          </div>

          <div className="flex items-center gap-2 md:hidden">
            {/* Mobile Theme Toggle Button */}
            <button
              id="mobile-theme-toggle-btn"
              type="button"
              onClick={toggleTheme}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#CBD5E1] dark:border-white/10 bg-[#F1F5F9] dark:bg-slate-900 text-[#1E293B] dark:text-slate-300 transition hover:text-slate-900 dark:hover:text-white"
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? <Sun size={18} className="text-amber-400" /> : <Moon size={18} className="text-slate-700" />}
            </button>

            <button className="text-slate-700 dark:text-slate-300 p-1.5" onClick={() => setOpen(!open)} aria-label="Toggle menu">
              {open ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>
      </div>

      {open && (
        <div className="md:hidden border-t border-[#CBD5E1] dark:border-white/10 bg-white dark:bg-slate-950 px-4 py-3 space-y-1">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium ${
                  isActive ? 'bg-[#E2E8F0] dark:bg-slate-800 text-[#1E293B] dark:text-[#F1F5F9]' : 'text-[#64748B] dark:text-slate-400'
                }`
              }
            >
              <l.icon size={16} />
              {l.label}
            </NavLink>
          ))}
          <button
            onClick={toggleTheme}
            className="btn-ghost w-full justify-start mt-2 text-slate-700 dark:text-slate-300"
          >
            {theme === 'dark' ? <Sun size={16} className="text-amber-400" /> : <Moon size={16} />}
            <span>{theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}</span>
          </button>
          <button onClick={handleSignOut} className="btn-ghost w-full justify-start mt-1">
            <LogOut size={16} />
            Sign out
          </button>
        </div>
      )}
    </header>
  )
}