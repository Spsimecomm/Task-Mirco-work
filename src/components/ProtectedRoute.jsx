import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Loader as Loader2 } from 'lucide-react'

export default function ProtectedRoute({ children, allowRole }) {
  const { user, role, loading } = useAuth()

  // ১. AuthContext থেকে ডাটা লোড না হওয়া পর্যন্ত ওয়েট করবে
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-base-950">
        <Loader2 className="animate-spin text-mint-400" size={28} />
      </div>
    )
  }

  // ২. লগইন করা না থাকলে সোজা লগইন পেজে
  if (!user) {
    return <Navigate to="/login" replace />
  }

  // ৩. ইউজার লগইন আছে কিন্তু প্রোফাইল থেকে role এখনো এসে পৌঁছায়নি -> অপেক্ষা করাবে (পেজ ঢুকতে দেবে না)
  if (allowRole && !role) {
    return (
      <div className="flex h-screen items-center justify-center bg-base-950">
        <Loader2 className="animate-spin text-mint-400" size={28} />
      </div>
    )
  }

  // ৪. ইউজারের রোল চলে এসেছে, কিন্তু সে যদি অন্য রোলের পেজে ঢুকতে চেষ্টা করে
  if (allowRole && role && role !== allowRole) {
    if (role === 'admin') return <Navigate to="/admin" replace />
    if (role === 'employer') return <Navigate to="/employer" replace />
    if (role === 'worker') return <Navigate to="/worker" replace />
    return <Navigate to="/" replace />
  }

  // ৫. সব সিকিউরিটি পাস করলেই কেবল পেজ দেখাবে
  return children
}
