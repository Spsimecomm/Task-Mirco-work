import React from 'react'
import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  Store,
  Plus,
  ClipboardCheck,
  Wallet,
  Briefcase,
  ShieldCheck,
  PlusCircle,
  ArrowDownToLine
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export default function MobileBottomNav() {
  const { role } = useAuth()

  if (role === 'admin') {
    return (
      <nav className="fixed bottom-0 left-0 z-40 flex h-16 w-full items-center justify-around border-t border-[#CBD5E1] dark:border-[#2A3348] bg-white/95 dark:bg-[#0B1020]/95 px-2 backdrop-blur-lg lg:hidden">
        <NavLink
          to="/admin"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center gap-1 text-[10px] font-medium transition ${
              isActive
                ? 'text-emerald-600 dark:text-brand-primary font-bold'
                : 'text-[#64748B] dark:text-slate-400 hover:text-[#1E293B] dark:hover:text-white'
            }`
          }
        >
          <ShieldCheck size={20} />
          <span>Admin Console</span>
        </NavLink>
      </nav>
    )
  }

  if (role === 'employer') {
    return (
      <nav className="fixed bottom-0 left-0 z-40 flex h-16 w-full items-center justify-around border-t border-[#CBD5E1] dark:border-[#2A3348] bg-white/95 dark:bg-[#0B1020]/95 px-2 backdrop-blur-lg lg:hidden">
        {/* 1. Overview */}
        <NavLink
          to="/employer"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center gap-1 text-[10px] font-medium transition ${
              isActive
                ? 'text-emerald-600 dark:text-brand-primary font-bold'
                : 'text-[#64748B] dark:text-slate-400 hover:text-[#1E293B] dark:hover:text-white'
            }`
          }
        >
          <LayoutDashboard size={20} />
          <span>Overview</span>
        </NavLink>

        {/* 2. Central Quick Action Button (+ Post Task) */}
        <NavLink
          to="/create-task"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center gap-1 text-[10px] font-medium transition ${
              isActive
                ? 'text-emerald-600 dark:text-brand-primary font-bold'
                : 'text-[#64748B] dark:text-slate-400 hover:text-[#1E293B] dark:hover:text-white'
            }`
          }
        >
          <PlusCircle size={20} />
          <span>Post Task</span>
        </NavLink>

        {/* 3. Review Submissions */}
        <NavLink
          to="/review-submissions"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center gap-1 text-[10px] font-medium transition ${
              isActive
                ? 'text-emerald-600 dark:text-brand-primary font-bold'
                : 'text-[#64748B] dark:text-slate-400 hover:text-[#1E293B] dark:hover:text-white'
            }`
          }
        >
          <Briefcase size={20} />
          <span>Review</span>
        </NavLink>

        {/* 4. Deposit Funds */}
        <NavLink
          to="/deposit"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center gap-1 text-[10px] font-medium transition ${
              isActive
                ? 'text-emerald-600 dark:text-brand-primary font-bold'
                : 'text-[#64748B] dark:text-slate-400 hover:text-[#1E293B] dark:hover:text-white'
            }`
          }
        >
          <Wallet size={20} />
          <span>Deposit</span>
        </NavLink>
      </nav>
    )
  }

  // Worker Mobile Bottom Nav
  return (
    <nav className="fixed bottom-0 left-0 z-40 flex h-16 w-full items-center justify-around border-t border-[#CBD5E1] dark:border-[#2A3348] bg-white/95 dark:bg-[#0B1020]/95 px-2 backdrop-blur-lg lg:hidden">
      {/* 1. Overview */}
      <NavLink
        to="/worker"
        className={({ isActive }) =>
          `flex flex-col items-center justify-center gap-1 text-[10px] font-medium transition ${
            isActive
              ? 'text-emerald-600 dark:text-brand-primary font-bold'
              : 'text-[#64748B] dark:text-slate-400 hover:text-[#1E293B] dark:hover:text-white'
          }`
        }
      >
        <LayoutDashboard size={20} />
        <span>Overview</span>
      </NavLink>

      {/* 2. Marketplace */}
      <NavLink
        to="/marketplace"
        className={({ isActive }) =>
          `flex flex-col items-center justify-center gap-1 text-[10px] font-medium transition ${
            isActive
              ? 'text-emerald-600 dark:text-brand-primary font-bold'
              : 'text-[#64748B] dark:text-slate-400 hover:text-[#1E293B] dark:hover:text-white'
          }`
        }
      >
        <Store size={20} />
        <span>Marketplace</span>
      </NavLink>

      {/* 3. Submissions */}
      <NavLink
        to="/my-submissions"
        className={({ isActive }) =>
          `flex flex-col items-center justify-center gap-1 text-[10px] font-medium transition ${
            isActive
              ? 'text-emerald-600 dark:text-brand-primary font-bold'
              : 'text-[#64748B] dark:text-slate-400 hover:text-[#1E293B] dark:hover:text-white'
          }`
        }
      >
        <ClipboardCheck size={20} />
        <span>Submissions</span>
      </NavLink>

      {/* 4. Wallet / Withdraw */}
      <NavLink
        to="/withdraw"
        className={({ isActive }) =>
          `flex flex-col items-center justify-center gap-1 text-[10px] font-medium transition ${
            isActive
              ? 'text-emerald-600 dark:text-brand-primary font-bold'
              : 'text-[#64748B] dark:text-slate-400 hover:text-[#1E293B] dark:hover:text-white'
          }`
        }
      >
        <Wallet size={20} />
        <span>Withdraw</span>
      </NavLink>
    </nav>
  )
}
