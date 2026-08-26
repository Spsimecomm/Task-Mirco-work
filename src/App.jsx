import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { Loader as Loader2 } from 'lucide-react'
import { useAuth } from './context/AuthContext'
import Navbar from './components/Navbar'
import ProtectedRoute from './components/ProtectedRoute'

import Home from './pages/Home'
import About from './pages/About'
import HowItWorks from './pages/HowItWorks'
import FAQ from './pages/FAQ'
import Login from './pages/Login'
import Register from './pages/Register'
import WorkerDashboard from './pages/WorkerDashboard'
import EmployerDashboard from './pages/EmployerDashboard'
import Marketplace from './pages/Marketplace'
import TaskDetail from './pages/TaskDetail'
import CreateTask from './pages/CreateTask'
import MySubmissions from './pages/MySubmissions'
import ReviewSubmissions from './pages/ReviewSubmissions'
import Deposit from './pages/Deposit'
import Withdraw from './pages/Withdraw'
import AdminDashboard from './pages/AdminDashboard'

function RoleRedirect() {
  const { user, role, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-base-950">
        <Loader2 className="animate-spin text-mint-400" size={28} />
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />

  if (role === 'admin') return <Navigate to="/admin" replace />

  return (
    <Navigate
      to={role === 'employer' ? '/employer' : '/worker'}
      replace
    />
  )
}

export default function App() {
  return (
    <div className="min-h-screen bg-base-950">
      <Navbar />

      <Routes>
        {/* ================================
            Public Pages
        ================================= */}

        <Route path="/" element={<Home />} />

        <Route path="/about" element={<About />} />

        <Route path="/how-it-works" element={<HowItWorks />} />

        <Route path="/faq" element={<FAQ />} />

        <Route path="/login" element={<Login />} />

        <Route path="/register" element={<Register />} />

        {/* ================================
            Worker Pages
        ================================= */}

        <Route
          path="/worker"
          element={
            <ProtectedRoute allowRole="worker">
              <WorkerDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/marketplace"
          element={
            <ProtectedRoute allowRole="worker">
              <Marketplace />
            </ProtectedRoute>
          }
        />

        <Route
          path="/task/:id"
          element={
            <ProtectedRoute allowRole="worker">
              <TaskDetail />
            </ProtectedRoute>
          }
        />

        <Route
          path="/my-submissions"
          element={
            <ProtectedRoute allowRole="worker">
              <MySubmissions />
            </ProtectedRoute>
          }
        />

        <Route
          path="/withdraw"
          element={
            <ProtectedRoute allowRole="worker">
              <Withdraw />
            </ProtectedRoute>
          }
        />

        {/* ================================
            Employer Pages
        ================================= */}

        <Route
          path="/employer"
          element={
            <ProtectedRoute allowRole="employer">
              <EmployerDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/create-task"
          element={
            <ProtectedRoute allowRole="employer">
              <CreateTask />
            </ProtectedRoute>
          }
        />

        <Route
          path="/review-submissions"
          element={
            <ProtectedRoute allowRole="employer">
              <ReviewSubmissions />
            </ProtectedRoute>
          }
        />

        <Route
          path="/deposit"
          element={
            <ProtectedRoute allowRole="employer">
              <Deposit />
            </ProtectedRoute>
          }
        />

        {/* ================================
            Admin
        ================================= */}

        <Route
          path="/admin"
          element={
            <ProtectedRoute allowRole="admin">
              <AdminDashboard />
            </ProtectedRoute>
          }
        />

        {/* ================================
            Fallback
        ================================= */}

        <Route
          path="*"
          element={<Navigate to="/" replace />}
        />
      </Routes>
    </div>
  )
}
