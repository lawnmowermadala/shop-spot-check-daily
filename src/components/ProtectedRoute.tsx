
import React, { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { toast } from '@/components/ui/sonner';

interface ProtectedRouteProps {
  element: React.ReactNode;
  allowedRoles?: string[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  element, 
  allowedRoles = [] 
}) => {
  const { user, loading } = useAuth();
  const location = useLocation();
  
  useEffect(() => {
    // For redirected users, show a message about why they were redirected
    const from = location.state?.from;
    if (from && user) {
      const roleMessage = allowedRoles.length > 0 && !allowedRoles.includes(user.role) 
        ? `You don't have permission to access ${from}. Redirected to your designated area.`
        : '';
      
      if (roleMessage) {
        toast.info(roleMessage);
      }
    }
  }, [location, user, allowedRoles]);

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
    return <Navigate to="/login" state={{ from: location.pathname }} />;
  }

  // Check role access if allowedRoles is provided and not empty
  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    // Redirect based on user's role
    switch (user.role) {
      case 'admin':
        return <Navigate to="/user-management" state={{ from: location.pathname }} />;
      case 'supervisor':
        return <Navigate to="/products" state={{ from: location.pathname }} />;
      case 'kitchen-staff':
        return <Navigate to="/production" state={{ from: location.pathname }} />;
      default:
        return <Navigate to="/" state={{ from: location.pathname }} />;
    }
  }

  // User has access, render the protected element
  return <>{element}</>;
};

export default ProtectedRoute;
