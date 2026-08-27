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

  // যদি নির্দিষ্ট রোল এলাو করা থাকে এবং ইউজারের রোল লোড হয়ে থাকে
  if (allowRole && role && role !== allowRole) {
    if (role === 'admin') return <Navigate to="/admin" replace />
    return <Navigate to={role === 'employer' ? '/employer' : '/worker'} replace />
  }

  return children
}
