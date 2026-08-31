import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)

// ============================================================================
// In-Memory Mock Database & Service (Used when Supabase credentials are unset)
// ============================================================================

const STORAGE_KEY = 'taskly_mock_db_v2'

const initialMockData = {
  profiles: [
    {
      id: 'usr-worker-1',
      email: 'worker@taskly.demo',
      full_name: 'Tanvir Ahmed',
      role: 'worker',
      earnings: 24.50,
      deposited: 0.00,
      created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
    },
    {
      id: 'usr-employer-1',
      email: 'employer@taskly.demo',
      full_name: 'Shakil Enterprise',
      role: 'employer',
      earnings: 0.00,
      deposited: 150.00,
      created_at: new Date(Date.now() - 86400000 * 10).toISOString(),
    },
    {
      id: 'usr-admin-1',
      email: 'admin@taskly.demo',
      full_name: 'Taskly Admin',
      role: 'admin',
      earnings: 0.00,
      deposited: 0.00,
      created_at: new Date(Date.now() - 86400000 * 30).toISOString(),
    },
  ],
  tasks: [
    {
      id: 'task-1',
      employer_id: 'usr-employer-1',
      title: 'Follow our official Facebook page & share latest post',
      category: 'Social Media',
      description: 'ধাপ ১: আমাদের অফিসিয়াল ফেসবুক পেইজে প্রবেশ করে ফলো/লাইক দিন।\nধাপ ২: পিন করা পোস্টটি আপনার পার্সোনাল টাইমলাইনে পাবলিকভাবে শেয়ার করুন।\nরিওয়ার্ড: প্রতিটি ভেরিফায়েড সাবমিশনে সরাসরি $0.75 জমা হবে।\nগুরুত্বপূর্ণ: শেয়ার করা পোস্টের অডিয়েন্স অবশ্যই পাবলিক হতে হবে এবং কোনো ফেক একাউন্ট গ্রহণযোগ্য নয়।',
      proof_instructions: 'ধাপ ১: আপনার ফেসবুক প্রোফাইল লিঙ্ক ইনপুট বক্সে দিন।\nধাপ ২: টাইমলাইনে শেয়ার করা পোস্টের স্পষ্ট স্ক্রিনশট আপলোড করুন।',
      reward: 0.75,
      slots_total: 50,
      slots_filled: 22,
      status: 'open',
      created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    },
    {
      id: 'task-2',
      employer_id: 'usr-employer-1',
      title: 'Download Android app and sign up with referral code',
      category: 'Sign Up',
      description: 'ধাপ ১: গুগল প্লে-স্টোর থেকে অ্যাপটি ডাউনলোড করে ইনস্টল করুন।\nধাপ ২: আপনার মোবাইল নম্বর দিয়ে রেজিস্ট্রেশন ও OTP ভেরিফিকেশন সম্পন্ন করুন।\nধাপ ৩: রেফারেল কোড অপশনে TASKLY2026 কোডটি প্রবেশ করান।\nগুরুত্বপূর্ণ: পূর্বে এই ডিভাইসে অ্যাপটি ইন্সটল করা থাকলে নতুন সাবমিশন বাতিল হবে।',
      proof_instructions: 'ধাপ ১: প্রোফাইল সেকশনের স্ক্রিনশট নিন যেখানে আপনার ইউজার আইডি ও ভেরিফায়েড ব্যাজ দেখা যাচ্ছে।\nধাপ ২: আপনার রেজিস্টার্ড মোবাইল নম্বর লিখে সাবমিট করুন।',
      reward: 1.50,
      slots_total: 30,
      slots_filled: 14,
      status: 'open',
      created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
    },
    {
      id: 'task-3',
      employer_id: 'usr-employer-1',
      title: 'Watch 3-minute tech review video and leave genuine comment',
      category: 'Video Watching',
      description: 'ধাপ ১: সম্পূর্ণ ৩ মিনিটের ভিডিওটি কোনো অংশ স্কিপ না করে দেখুন।\nধাপ ২: ভিডিওটিতে লাইক দিন এবং চ্যানেলে সাবস্ক্রাইব করুন।\nধাপ ৩: ভিডিও সম্পর্কিত গঠনমূলক ও বাস্তবসম্মত একটি মন্তব্য (কমপক্ষে ১০ শব্দ) লিখুন।\nরিওয়ার্ড: প্রতিটি সফল যাচাইকৃত কমেন্টের জন্য $0.45 রিওয়ার্ড।',
      proof_instructions: 'ধাপ ১: আপনার ইউটিউব চ্যানেল বা ইউজারনেম উল্লেখ করুন।\nধাপ ২: আপনার করা কমেন্ট ও সাবস্ক্রাইব করা স্ক্রিনের স্ক্রিনশট দিন।',
      reward: 0.45,
      slots_total: 100,
      slots_filled: 68,
      status: 'open',
      created_at: new Date(Date.now() - 86400000 * 1).toISOString(),
    },
    {
      id: 'task-4',
      employer_id: 'usr-employer-1',
      title: 'Copy & Paste Bangladeshi ecommerce product data to Google Sheet',
      category: 'Data Entry',
      description: 'ধাপ ১: নির্ধারিত ১০টি বাংলাদেশি ই-কমার্স প্রোডাক্ট লিঙ্কে প্রবেশ করুন।\nধাপ ২: প্রতিটি পণ্যের নাম, বর্তমান মূল্য, SKU কোড ও ক্যাটাগরি গুগল শীটে এন্ট্রি করুন।\nগুরুত্বপূর্ণ: স্পেলিং ও প্রাইসিং নির্ভুল হতে হবে।',
      proof_instructions: 'ধাপ ১: আপনার তৈরি করা গুগল শীটের View-Only শেয়ারেবল লিঙ্ক দিন।',
      reward: 2.20,
      slots_total: 20,
      slots_filled: 8,
      status: 'open',
      created_at: new Date(Date.now() - 3600000 * 12).toISOString(),
    },
  ],
  submissions: [
    {
      id: 'sub-1',
      task_id: 'task-1',
      worker_id: 'usr-worker-1',
      employer_id: 'usr-employer-1',
      worker_name: 'Tanvir Ahmed',
      proof_text: 'Facebook profile: https://facebook.com/tanvir.ahmed.demo. Shared screenshot uploaded.',
      proof_url: 'https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=600&auto=format&fit=crop&q=80',
      status: 'pending',
      rejection_reason: null,
      created_at: new Date(Date.now() - 3600000 * 4).toISOString(),
    },
    {
      id: 'sub-2',
      task_id: 'task-3',
      worker_id: 'usr-worker-1',
      employer_id: 'usr-employer-1',
      worker_name: 'Tanvir Ahmed',
      proof_text: 'YouTube user: @tanvirreviews. Commented: "Great breakdown of the technical specifications and camera quality!"',
      proof_url: null,
      status: 'approved',
      rejection_reason: null,
      created_at: new Date(Date.now() - 86400000 * 1).toISOString(),
    },
  ],
  deposit_requests: [
    {
      id: 'dep-1',
      user_id: 'usr-employer-1',
      employer_name: 'Shakil Enterprise',
      amount: 50.00,
      method: 'bkash',
      sender_mobile: '01712998877',
      trx_id: 'TRX9A4B82C10',
      status: 'pending',
      created_at: new Date(Date.now() - 3600000 * 3).toISOString(),
    },
    {
      id: 'dep-2',
      user_id: 'usr-employer-1',
      employer_name: 'Shakil Enterprise',
      amount: 100.00,
      method: 'nagad',
      sender_mobile: '01812334455',
      trx_id: 'NGD882910AA',
      status: 'approved',
      created_at: new Date(Date.now() - 86400000 * 4).toISOString(),
    },
  ],
  withdrawals: [
    {
      id: 'wd-1',
      worker_id: 'usr-worker-1',
      worker_name: 'Tanvir Ahmed',
      amount: 10.00,
      method: 'bkash',
      account: '01712998877',
      fee: 0.20,
      net_amount: 9.80,
      status: 'pending',
      rejection_reason: null,
      created_at: new Date(Date.now() - 3600000 * 6).toISOString(),
    },
  ],
  platform_earnings: [
    {
      id: 'pe-1',
      task_id: 'task-1',
      amount: 1.50,
      reason: 'Task posting commission',
      created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    },
  ],
  withdrawal_fee_earnings: [
    {
      id: 'wfe-1',
      withdrawal_id: 'wd-1',
      amount: 0.20,
      created_at: new Date(Date.now() - 3600000 * 6).toISOString(),
    },
  ],
  notifications: [
    {
      id: 'notif-1',
      user_id: null,
      title: 'Welcome to Taskly Micro-Job Network! 🚀',
      message: 'Earn money completing fast online micro-tasks or post tasks to grow your audience and business.',
      type: 'announcement',
      target_role: 'all',
      created_by: 'usr-admin-1',
      created_at: new Date(Date.now() - 3600000 * 24).toISOString(),
    },
    {
      id: 'notif-2',
      user_id: null,
      title: '5% Instant Referral Bonus Activated 🎁',
      message: 'Share your referral link with friends. Earn lifetime 5% commission on all their earnings and deposits.',
      type: 'reward',
      target_role: 'all',
      created_by: 'usr-admin-1',
      created_at: new Date(Date.now() - 3600000 * 12).toISOString(),
    },
    {
      id: 'notif-3',
      user_id: 'usr-worker-1',
      title: 'Task Submission Approved! 💰',
      message: 'Your proof for "Watch 3-minute tech review video" was approved. $0.45 has been added to your earnings balance.',
      type: 'commission',
      target_role: 'worker',
      created_by: 'usr-employer-1',
      created_at: new Date(Date.now() - 3600000 * 3).toISOString(),
    },
  ],
  notification_reads: [],
  system_settings: [
    { key: 'referral_commission_rate', value: '5.00', label: 'Referral Commission Rate (%)', description: 'Percentage of task earnings awarded to referrer' },
    { key: 'platform_commission_rate', value: '10.00', label: 'Platform Commission Rate (%)', description: 'Platform fee percentage on task rewards' },
    { key: 'withdrawal_fee_rate', value: '2.00', label: 'Withdrawal Processing Fee (%)', description: 'Fee percentage on withdrawals' },
  ],
  referral_commissions: [
    {
      id: 'rc-1',
      referrer_id: 'usr-worker-1',
      referred_id: 'usr-employer-1',
      amount: 0.25,
      rate: 5.0,
      source_type: 'task_earning',
      source_id: 'task-1',
      created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    },
  ],
}

