import React, { useEffect, useMemo, useState, useCallback } from 'react'
import { Search } from 'lucide-react'
import { supabase } from '../lib/supabase'
import TaskCard from '../components/TaskCard'
import { EmptyState } from '../components/Shared'

const CATEGORIES = ['All', 'Social Media', 'Sign Up', 'Video Watching', 'Data Entry']

export default function Marketplace() {
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('All')

  const loadTasks = useCallback(async () => {
    const { data } = await supabase
      .from('tasks')
      .select('*')
      .eq('status', 'open')
      .order('created_at', { ascending: false })
    setTasks(data || [])
    setLoading(false)
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
    return tasks.filter((t) => {
      const matchesCategory = category === 'All' || t.category === category
      const matchesQuery =
        !query ||
        t.title.toLowerCase().includes(query.toLowerCase()) ||
        t.description.toLowerCase().includes(query.toLowerCase())
      const hasSlots = t.slots_filled < t.slots_total
      return matchesCategory && matchesQuery && hasSlots
    })
  }, [tasks, category, query])

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#1E293B] dark:text-[#F1F5F9]">Task marketplace</h1>
        <p className="text-sm font-normal text-[#64748B] dark:text-slate-400 mt-1">Find work that matches your skills and start earning today.</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            className="input pl-10"
            placeholder="Search tasks…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 sm:pb-0">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`whitespace-nowrap rounded-full px-4 py-2 text-xs sm:text-sm font-semibold border transition-all ${
                category === c
                  ? 'bg-emerald-600 dark:bg-mint-500 text-white dark:text-slate-900 border-emerald-600 dark:border-mint-500 shadow-sm'
                  : 'border-[#CBD5E1] dark:border-white/10 bg-white dark:bg-slate-800 text-[#1E293B] dark:text-slate-300 hover:border-slate-400 dark:hover:border-white/20 hover:bg-[#E2E8F0] dark:hover:text-white'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="text-sm text-slate-500 dark:text-slate-400 py-16 text-center">Loading tasks…</div>
      ) : filtered.length === 0 ? (
        <EmptyState title="No tasks found" subtitle="Try a different search term or category." />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((t) => (
            <TaskCard key={t.id} task={t} />
          ))}
        </div>
      )}
    </div>
  )
}
