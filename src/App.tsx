// src/App.tsx
// ... (keep existing imports)
import StaffPage from "./pages/StaffPage";
import DepartmentsPage from "./pages/DepartmentsPage";

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
          {/* Add these new routes */}
          <Route path="/staff" element={<StaffPage />} />
          <Route path="/departments" element={<DepartmentsPage />} />
          {/* Keep this last */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);
