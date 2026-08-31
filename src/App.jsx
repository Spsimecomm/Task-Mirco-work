import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import AppLayout from './components/AppLayout'

// Pages
import Home from './pages/Home'
import Login from './pages/Login'
import Register from './pages/Register'
import About from './pages/About'
import FAQ from './pages/FAQ'
import HowItWorks from './pages/HowItWorks'
import Marketplace from './pages/Marketplace'
import TaskDetail from './pages/TaskDetail'
import WorkerDashboard from './pages/WorkerDashboard'
import MySubmissions from './pages/MySubmissions'
import Withdraw from './pages/Withdraw'
import EmployerDashboard from './pages/EmployerDashboard'
import CreateTask from './pages/CreateTask'
import ReviewSubmissions from './pages/ReviewSubmissions'
import Deposit from './pages/Deposit'
import AdminDashboard from './pages/AdminDashboard'
import Referrals from './pages/Referrals'

export default function App() {
  const { session, profile, role, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-base-950 text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-mint-400 border-t-transparent"></div>
          <p className="text-sm text-white/60">Loading Taskly...</p>
        </div>
      </div>
    )
  }

  return (
    <AppLayout>
      <Routes>
        {/* Public Informational Pages */}
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/faq" element={<FAQ />} />
        <Route path="/how-it-works" element={<HowItWorks />} />

        {/* Auth Pages */}
        <Route
          path="/auth"
          element={!session ? <Login /> : <Navigate to="/dashboard" replace />}
        />
        <Route
          path="/login"
          element={!session ? <Login /> : <Navigate to="/dashboard" replace />}
        />
        <Route
          path="/register"
          element={!session ? <Register /> : <Navigate to="/dashboard" replace />}
        />

        {/* Unified Dashboard */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute isAuth={!!session} userRole={role} isLoading={loading}>
              {role === 'admin' ? (
                <AdminDashboard />
              ) : role === 'employer' ? (
                <EmployerDashboard />
              ) : (
                <WorkerDashboard />
              )}
            </ProtectedRoute>
          }
        />

        {/* Worker Routes */}
        <Route
          path="/worker"
          element={
            <ProtectedRoute
              isAuth={!!session}
              userRole={role}
              allowedRoles={['worker']}
              isLoading={loading}
            >
              <WorkerDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/marketplace"
          element={
            <ProtectedRoute
              isAuth={!!session}
              userRole={role}
              allowedRoles={['worker']}
              isLoading={loading}
            >
              <Marketplace />
            </ProtectedRoute>
          }
        />
        <Route
          path="/task/:id"
          element={
            <ProtectedRoute
              isAuth={!!session}
              userRole={role}
              allowedRoles={['worker']}
              isLoading={loading}
            >
              <TaskDetail />
            </ProtectedRoute>
          }
        />
        <Route
          path="/tasks/:id"
          element={
            <ProtectedRoute
              isAuth={!!session}
              userRole={role}
              allowedRoles={['worker']}
              isLoading={loading}
            >
              <TaskDetail />
            </ProtectedRoute>
          }
        />
        <Route
          path="/my-submissions"
          element={
            <ProtectedRoute
              isAuth={!!session}
              userRole={role}
              allowedRoles={['worker']}
              isLoading={loading}
            >
              <MySubmissions />
            </ProtectedRoute>
          }
        />
        <Route
          path="/withdraw"
          element={
            <ProtectedRoute
              isAuth={!!session}
              userRole={role}
              allowedRoles={['worker']}
              isLoading={loading}
            >
              <Withdraw />
            </ProtectedRoute>
          }
        />

        {/* Employer Routes */}
        <Route
          path="/employer"
          element={
            <ProtectedRoute
              isAuth={!!session}
              userRole={role}
              allowedRoles={['employer']}
              isLoading={loading}
            >
              <EmployerDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/create-task"
          element={
            <ProtectedRoute
              isAuth={!!session}
              userRole={role}
              allowedRoles={['employer']}
              isLoading={loading}
            >
              <CreateTask />
            </ProtectedRoute>
          }
        />
        <Route
          path="/review-submissions"
          element={
            <ProtectedRoute
              isAuth={!!session}
              userRole={role}
              allowedRoles={['employer']}
              isLoading={loading}
            >
              <ReviewSubmissions />
            </ProtectedRoute>
          }
        />
        <Route
          path="/deposit"
          element={
            <ProtectedRoute
              isAuth={!!session}
              userRole={role}
              allowedRoles={['employer']}
              isLoading={loading}
            >
              <Deposit />
            </ProtectedRoute>
          }
        />

        {/* Admin Routes */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute
              isAuth={!!session}
              userRole={role}
              allowedRoles={['admin']}
              isLoading={loading}
            >
              <AdminDashboard />
            </ProtectedRoute>
          }
        />

        {/* Refer & Earn Routes (All Authenticated Roles) */}
        <Route
          path="/referrals"
          element={
            <ProtectedRoute
              isAuth={!!session}
              userRole={role}
              allowedRoles={['worker', 'employer', 'admin']}
              isLoading={loading}
            >
              <Referrals />
            </ProtectedRoute>
          }
        />
        <Route
          path="/refer-and-earn"
          element={
            <ProtectedRoute
              isAuth={!!session}
              userRole={role}
              allowedRoles={['worker', 'employer', 'admin']}
              isLoading={loading}
            >
              <Referrals />
            </ProtectedRoute>
          }
        />

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppLayout>
  )
}
