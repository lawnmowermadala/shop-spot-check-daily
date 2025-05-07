
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface ProtectedRouteProps {
  element: React.ReactNode;
  allowedRoles?: string[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  element, 
  allowedRoles = [] 
}) => {
  const { user, loading } = useAuth();

  // Show loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  // Not logged in - redirect to login
  if (!user) {
    return <Navigate to="/login" />;
  }

  // Check role access if allowedRoles is provided and not empty
  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    // Redirect based on user's role
    switch (user.role) {
      case 'admin':
        return <Navigate to="/user-management" />;
      case 'supervisor':
        return <Navigate to="/products" />;
      case 'kitchen-staff':
        return <Navigate to="/production" />;
      default:
        return <Navigate to="/" />;
    }
  }

  // User has access, render the protected element
  return <>{element}</>;
};

export default ProtectedRoute;
