
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
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

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <SidebarMenu />
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/assignments" element={<Assignments />} />
          <Route path="/ratings" element={<StaffRatings />} />
          <Route path="/rate-staff" element={<RateStaff />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/departments" element={<DepartmentsPage />} />
          <Route path="/staff" element={<StaffPage />} />
          <Route path="/manual" element={<UserManual />} />
          
          {/* New Bakery/Kitchen Production Routes */}
          <Route path="/products" element={<ProductsPage />} />
          <Route path="/production" element={<ProductionPage />} />
          <Route path="/stock" element={<StockPage />} />
          <Route path="/promotions" element={<PromotionsPage />} />
          <Route path="/expired" element={<ExpiredStockPage />} />
          
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
