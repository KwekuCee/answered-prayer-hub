import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import AdminAuth from "./pages/AdminAuth";
import ChurchAdminDashboard from "./pages/ChurchAdminDashboard";
import SuperAdminDashboard from "./pages/SuperAdminDashboard";
import NotFound from "./pages/NotFound";
import Register from "./pages/Register";
import LiveStream from "./pages/LiveStream";
import QrScanner from "./pages/QrScanner";
import Donate from "./pages/Donate";
import Resources from "./pages/Resources";


import BackToTop from "./components/BackToTop";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BackToTop />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/live" element={<LiveStream />} />
          <Route path="/donate" element={<Donate />} />
          <Route path="/resources" element={<Resources />} />
          <Route path="/admin/scanner" element={<QrScanner />} />
          <Route path="/register" element={<Register />} />
          <Route path="/admin" element={<AdminAuth />} />
          <Route path="/church-admin" element={<ChurchAdminDashboard />} />
          <Route path="/super-admin" element={<SuperAdminDashboard />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
