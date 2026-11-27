import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import BackToTop from "./components/BackToTop";
import OfflineIndicator from "./components/OfflineIndicator";
import RouteErrorBoundary from "./components/RouteErrorBoundary";
import Index from "./pages/Index";
import Register from "./pages/Register";
import AdminAuth from "./pages/AdminAuth";
import ChurchAdminDashboard from "./pages/ChurchAdminDashboard";
import SuperAdminDashboard from "./pages/SuperAdminDashboard";
import NotFound from "./pages/NotFound";
import LiveStream from "./pages/LiveStream";
import QrScanner from "./pages/QrScanner";
import Donate from "./pages/Donate";
import Resources from "./pages/Resources";
import Shop from "./pages/Shop";
import ShareTestimony from "./pages/ShareTestimony";
import VerifyEmail from "./pages/VerifyEmail";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BackToTop />
      <OfflineIndicator />
      <BrowserRouter>
        <RouteErrorBoundary>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/live" element={<LiveStream />} />
            <Route path="/donate" element={<Donate />} />
            <Route path="/resources" element={<Resources />} />
            <Route path="/shop" element={<Shop />} />
            <Route path="/admin/scanner" element={<QrScanner />} />
            <Route path="/register" element={<Register />} />
            <Route path="/share-testimony" element={<ShareTestimony />} />
            <Route path="/admin" element={<AdminAuth />} />
            <Route path="/church-admin" element={<ChurchAdminDashboard />} />
            <Route path="/super-admin" element={<SuperAdminDashboard />} />
            <Route path="/verify-email" element={<VerifyEmail />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </RouteErrorBoundary>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
