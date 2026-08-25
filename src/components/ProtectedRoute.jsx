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

  if (!user) return <Navigate to="/login" replace />

  if (allowRole) {
    // FAIL-CLOSED: if the role hasn't resolved for some reason (missing
    // profile row, failed fetch, etc.), do NOT fall through and render
    // the protected page. Previously `role && role !== allowRole` was
    // false whenever `role` was null/undefined, which silently let
    // anyone through to any role-gated page (e.g. typing /employer in
    // the URL bar). Now an unresolved role is treated as "not allowed".
    if (!role) return <Navigate to="/login" replace />

    if (role !== allowRole) {
      if (role === 'admin') return <Navigate to="/admin" replace />
      return <Navigate to={role === 'employer' ? '/employer' : '/worker'} replace />
    }
  }

  return children
}
