// src/App.tsx
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
import StaffPage from "./pages/StaffPage";
import DepartmentsPage from "./pages/DepartmentsPage";

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
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/assignments" element={<Assignments />} />
          <Route path="/ratings" element={<StaffRatings />} />
          <Route path="/rate-staff" element={<RateStaff />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/staff" element={<StaffPage />} />
          <Route path="/departments" element={<DepartmentsPage />} />
          {/* Keep this last */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
