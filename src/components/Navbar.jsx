import React, { useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { Wallet, LayoutGrid, ListChecks, CirclePlus as PlusCircle, LogOut, Menu, X, Briefcase, ClipboardCheck, ArrowDownToLine, ArrowUpFromLine } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

function fmt(n) {
  return `$${Number(n ?? 0).toFixed(2)}`
}

export default function Navbar() {
  const { profile, role, signOut, user } = useAuth()
  const navigate = useNavigate()
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

  // কারেন্ট পাথ বা রোল অনুযায়ী সঠিক লিঙ্ক সিলেক্ট করা
  const currentPath = window.location.pathname;
  let links = workerLinks;
  
  if (role === 'admin' || currentPath.startsWith('/admin')) {
    links = adminLinks;
  } else if (role === 'employer' || currentPath.startsWith('/employer') || currentPath.startsWith('/create-task') || currentPath.startsWith('/review-submissions') || currentPath.startsWith('/deposit')) {
    links = employerLinks;
  } else if (role === 'worker' || currentPath.startsWith('/worker') || currentPath.startsWith('/marketplace') || currentPath.startsWith('/task') || currentPath.startsWith('/my-submissions') || currentPath.startsWith('/withdraw')) {
    links = workerLinks;
  }

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  if (!user) return null

  return (
    <header className="sticky top-0 z-40 border-b border-base-700 bg-base-950/90 backdrop-blur">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-8">
            <Link to={role === 'admin' ? '/admin' : role === 'employer' ? '/employer' : '/worker'} className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-mint-500 text-base-950 font-display font-extrabold">T</span>
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

          <div className="hidden md:flex items-center gap-4">
            <div className="flex items-center gap-2 rounded-lg border border-base-700 bg-base-900 px-3 py-1.5">
              <Wallet size={15} className="text-mint-400" />
              <span className="text-sm font-semibold text-white">
                {role === 'employer' ? fmt(profile?.deposited) : role === 'worker' ? fmt(profile?.earnings) : 'Admin'}
              </span>
              <span className="text-xs text-slate-500">{role === 'employer' ? 'balance' : role === 'worker' ? 'earned' : 'panel'}</span>
            </div>
            <button onClick={handleSignOut} className="btn-ghost">
              <LogOut size={16} />
              Sign out
            </button>
          </div>

          <button className="md:hidden text-slate-300" onClick={() => setOpen(!open)}>
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
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