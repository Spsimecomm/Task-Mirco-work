import React, { useEffect, useMemo, useState, useCallback } from 'react'
import { Search, ArrowUpDown, Filter, Sparkles, RefreshCw } from 'lucide-react'
import { supabase } from '../lib/supabase'
import TaskCard from '../components/TaskCard'
import { EmptyState, ErrorBanner } from '../components/Shared'

const CATEGORIES = ['All', 'Social Media', 'Sign Up', 'Video Watching', 'Data Entry']

export default function Marketplace() {
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('All')
  const [sortBy, setSortBy] = useState('newest')

  const loadTasks = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const { data, error: fetchErr } = await supabase
        .from('tasks')
        .select('*')
        .eq('status', 'open')
        .order('created_at', { ascending: false })

      if (fetchErr) throw fetchErr
      setTasks(data || [])
    } catch (err) {
      console.error('Error fetching marketplace tasks:', err)
      setError(err.message || 'Failed to load available tasks from database. Please check your network.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadTasks()

    const channel = supabase
      .channel('marketplace-tasks')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'tasks' },
        () => loadTasks()
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'tasks' },
        () => loadTasks()
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'tasks' },
        () => loadTasks()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [loadTasks])

  const filtered = useMemo(() => {
    let result = tasks.filter((t) => {
      const isOpen = t.status === 'open'
      const matchesCategory = category === 'All' || t.category === category
      const matchesQuery =
        !query ||
        t.title?.toLowerCase().includes(query.toLowerCase()) ||
        t.description?.toLowerCase().includes(query.toLowerCase())
      const hasSlots = (t.slots_filled ?? 0) < (t.slots_total ?? 1)
      return isOpen && matchesCategory && matchesQuery && hasSlots
    })

    if (sortBy === 'reward_high') {
      result.sort((a, b) => Number(b.reward) - Number(a.reward))
    } else if (sortBy === 'reward_low') {
      result.sort((a, b) => Number(a.reward) - Number(b.reward))
    } else if (sortBy === 'spots') {
      result.sort((a, b) => (b.slots_total - b.slots_filled) - (a.slots_total - a.slots_filled))
    } else {
      // Newest
      result.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    }

    return result
  }, [tasks, category, query, sortBy])

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-sans font-bold text-xl sm:text-2xl lg:text-3xl text-slate-900 dark:text-slate-100 tracking-tight leading-[1.3]">
            Task Marketplace
          </h1>
          <p className="font-sans font-normal text-xs sm:text-sm leading-[1.6] text-slate-600 dark:text-slate-400 mt-1">
            Browse available micro-tasks and earn instantly upon approval.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="font-sans text-xs font-semibold px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-brand-primary border border-emerald-500/20">
            {filtered.length} Tasks Available
          </span>
        </div>
      </div>

      {/* Database Error Banner with Retry */}
      <ErrorBanner message={error} onRetry={loadTasks} />

      {/* Filter and Search Bar Row */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search
            size={16}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 pointer-events-none"
          />
          <input
            className="w-full rounded-xl border border-slate-200 dark:border-[#2A3348] bg-white dark:bg-[#111827] pl-10 pr-9 py-2.5 text-xs sm:text-sm text-slate-900 dark:text-[#F1F5F9] placeholder-slate-400 dark:placeholder-slate-500 outline-none transition focus:border-brand-primary focus:ring-1 focus:ring-brand-primary"
            placeholder="Search tasks by keyword or title…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs font-bold p-0.5 rounded-full"
            >
              ×
            </button>
          )}
        </div>

        {/* Sort dropdown */}
        <div className="flex items-center gap-2 justify-between sm:justify-end">
          <label className="text-xs text-[#64748B] dark:text-slate-400 font-medium">
            Sort by:
          </label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="rounded-xl border border-slate-200 dark:border-[#2A3348] bg-white dark:bg-[#111827] px-3 py-2.5 text-xs font-semibold text-slate-800 dark:text-slate-200 outline-none cursor-pointer hover:border-slate-400 dark:hover:border-slate-500 transition"
          >
            <option value="newest">Newest First</option>
            <option value="reward_high">Highest Reward</option>
            <option value="reward_low">Lowest Reward</option>
            <option value="spots">Most Spots Left</option>
          </select>
        </div>
      </div>

      {/* Category Pills Bar (Edge-to-edge scrollable on mobile) */}
      <div className="-mx-4 px-4 sm:mx-0 sm:px-0 flex gap-2 overflow-x-auto pb-1 scrollbar-none touch-pan-x">
        {CATEGORIES.map((c) => {
          const isActive = category === c
          return (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`whitespace-nowrap rounded-xl px-3.5 py-2 text-xs sm:text-sm font-semibold border transition-all shrink-0 ${
                isActive
                  ? 'bg-brand-primary text-white border-brand-primary shadow-sm shadow-brand-primary/20'
                  : 'border-slate-200 dark:border-[#2A3348] bg-white dark:bg-[#111827] text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {c}
            </button>
          )
        })}
      </div>

      {/* Task Cards Grid */}
      {loading ? (
        <div className="text-sm text-slate-500 dark:text-slate-400 py-16 text-center">
          Loading tasks…
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          title="No tasks found"
          subtitle="Try selecting a different category or clearing your search term."
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-5">
          {filtered.map((t) => (
            <TaskCard key={t.id} task={t} />
          ))}
        </div>
      )}
    </div>
  )
}