function getStoredMockDb() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      return {
        ...initialMockData,
        ...parsed,
        notifications: parsed.notifications || initialMockData.notifications,
        notification_reads: parsed.notification_reads || initialMockData.notification_reads,
        system_settings: parsed.system_settings || initialMockData.system_settings,
        referral_commissions: parsed.referral_commissions || initialMockData.referral_commissions,
      }
    }
  } catch (e) {
    // fallback
  }
  return initialMockData
}

function saveMockDb(db) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db))
  } catch (e) {
    // ignore
  }
}

let activeSession = (() => {
  try {
    const saved = localStorage.getItem('taskly_mock_session')
    if (saved) return JSON.parse(saved)
  } catch (e) {}
  return null
})()

const authListeners = new Set()

function notifyAuth(event, session) {
  authListeners.forEach((cb) => {
    try {
      cb(event, session)
    } catch (e) {
      console.error(e)
    }
  })
}

function createMockClient() {
  return {
    auth: {
      async getSession() {
        return { data: { session: activeSession }, error: null }
      },
      onAuthStateChange(callback) {
        authListeners.add(callback)
        return {
          data: {
            subscription: {
              unsubscribe() {
                authListeners.delete(callback)
              },
            },
          },
        }
      },
      async signUp({ email, password, options = {} }) {
        const db = getStoredMockDb()
        let user = db.profiles.find((p) => p.email.toLowerCase() === email.toLowerCase())
        if (!user) {
          user = {
            id: 'usr-' + Math.random().toString(36).slice(2, 10),
            email,
            full_name: options.data?.full_name || email.split('@')[0],
            role: options.data?.role || 'worker',
            earnings: options.data?.role === 'worker' ? 10.00 : 0.00,
            deposited: options.data?.role === 'employer' ? 50.00 : 0.00,
            created_at: new Date().toISOString(),
          }
          db.profiles.push(user)
          saveMockDb(db)
        }
        const session = {
          access_token: 'mock-token-' + user.id,
          user: {
            id: user.id,
            email: user.email,
            user_metadata: { full_name: user.full_name, role: user.role },
          },
        }
        activeSession = session
        localStorage.setItem('taskly_mock_session', JSON.stringify(session))
        notifyAuth('SIGNED_IN', session)
        return { data: { user: session.user, session }, error: null }
      },
      async signInWithPassword({ email, password }) {
        const db = getStoredMockDb()
        let user = db.profiles.find((p) => p.email.toLowerCase() === email.toLowerCase())
        if (!user) {
          // If demo quick login or new user, auto-create a user profile
          const defaultRole = email.includes('admin') ? 'admin' : email.includes('employer') ? 'employer' : 'worker'
          user = {
            id: 'usr-' + Math.random().toString(36).slice(2, 10),
            email,
            full_name: email.split('@')[0],
            role: defaultRole,
            earnings: defaultRole === 'worker' ? 15.00 : 0.00,
            deposited: defaultRole === 'employer' ? 100.00 : 0.00,
            created_at: new Date().toISOString(),
          }
          db.profiles.push(user)
          saveMockDb(db)
        }
        const session = {
          access_token: 'mock-token-' + user.id,
          user: {
            id: user.id,
            email: user.email,
            user_metadata: { full_name: user.full_name, role: user.role },
          },
        }
        activeSession = session
        localStorage.setItem('taskly_mock_session', JSON.stringify(session))
        notifyAuth('SIGNED_IN', session)
        return { data: { user: session.user, session }, error: null }
      },
      async signOut() {
        activeSession = null
        localStorage.removeItem('taskly_mock_session')
        notifyAuth('SIGNED_OUT', null)
        return { error: null }
      },
    },

    from(table) {
      let filters = []
      let orConditions = []
      let orderField = null
      let orderAsc = true
      let limitCount = null
      let singleMode = false
      let maybeSingleMode = false

      const executeQuery = (operation = 'select', payload = null) => {
        const db = getStoredMockDb()
        const items = db[table] || []

        if (operation === 'insert') {
          const newRows = Array.isArray(payload) ? payload : [payload]
          const inserted = newRows.map((r) => ({
            id: r.id || `${table.slice(0, 3)}-${Math.random().toString(36).slice(2, 9)}`,
            created_at: r.created_at || new Date().toISOString(),
            ...r,
          }))
          db[table] = [...items, ...inserted]
          saveMockDb(db)
          return { data: Array.isArray(payload) ? inserted : inserted[0], error: null }
        }

        if (operation === 'update') {
          let updatedCount = 0
          db[table] = items.map((item) => {
            const matches = filters.every(({ col, val, op }) => {
              if (op === 'neq') return String(item[col]) !== String(val)
              return String(item[col]) === String(val)
            })
            if (matches) {
              updatedCount++
              return { ...item, ...payload }
            }
            return item
          })
          saveMockDb(db)
          return { data: payload, error: null }
        }

        if (operation === 'delete') {
          db[table] = items.filter((item) => {
            return !filters.every(({ col, val, op }) => {
              if (op === 'neq') return String(item[col]) !== String(val)
              return String(item[col]) === String(val)
            })
          })
          saveMockDb(db)
          return { data: null, error: null }
        }

        // SELECT query
        let result = items.filter((item) => {
          // Check standard AND filters
          const matchesFilters = filters.every(({ col, val, op }) => {
            if (op === 'neq') return String(item[col]) !== String(val)
            if (op === 'in') return Array.isArray(val) && val.map(String).includes(String(item[col]))
            if (op === 'is') {
              if (val === null) return item[col] === null || item[col] === undefined
              return item[col] === val
            }
            if (op === 'gt') return Number(item[col]) > Number(val)
            if (op === 'gte') return Number(item[col]) >= Number(val)
            if (op === 'lt') return Number(item[col]) < Number(val)
            if (op === 'lte') return Number(item[col]) <= Number(val)
            if (op === 'like' || op === 'ilike') {
              const str = String(item[col] || '').toLowerCase()
              const search = String(val || '').replace(/%/g, '').toLowerCase()
              return str.includes(search)
            }
            return String(item[col]) === String(val)
          })

          if (!matchesFilters) return false

          // Check OR conditions
          if (orConditions.length > 0) {
            const matchesOr = orConditions.some((cond) => {
              if (typeof cond === 'function') {
                return cond(item)
              }
              return true
            })
            if (!matchesOr) return false
          }

          return true
        })

        // Hydrate relations (e.g. tasks(title, category, reward) on submissions)
        if (table === 'submissions') {
          result = result.map((sub) => {
            const task = db.tasks?.find((t) => t.id === sub.task_id) || null
            return { ...sub, tasks: task }
          })
        }

        if (orderField) {
          result.sort((a, b) => {
            const valA = a[orderField]
            const valB = b[orderField]
            if (valA < valB) return orderAsc ? -1 : 1
            if (valA > valB) return orderAsc ? 1 : -1
            return 0
          })
        }

        if (limitCount !== null) {
          result = result.slice(0, limitCount)
        }

        if (singleMode) {
          const item = result[0] || null
          return item ? { data: item, error: null } : { data: null, error: new Error('Row not found') }
        }

        if (maybeSingleMode) {
          return { data: result[0] || null, error: null }
        }

        return { data: result, error: null }
      }

      const builder = {
        select(fields = '*') {
          return builder
        },
        eq(col, val) {
          filters.push({ col, val, op: 'eq' })
          return builder
        },
        neq(col, val) {
          filters.push({ col, val, op: 'neq' })
          return builder
        },
        in(col, valArray) {
          filters.push({ col, val: valArray, op: 'in' })
          return builder
        },
        is(col, val) {
          filters.push({ col, val, op: 'is' })
          return builder
        },
        gt(col, val) {
          filters.push({ col, val, op: 'gt' })
          return builder
        },
        gte(col, val) {
          filters.push({ col, val, op: 'gte' })
          return builder
        },
        lt(col, val) {
          filters.push({ col, val, op: 'lt' })
          return builder
        },
        lte(col, val) {
          filters.push({ col, val, op: 'lte' })
          return builder
        },
        like(col, pattern) {
          filters.push({ col, val: pattern, op: 'like' })
          return builder
        },
        ilike(col, pattern) {
          filters.push({ col, val: pattern, op: 'ilike' })
          return builder
        },
        or(clause) {
          if (typeof clause === 'function') {
            orConditions.push(clause)
            return builder
          }
          if (typeof clause === 'string') {
            orConditions.push((item) => {
              // Handle expressions like "user_id.eq.usr-1,and(user_id.is.null,target_role.in.(all,worker))"
              // Direct match against target_role or user_id
              if (clause.includes('user_id.eq.')) {
                const match = clause.match(/user_id\.eq\.([^,]+)/)
                if (match && item.user_id === match[1].trim()) return true
              }
              if (clause.includes('user_id.is.null')) {
                if (!item.user_id) {
                  if (clause.includes('target_role.in.')) {
                    const rolesMatch = clause.match(/target_role\.in\.\(([^)]+)\)/)
                    if (rolesMatch) {
                      const allowed = rolesMatch[1].split(',').map((s) => s.trim())
                      if (allowed.includes(item.target_role) || allowed.includes('all')) return true
                    }
                  } else {
                    return true
                  }
                }
              }
              // Fallback for notifications targeting everyone
              if (item.target_role === 'all' || !item.user_id) return true
              return false
            })
          }
          return builder
        },
        order(field, { ascending = true } = {}) {
          orderField = field
          orderAsc = ascending
          return builder
        },
        limit(count) {
          limitCount = count
          return builder
        },
        single() {
          singleMode = true
          return builder
        },
        maybeSingle() {
          maybeSingleMode = true
          return builder
        },
        async insert(payload) {
          return executeQuery('insert', payload)
        },
        async update(payload) {
          return executeQuery('update', payload)
        },
        async delete() {
          return executeQuery('delete')
        },
        then(resolve, reject) {
          const res = executeQuery('select')
          resolve(res)
        },
      }

      return builder
    },

    async rpc(funcName, params = {}) {
      const db = getStoredMockDb()
      const currentUserId = activeSession?.user?.id || 'usr-worker-1'
      const currentProfile = db.profiles.find((p) => p.id === currentUserId)

      if (funcName === 'admin_send_notification') {
        const { p_title, p_message, p_type, p_target_role, p_user_id } = params
        const newNotif = {
          id: 'notif-' + Math.random().toString(36).slice(2, 9),
          user_id: p_user_id || null,
          title: p_title,
          message: p_message,
          type: p_type || 'announcement',
          target_role: p_target_role || 'all',
          created_by: currentUserId,
          created_at: new Date().toISOString(),
        }
        db.notifications = db.notifications || []
        db.notifications.unshift(newNotif)
        saveMockDb(db)
        return { data: newNotif.id, error: null }
      }

      if (funcName === 'admin_delete_notification') {
        const { p_notification_id } = params
        db.notifications = (db.notifications || []).filter((n) => n.id !== p_notification_id)
        saveMockDb(db)
        return { data: null, error: null }
      }

      if (funcName === 'admin_update_system_setting') {
        const { p_key, p_value } = params
        db.system_settings = db.system_settings || []
        const setting = db.system_settings.find((s) => s.key === p_key)
        if (setting) {
          setting.value = p_value
          setting.updated_at = new Date().toISOString()
        } else {
          db.system_settings.push({
            key: p_key,
            value: p_value,
            label: p_key,
            updated_at: new Date().toISOString(),
          })
        }
        saveMockDb(db)
        return { data: null, error: null }
      }

      if (funcName === 'mark_notification_as_read') {
        const { p_notification_id } = params
        db.notification_reads = db.notification_reads || []
        if (!db.notification_reads.some((r) => r.notification_id === p_notification_id && r.user_id === currentUserId)) {
          db.notification_reads.push({
            notification_id: p_notification_id,
            user_id: currentUserId,
            read_at: new Date().toISOString(),
          })
          saveMockDb(db)
        }
        return { data: null, error: null }
      }

      if (funcName === 'mark_all_notifications_as_read') {
        db.notifications = db.notifications || []
        db.notification_reads = db.notification_reads || []
        const userRole = currentProfile?.role || 'worker'
        const applicable = db.notifications.filter((n) =>
          n.user_id === currentUserId || (!n.user_id && (n.target_role === 'all' || n.target_role === userRole))
        )
        applicable.forEach((n) => {
          if (!db.notification_reads.some((r) => r.notification_id === n.id && r.user_id === currentUserId)) {
            db.notification_reads.push({
              notification_id: n.id,
              user_id: currentUserId,
              read_at: new Date().toISOString(),
            })
          }
        })
        saveMockDb(db)
        return { data: null, error: null }
      }

      if (funcName === 'create_task_with_funding') {
        const { p_title, p_category, p_description, p_proof_instructions, p_reward, p_slots } = params
        const totalBudget = Number(p_reward) * Number(p_slots)
        if (currentProfile) {
          currentProfile.deposited = Math.max(0, (Number(currentProfile.deposited) || 0) - totalBudget)
        }
        const newTask = {
          id: 'task-' + Math.random().toString(36).slice(2, 9),
          employer_id: currentUserId,
          title: p_title,
          category: p_category,
          description: p_description,
          proof_instructions: p_proof_instructions,
          reward: Number(p_reward),
          slots_total: Number(p_slots),
          slots_filled: 0,
          status: 'open',
          created_at: new Date().toISOString(),
        }
        db.tasks.unshift(newTask)
        saveMockDb(db)
        return { data: newTask, error: null }
      }

      if (funcName === 'request_deposit') {
        const { p_amount, p_method, p_sender_mobile, p_trx_id } = params
        const newReq = {
          id: 'dep-' + Math.random().toString(36).slice(2, 9),
          user_id: currentUserId,
          employer_name: currentProfile?.full_name || 'Employer',
          amount: Number(p_amount),
          method: p_method,
          sender_mobile: p_sender_mobile,
          trx_id: p_trx_id,
          status: 'pending',
          created_at: new Date().toISOString(),
        }
        db.deposit_requests.unshift(newReq)
        saveMockDb(db)
        return { data: newReq, error: null }
      }

      if (funcName === 'request_withdrawal') {
        const { p_amount, p_method, p_account, p_account_details } = params
        const reqAmt = Number(p_amount)
        const fee = Math.round(reqAmt * 0.02 * 100) / 100
        const netAmount = Math.max(0, reqAmt - fee)
        const accountVal = p_account_details || p_account || ''

        if (currentProfile) {
          currentProfile.earnings = Math.max(0, (Number(currentProfile.earnings) || 0) - reqAmt)
        }

        const newWd = {
          id: 'wd-' + Math.random().toString(36).slice(2, 9),
          worker_id: currentUserId,
          worker_name: currentProfile?.full_name || 'Worker',
          amount: reqAmt,
          method: p_method,
          account: accountVal,
          account_details: accountVal,
          fee,
          net_amount: netAmount,
          status: 'pending',
          rejection_reason: null,
          created_at: new Date().toISOString(),
        }
        db.withdrawals.unshift(newWd)
        db.withdrawal_fee_earnings.unshift({
          id: 'wfe-' + Math.random().toString(36).slice(2, 9),
          withdrawal_id: newWd.id,
          amount: fee,
          created_at: new Date().toISOString(),
        })
        saveMockDb(db)
        return { data: newWd, error: null }
      }

      if (funcName === 'submit_task_proof') {
        if (currentProfile && currentProfile.role !== 'worker') {
          return { data: null, error: { message: 'Unauthorized: Only registered workers can submit task proofs.' } }
        }
        const { p_task_id, p_proof_text, p_proof_url } = params
        const task = db.tasks.find((t) => t.id === p_task_id)
        if (task) {
          task.slots_filled = Math.min(task.slots_total, (task.slots_filled || 0) + 1)
        }
        const newSub = {
          id: 'sub-' + Math.random().toString(36).slice(2, 9),
          task_id: p_task_id,
          worker_id: currentUserId,
          employer_id: task?.employer_id || 'usr-employer-1',
          worker_name: currentProfile?.full_name || 'Worker',
          proof_text: p_proof_text,
          proof_url: p_proof_url,
          status: 'pending',
          rejection_reason: null,
          created_at: new Date().toISOString(),
        }
        db.submissions.unshift(newSub)
        saveMockDb(db)
        return { data: newSub, error: null }
      }

      if (funcName === 'approve_submission') {
        const { p_submission_id } = params
        const sub = db.submissions.find((s) => s.id === p_submission_id)
        if (sub) {
          sub.status = 'approved'
          const task = db.tasks.find((t) => t.id === sub.task_id)
          const worker = db.profiles.find((p) => p.id === sub.worker_id)
          if (worker && task) {
            worker.earnings = (Number(worker.earnings) || 0) + Number(task.reward)
          }
        }
        saveMockDb(db)
        return { data: sub, error: null }
      }

      if (funcName === 'reject_submission') {
        const { p_submission_id, p_rejection_reason } = params
        const sub = db.submissions.find((s) => s.id === p_submission_id)
        if (sub) {
          sub.status = 'rejected'
          sub.rejection_reason = p_rejection_reason || 'Rejected by employer'
        }
        saveMockDb(db)
        return { data: sub, error: null }
      }

      if (funcName === 'admin_approve_deposit') {
        const { p_deposit_id } = params
        const dep = db.deposit_requests.find((d) => d.id === p_deposit_id)
        if (dep) {
          dep.status = 'approved'
          const emp = db.profiles.find((p) => p.id === dep.user_id)
          if (emp) {
            emp.deposited = (Number(emp.deposited) || 0) + Number(dep.amount)
          }
        }
        saveMockDb(db)
        return { data: dep, error: null }
      }

      if (funcName === 'admin_reject_deposit') {
        const { p_deposit_id, p_reason } = params
        const dep = db.deposit_requests.find((d) => d.id === p_deposit_id)
        if (dep) {
          dep.status = 'rejected'
          dep.rejection_reason = p_reason || 'Rejected by admin'
        }
        saveMockDb(db)
        return { data: dep, error: null }
      }

      if (funcName === 'admin_approve_withdrawal') {
        const { p_withdrawal_id } = params
        const wd = db.withdrawals.find((w) => w.id === p_withdrawal_id)
        if (wd) {
          wd.status = 'approved'
        }
        saveMockDb(db)
        return { data: wd, error: null }
      }

      if (funcName === 'admin_reject_withdrawal') {
        const { p_withdrawal_id, p_reason } = params
        const wd = db.withdrawals.find((w) => w.id === p_withdrawal_id)
        if (wd) {
          wd.status = 'rejected'
          wd.rejection_reason = p_reason || 'Rejected by admin'
          const worker = db.profiles.find((p) => p.id === wd.worker_id)
          if (worker) {
            worker.earnings = (Number(worker.earnings) || 0) + Number(wd.amount)
          }
        }
        saveMockDb(db)
        return { data: wd, error: null }
      }

      return { data: null, error: null }
    },

    storage: {
      from(bucket) {
        return {
          async upload(fileName, file, options = {}) {
            return { data: { path: fileName }, error: null }
          },
          getPublicUrl(fileName) {
            return {
              data: {
                publicUrl: 'https://images.unsplash.com/photo-1579389083078-4e7018379f7e?w=800&auto=format&fit=crop&q=80',
              },
            }
          },
        }
      },
    },

    channel(name) {
      const channelObj = {
        on(event, filter, callback) {
          return channelObj
        },
        subscribe() {
          return channelObj
        },
      }
      return channelObj
    },

    removeChannel(channel) {
      // no-op
    },
  }
}

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    })
  : createMockClient()
