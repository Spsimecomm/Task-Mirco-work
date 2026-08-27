import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)

// ============================================================================
// In-Memory Mock Database & Service (Used when Supabase credentials are unset)
// ============================================================================

const STORAGE_KEY = 'taskly_mock_db_v1'

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
      description: 'Visit our Facebook page, click the Follow button, and publicly share the pinned post to your personal timeline.',
      proof_instructions: 'Provide your Facebook profile link and a screenshot of the shared post on your timeline.',
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
      description: 'Download the app from Google Play, complete phone number registration, and verify OTP.',
      proof_instructions: 'Submit the screenshot of your profile screen showing the verified badge and your user ID.',
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
      description: 'Watch the entire video without skipping, hit like, subscribe to channel, and write a 10+ word relevant comment.',
      proof_instructions: 'Send your YouTube channel username and a screenshot of your comment on the video.',
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
      description: 'Extract title, current price, SKU, and category from 10 specified product links into the provided template.',
      proof_instructions: 'Provide the view-only link to your completed Google Sheet.',
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
      user_id: 'usr-employer-1',
      title: 'New Proof Submitted',
      message: 'Worker Tanvir Ahmed submitted proof for your task: "Follow our official Facebook page & share latest post"',
      type: 'submission',
      link: '/review-submissions',
      is_read: false,
      created_at: new Date(Date.now() - 3600000 * 4).toISOString(),
    },
    {
      id: 'notif-2',
      user_id: 'usr-worker-1',
      title: 'Submission Approved! 🎉',
      message: 'Your submission for "Watch 3-minute tech review video" was approved. +$0.45 added to your earnings!',
      type: 'approval',
      link: '/my-submissions',
      is_read: true,
      created_at: new Date(Date.now() - 86400000 * 1).toISOString(),
    },
  ],
}

function getStoredMockDb() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
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
const realtimeListeners = new Set()

function notifyAuth(event, session) {
  authListeners.forEach((cb) => {
    try {
      cb(event, session)
    } catch (e) {
      console.error(e)
    }
  })
}

