
import React from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Index from "./pages/Index";
import Assignments from "./pages/Assignments";
import StaffRatings from "./pages/StaffRatings";
import RateStaff from "./pages/RateStaff";
import Analytics from "./pages/Analytics";
import NotFound from "./pages/NotFound";
import DepartmentsPage from "./pages/DepartmentsPage";
import StaffPage from "./pages/StaffPage";
import UserManual from "./pages/UserManual";
import SidebarMenu from "./components/SidebarMenu";
import ProductsPage from "./pages/ProductsPage";
import ProductionPage from "./pages/ProductionPage"; 
import StockPage from "./pages/StockPage";
import PromotionsPage from "./pages/PromotionsPage";
import ExpiredStockPage from "./pages/ExpiredStockPage";
import UserManagementPage from "./pages/UserManagementPage";
import LoginPage from "./pages/LoginPage";
import ProtectedRoute from "./components/ProtectedRoute";
import { AuthProvider, useAuth } from "./context/AuthContext";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// Landing page that redirects based on auth status and role
const LandingPage = () => {
  const { user } = useAuth();
  
  if (!user) return <Navigate to="/login" />;
  
  // Redirect based on user role
  switch (user.role) {
    case 'admin':
      return <Navigate to="/user-management" />;
    case 'supervisor':
      return <Navigate to="/products" />;
    case 'kitchen-staff':
      return <Navigate to="/production" />;
    default:
      return <Navigate to="/login" />;
  }
};

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <BrowserRouter>
            <Toaster />
            <Sonner />
            <SidebarMenu />
            <Routes>
              {/* Public Routes */}
              <Route path="/login" element={<LoginPage />} />
              
              {/* Root redirects based on auth status and role */}
              <Route path="/" element={<LandingPage />} />
              
              {/* Old Pages - Restricted to Admin */}
              <Route path="/assignments" element={<ProtectedRoute element={<Assignments />} allowedRoles={['admin']} />} />
              <Route path="/ratings" element={<ProtectedRoute element={<StaffRatings />} allowedRoles={['admin']} />} />
              <Route path="/rate-staff" element={<ProtectedRoute element={<RateStaff />} allowedRoles={['admin']} />} />
              <Route path="/departments" element={<ProtectedRoute element={<DepartmentsPage />} allowedRoles={['admin']} />} />
              <Route path="/staff" element={<ProtectedRoute element={<StaffPage />} allowedRoles={['admin']} />} />
              
              {/* Role Protected Routes */}
              <Route path="/analytics" element={<ProtectedRoute element={<Analytics />} allowedRoles={['admin', 'supervisor']} />} />
              <Route path="/manual" element={<ProtectedRoute element={<UserManual />} allowedRoles={['admin', 'supervisor', 'kitchen-staff']} />} />
              
              {/* Kitchen/Bakery Routes */}
              <Route path="/products" element={<ProtectedRoute element={<ProductsPage />} allowedRoles={['admin', 'supervisor']} />} />
              <Route path="/production" element={<ProtectedRoute element={<ProductionPage />} allowedRoles={['admin', 'supervisor', 'kitchen-staff']} />} />
              <Route path="/stock" element={<ProtectedRoute element={<StockPage />} allowedRoles={['admin', 'supervisor']} />} />
              <Route path="/promotions" element={<ProtectedRoute element={<PromotionsPage />} allowedRoles={['admin', 'supervisor']} />} />
              <Route path="/expired" element={<ProtectedRoute element={<ExpiredStockPage />} allowedRoles={['admin', 'supervisor', 'kitchen-staff']} />} />
              <Route path="/user-management" element={<ProtectedRoute element={<UserManagementPage />} allowedRoles={['admin']} />} />
              
              {/* Catch-All Route */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
