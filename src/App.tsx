import React from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
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

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" replace />;
};

const AppRoutes = () => {
  return (
    <>
      <SidebarMenu />
      <Routes>
        {/* Public route */}
        <Route path="/login" element={<LoginPage />} />
        
        {/* Protected routes */}
        <Route path="/" element={
          <ProtectedRoute>
            <Index />
          </ProtectedRoute>
        } />
        
        <Route path="/assignments" element={
          <ProtectedRoute>
            <Assignments />
          </ProtectedRoute>
        } />
        
        <Route path="/ratings" element={
          <ProtectedRoute>
            <StaffRatings />
          </ProtectedRoute>
        } />
        
        <Route path="/rate-staff" element={
          <ProtectedRoute>
            <RateStaff />
          </ProtectedRoute>
        } />
        
        <Route path="/analytics" element={
          <ProtectedRoute>
            <Analytics />
          </ProtectedRoute>
        } />
        
        <Route path="/departments" element={
          <ProtectedRoute>
            <DepartmentsPage />
          </ProtectedRoute>
        } />
        
        <Route path="/staff" element={
          <ProtectedRoute>
            <StaffPage />
          </ProtectedRoute>
        } />
        
        <Route path="/manual" element={
          <ProtectedRoute>
            <UserManual />
          </ProtectedRoute>
        } />
        
        {/* Bakery/Kitchen Production Routes */}
        <Route path="/products" element={
          <ProtectedRoute>
            <ProductsPage />
          </ProtectedRoute>
        } />
        
        <Route path="/production" element={
          <ProtectedRoute>
            <ProductionPage />
          </ProtectedRoute>
        } />
        
        <Route path="/stock" element={
          <ProtectedRoute>
            <StockPage />
          </ProtectedRoute>
        } />
        
        <Route path="/promotions" element={
          <ProtectedRoute>
            <PromotionsPage />
          </ProtectedRoute>
        } />
        
        <Route path="/expired" element={
          <ProtectedRoute>
            <ExpiredStockPage />
          </ProtectedRoute>
        } />
        
        {/* Admin-only route */}
        <Route path="/user-management" element={
          <ProtectedRoute>
            <UserManagementPage />
          </ProtectedRoute>
        } />
        
        {/* Catch-all route */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
};

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <BrowserRouter>
          <Toaster />
          <Sonner />
          <AppRoutes />
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
