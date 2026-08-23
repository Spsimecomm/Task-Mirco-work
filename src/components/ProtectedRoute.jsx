import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Loader2 } from 'lucide-react'

export default function ProtectedRoute({ children, allowRole }) {
  const { user, role, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-base-950">
        <Loader2 className="animate-spin text-mint-400" size={28} />
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />

  if (allowRole && role && role !== allowRole) {
    return <Navigate to={role === 'employer' ? '/employer' : '/worker'} replace />
  }

  return children
}
