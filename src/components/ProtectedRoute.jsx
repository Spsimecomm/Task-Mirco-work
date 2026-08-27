import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Loader as Loader2 } from 'lucide-react'

export default function ProtectedRoute({ children, allowRole }) {
  const { user, role, loading } = useAuth()

  // ডাটা লোড হওয়া পর্যন্ত লোডার দেখাবে, পেজ রেন্ডার করবে না
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-base-950">
        <Loader2 className="animate-spin text-mint-400" size={28} />
      </div>
    )
  }

  // ইউজার লগইন না থাকলে লগইন পেজে পাঠাবে
  if (!user) return <Navigate to="/login" replace />

  // যদি রোল লোড হয়ে থাকে কিন্তু কাঙ্ক্ষিত রোলের সাথে না মিলে
  if (allowRole && role && role !== allowRole) {
    const targetPath = role === 'admin' ? '/admin' : role === 'employer' ? '/employer' : '/worker'
    return <Navigate to={targetPath} replace />
  }

  // যদি কোনো কারণে রোল ফেচ হতে দেরি হয় বা না পাওয়া যায়, তবুও সেফটির জন্য হোম বা লগইনে পাঠাবে
  if (allowRole && !role) {
    return <Navigate to="/login" replace />
  }

  return children
}
