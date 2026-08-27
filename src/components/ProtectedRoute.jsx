import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Loader as Loader2 } from 'lucide-react'

export default function ProtectedRoute({ children, allowRole }) {
  const { user, role, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-base-950">
        <Loader2 className="animate-spin text-mint-400" size={28} />
      </div>
    )
  }

  // ইউজার লগইন করা না থাকলে লগইন পেজে পাঠাবে
  if (!user) return <Navigate to="/login" replace />

  // যদি রোল ডিফাইন করা থাকে এবং ইউজারের বর্তমান রোলের সাথে না মিলে
  if (allowRole && role && role !== allowRole) {
    if (role === 'admin') return <Navigate to="/admin" replace />
    if (role === 'employer') return <Navigate to="/employer" replace />
    if (role === 'worker') return <Navigate to="/worker" replace />
    return <Navigate to="/" replace />
  }

  return children
}
