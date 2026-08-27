import React, { useState } from 'react'
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom'
import {
  Wallet,
  LayoutGrid,
  ListChecks,
  CirclePlus as PlusCircle,
  LogOut,
  Menu,
  X,
  Briefcase,
  ClipboardCheck,
  ArrowDownToLine,
  ArrowUpFromLine,
  LogIn,
  UserPlus,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { NotificationBell } from './NotificationBell'
import { formatMoney } from '../lib/utils'

export default function Navbar() {
  const { profile, role, signOut, user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [open, setOpen] = useState(false)

  const workerLinks = [
    { to: '/worker', label: 'Dashboard', icon: LayoutGrid },
    { to: '/marketplace', label: 'Browse tasks', icon: ListChecks },
    { to: '/my-submissions', label: 'My submissions', icon: ClipboardCheck },
    { to: '/withdraw', label: 'Withdraw', icon: ArrowUpFromLine },
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
    { to: '/', label: 'Home' },
    { to: '/how-it-works', label: 'How it Works' },
    { to: '/faq', label: 'FAQ' },
    { to: '/about', label: 'About' },
  ]

  const currentPath = location.pathname
  let links = workerLinks

  if (role === 'admin' || currentPath.startsWith('/admin')) {
    links = adminLinks
  } else if (
    role === 'employer' ||
    currentPath.startsWith('/employer') ||
    currentPath.startsWith('/create-task') ||
    currentPath.startsWith('/review-submissions') ||
    currentPath.startsWith('/deposit')
  ) {
    links = employerLinks
  } else if (
    role === 'worker' ||
    currentPath.startsWith('/worker') ||
    currentPath.startsWith('/marketplace') ||
    currentPath.startsWith('/task') ||
    currentPath.startsWith('/my-submissions') ||
    currentPath.startsWith('/withdraw')
  ) {
    links = workerLinks
  }

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  // Public visitor navigation
  if (!user) {
    return (
      <header className="sticky top-0 z-40 border-b border-base-700 bg-base-950/90 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-8">
              <Link to="/" className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-mint-500 text-base-950 font-display font-extrabold">
                  T
                </span>
                <span className="font-display font-bold text-white text-lg tracking-tight">Taskly</span>
              </Link>
              <nav className="hidden md:flex items-center gap-1">
                {publicLinks.map((l) => (
                  <NavLink
                    key={l.to}
                    to={l.to}
                    className={({ isActive }) =>
                      `rounded-lg px-3 py-2 text-sm font-medium transition ${
                        isActive
                          ? 'bg-base-800 text-white'
                          : 'text-slate-400 hover:text-white hover:bg-base-800/60'
                      }`
                    }
                  >
                    {l.label}
                  </NavLink>
                ))}
              </nav>
            </div>

            <div className="hidden md:flex items-center gap-3">
              <Link to="/login" className="btn-ghost text-sm">
                <LogIn size={15} />
                Sign in
              </Link>
              <Link to="/register" className="btn-primary text-sm">
                <UserPlus size={15} />
                Get Started
              </Link>
            </div>

            <div className="flex md:hidden items-center gap-2">
              <button className="text-slate-300 p-1" onClick={() => setOpen(!open)} aria-label="Toggle Menu">
                {open ? <X size={22} /> : <Menu size={22} />}
              </button>
            </div>
          </div>
        </div>

        {open && (
          <div className="md:hidden border-t border-base-700 bg-base-950 px-4 py-3 space-y-2">
            {publicLinks.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  `block rounded-lg px-3 py-2 text-sm font-medium ${
                    isActive ? 'bg-base-800 text-white' : 'text-slate-400'
                  }`
                }
              >
                {l.label}
              </NavLink>
            ))}
            <div className="pt-2 border-t border-base-800 flex flex-col gap-2">
              <Link to="/login" onClick={() => setOpen(false)} className="btn-secondary w-full justify-center text-sm">
                <LogIn size={15} /> Sign in
              </Link>
              <Link to="/register" onClick={() => setOpen(false)} className="btn-primary w-full justify-center text-sm">
                <UserPlus size={15} /> Get Started
              </Link>
            </div>
          </div>
        )}
      </header>
    )
  }

  // Authenticated user navigation
  return (
    <header className="sticky top-0 z-40 border-b border-base-700 bg-base-950/90 backdrop-blur">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-8">
            <Link
              to={role === 'admin' ? '/admin' : role === 'employer' ? '/employer' : '/worker'}
              className="flex items-center gap-2"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-mint-500 text-base-950 font-display font-extrabold">
                T
              </span>
              <span className="font-display font-bold text-white text-lg tracking-tight">Taskly</span>
            </Link>
            <nav className="hidden md:flex items-center gap-1">
              {links.map((l) => (
                <NavLink
                  key={l.to}
                  to={l.to}
                  className={({ isActive }) =>
                    `flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${
                      isActive ? 'bg-base-800 text-white' : 'text-slate-400 hover:text-white hover:bg-base-800/60'
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
            <NotificationBell />
            <div className="flex items-center gap-2 rounded-lg border border-base-700 bg-base-900 px-3 py-1.5">
              <Wallet size={15} className="text-mint-400" />
              <span className="text-sm font-semibold text-white">
                {role === 'employer'
                  ? formatMoney(profile?.deposited)
                  : role === 'worker'
                  ? formatMoney(profile?.earnings)
                  : 'Admin'}
              </span>
              <span className="text-xs text-slate-500">
                {role === 'employer' ? 'balance' : role === 'worker' ? 'earned' : 'panel'}
              </span>
            </div>
            <button onClick={handleSignOut} className="btn-ghost">
              <LogOut size={16} />
              Sign out
            </button>
          </div>

          <div className="flex md:hidden items-center gap-2">
            <NotificationBell />
            <button className="text-slate-300 p-1" onClick={() => setOpen(!open)} aria-label="Toggle Menu">
              {open ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>
      </div>

      {open && (
        <div className="md:hidden border-t border-base-700 bg-base-950 px-4 py-3 space-y-1">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium ${
                  isActive ? 'bg-base-800 text-white' : 'text-slate-400'
                }`
              }
            >
              <l.icon size={16} />
              {l.label}
            </NavLink>
          ))}
          <button onClick={handleSignOut} className="btn-ghost w-full justify-start mt-2">
            <LogOut size={16} />
            Sign out
          </button>
        </div>
      )}
    </header>
  )
}
