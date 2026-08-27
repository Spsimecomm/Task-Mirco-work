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

  // যদি ইউজার লগইন করা না থাকে
  if (!user) return <Navigate to="/login" replace />

  // যদি রোল লোড না হয়ে থাকে বা allowRole এর সাথে না মিলে
  if (allowRole) {
    // যদি রোল এখনো ফেচ না হয়ে থাকে, একটু অপেক্ষা বা রিডাইরেক্ট করতে হবে
    if (!role) {
      return <Navigate to="/login" replace />
    }

    if (role !== allowRole) {
      if (role === 'admin') return <Navigate to="/admin" replace />
      return <Navigate to={role === 'employer' ? '/employer' : '/worker'} replace />
    }
  }

  return children
}