function broadcastRealtimeChange(table, eventType, record) {
  realtimeListeners.forEach((listener) => {
    try {
      if (listener.table === table && (listener.event === '*' || listener.event === eventType)) {
        listener.callback({
          eventType,
          new: record,
          old: eventType === 'DELETE' ? record : null,
          table,
          schema: 'public',
        })
      }
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
          db[table] = [...inserted, ...items]
          saveMockDb(db)
          inserted.forEach((row) => broadcastRealtimeChange(table, 'INSERT', row))
          return { data: Array.isArray(payload) ? inserted : inserted[0], error: null }
        }

        if (operation === 'update') {
          let updatedRows = []
          db[table] = items.map((item) => {
            const matches = filters.every(({ col, val }) => {
              if (typeof val === 'boolean') return Boolean(item[col]) === val
              return String(item[col]) === String(val)
            })
            if (matches) {
              const updated = { ...item, ...payload }
              updatedRows.push(updated)
              return updated
            }
            return item
          })
          saveMockDb(db)
          updatedRows.forEach((row) => broadcastRealtimeChange(table, 'UPDATE', row))
          return { data: payload, error: null }
        }

        if (operation === 'delete') {
          const toDelete = items.filter((item) => filters.every(({ col, val }) => {
            if (typeof val === 'boolean') return Boolean(item[col]) === val
            return String(item[col]) === String(val)
          }))
          db[table] = items.filter((item) => !filters.every(({ col, val }) => {
            if (typeof val === 'boolean') return Boolean(item[col]) === val
            return String(item[col]) === String(val)
          }))
          saveMockDb(db)
          toDelete.forEach((row) => broadcastRealtimeChange(table, 'DELETE', row))
          return { data: null, error: null }
        }

        // SELECT query
        let result = items.filter((item) => {
          return filters.every(({ col, val }) => {
            if (typeof val === 'boolean') return Boolean(item[col]) === val
            return String(item[col]) === String(val)
          })
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
          filters.push({ col, val })
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
        const { p_amount, p_method, p_account } = params
        const reqAmt = Number(p_amount)
        const fee = Math.round(reqAmt * 0.02 * 100) / 100
        const netAmount = Math.max(0, reqAmt - fee)

        if (currentProfile) {
          currentProfile.earnings = Math.max(0, (Number(currentProfile.earnings) || 0) - reqAmt)
        }

        const newWd = {
          id: 'wd-' + Math.random().toString(36).slice(2, 9),
          worker_id: currentUserId,
          worker_name: currentProfile?.full_name || 'Worker',
          amount: reqAmt,
          method: p_method,
          account: p_account,
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
        const { p_task_id, p_proof_text, p_proof_url } = params
        const task = db.tasks.find((t) => t.id === p_task_id)
        if (task) {
          task.slots_filled = Math.min(task.slots_total, (task.slots_filled || 0) + 1)
        }
        const employerId = task?.employer_id || 'usr-employer-1'
        const workerName = currentProfile?.full_name || 'Worker'
        const newSub = {
          id: 'sub-' + Math.random().toString(36).slice(2, 9),
          task_id: p_task_id,
          worker_id: currentUserId,
          employer_id: employerId,
          worker_name: workerName,
          proof_text: p_proof_text,
          proof_url: p_proof_url,
          status: 'pending',
          rejection_reason: null,
          created_at: new Date().toISOString(),
        }
        db.submissions.unshift(newSub)

        // Create Real-time Notification for Employer
        const newNotif = {
          id: 'notif-' + Math.random().toString(36).slice(2, 9),
          user_id: employerId,
          title: 'New Proof Submitted',
          message: `Worker ${workerName} submitted proof for your task: "${task?.title || 'Task'}"`,
          type: 'submission',
          link: '/review-submissions',
          is_read: false,
          created_at: new Date().toISOString(),
        }
        if (!db.notifications) db.notifications = []
        db.notifications.unshift(newNotif)

        saveMockDb(db)
        broadcastRealtimeChange('tasks', 'UPDATE', task)
        broadcastRealtimeChange('submissions', 'INSERT', newSub)
        broadcastRealtimeChange('notifications', 'INSERT', newNotif)
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

          // Create notification for worker
          const notif = {
            id: 'notif-' + Math.random().toString(36).slice(2, 9),
            user_id: sub.worker_id,
            title: 'Submission Approved! 🎉',
            message: `Your submission for "${task?.title || 'Task'}" was approved. +$${Number(task?.reward || 0).toFixed(2)} added to your earnings!`,
            type: 'approval',
            link: '/my-submissions',
            is_read: false,
            created_at: new Date().toISOString(),
          }
          if (!db.notifications) db.notifications = []
          db.notifications.unshift(notif)

          saveMockDb(db)
          broadcastRealtimeChange('submissions', 'UPDATE', sub)
          broadcastRealtimeChange('notifications', 'INSERT', notif)
        }
        return { data: sub, error: null }
      }

      if (funcName === 'reject_submission') {
        const { p_submission_id, p_rejection_reason } = params
        const sub = db.submissions.find((s) => s.id === p_submission_id)
        if (sub) {
          sub.status = 'rejected'
          sub.rejection_reason = p_rejection_reason || 'Rejected by employer'
          const task = db.tasks.find((t) => t.id === sub.task_id)
          if (task) {
            task.slots_filled = Math.max(0, (task.slots_filled || 1) - 1)
          }

          // Create notification for worker
          const notif = {
            id: 'notif-' + Math.random().toString(36).slice(2, 9),
            user_id: sub.worker_id,
            title: 'Submission Update',
            message: `Your submission for "${task?.title || 'Task'}" was rejected. Reason: ${p_rejection_reason || 'Did not meet requirements'}`,
            type: 'rejection',
            link: '/my-submissions',
            is_read: false,
            created_at: new Date().toISOString(),
          }
          if (!db.notifications) db.notifications = []
          db.notifications.unshift(notif)

          saveMockDb(db)
          broadcastRealtimeChange('submissions', 'UPDATE', sub)
          broadcastRealtimeChange('notifications', 'INSERT', notif)
        }
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
      const channelListeners = []
      const channelObj = {
        on(event, filter, callback) {
          const handler = {
            channelName: name,
            event: filter.event || '*',
            table: filter.table || '*',
            filter: filter.filter || null,
            callback,
          }
          channelListeners.push(handler)
          return channelObj
        },
        subscribe(statusCallback) {
          channelListeners.forEach((listener) => {
            realtimeListeners.add(listener)
          })
          if (typeof statusCallback === 'function') {
            statusCallback('SUBSCRIBED')
          }
          return channelObj
        },
        unsubscribe() {
          channelListeners.forEach((listener) => {
            realtimeListeners.delete(listener)
          })
        },
      }
      return channelObj
    },

    removeChannel(channel) {
      if (channel && typeof channel.unsubscribe === 'function') {
        channel.unsubscribe()
      }
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
