
import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Loader as Loader2 } from 'lucide-react'

export default function ProtectedRoute({ children, allowRole }) {
  const { user, role, loading } = useAuth()

  // ১. যতক্ষণ না অ্যাথেন্টিকেশন বা বেসিক লোডিং শেষ হচ্ছে
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-base-950">
        <Loader2 className="animate-spin text-mint-400" size={28} />
      </div>
    )
  }

  // ২. ইউজার লগইন করা না থাকলে সোজা লগইন পেজে
  if (!user) {
    return <Navigate to="/login" replace />
  }

  // ৩. যদি নির্দিষ্ট রোল এলাও করা থাকে এবং ইউজারের রোল অলরেডি লোড হয়ে যায়
  if (allowRole && role) {
    if (role !== allowRole) {
      if (role === 'admin') return <Navigate to="/admin" replace />
      if (role === 'employer') return <Navigate to="/employer" replace />
      if (role === 'worker') return <Navigate to="/worker" replace />
    }
  }

  // ৪. সব ঠিক থাকলে চিলড্রেন রেন্ডার করবে
  return children
}
