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
    const targetPath = role === 'admin' ? '/admin' : role === 'employer' ? '/employer' : '/worker'
    
    // ব্রাউজারকে ফুল রিলোড করে সঠিক ড্যাশবোর্ডে পাঠিয়ে দেবে (ক্যাশ বাইপাস করার জন্য)
    window.location.href = targetPath
    return null
  }

  return children
}
