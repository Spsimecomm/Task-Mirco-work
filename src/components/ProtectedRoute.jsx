import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';

/**
 * @param {boolean} isAuth - Is the user logged in?
 * @param {string} userRole - Role from the DB profile.
 * @param {Array} allowedRoles - Roles permitted to see this route.
 * @param {boolean} isLoading - Is the profile still being fetched?
 */
const ProtectedRoute = ({ 
  isAuth, 
  userRole, 
  allowedRoles, 
  isLoading, 
  children 
}) => {
  const location = useLocation();

  // 1. Handle the loading state to prevent premature redirects
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-base-950">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-mint-500"></div>
      </div>
    );
  }

  // 2. Redirect to login if not authenticated
  if (!isAuth) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 3. If a specific role is required, strictly verify
  if (allowedRoles && (!userRole || !allowedRoles.includes(userRole))) {
    // If unauthorized role, redirect to role-based dashboard
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

export default ProtectedRoute;
