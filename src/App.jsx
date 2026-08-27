import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './lib/supabase';
import ProtectedRoute from './components/ProtectedRoute';

// Pages
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Auth from './pages/Auth';
import WorkerDashboard from './pages/WorkerDashboard';
import EmployerDashboard from './pages/EmployerDashboard';
import AdminDashboard from './pages/AdminDashboard';

export default function App() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchProfile(session.user.id);
      else setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) fetchProfile(session.user.id);
      else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function fetchProfile(uid) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', uid)
        .single();
      
      if (error) throw error;
      setProfile(data);
    } catch (error) {
      console.error("Error loading profile:", error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-base-950 text-slate-200">
        <Navbar session={session} profile={profile} />
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Home />} />
          <Route path="/auth" element={!session ? <Auth /> : <Navigate to="/dashboard" />} />

          {/* Unified Dashboard Redirector */}
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute isAuth={!!session} userRole={profile?.role} isLoading={loading}>
                {profile?.role === 'employer' ? <EmployerDashboard /> : <WorkerDashboard />}
              </ProtectedRoute>
            } 
          />

          {/* Specific Employer Routes */}
          <Route 
            path="/employer/*" 
            element={
              <ProtectedRoute 
                isAuth={!!session} 
                userRole={profile?.role} 
                allowedRoles={['employer']} 
                isLoading={loading}
              >
                <EmployerDashboard />
              </ProtectedRoute>
            } 
          />

          {/* Specific Admin Routes */}
          <Route 
            path="/admin/*" 
            element={
              <ProtectedRoute 
                isAuth={!!session} 
                userRole={profile?.role} 
                allowedRoles={['admin']} 
                isLoading={loading}
              >
                <AdminDashboard />
              </ProtectedRoute>
            } 
          />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
