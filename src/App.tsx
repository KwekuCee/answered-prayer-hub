import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import React, { Suspense } from "react";
import { Loader2 } from "lucide-react";

import BackToTop from "./components/BackToTop";
import OfflineIndicator from "./components/OfflineIndicator";
import RouteErrorBoundary from "./components/RouteErrorBoundary";
import { lazyWithRetry } from "./utils/lazyWithRetry";
import Index from "./pages/Index";
import Register from "./pages/Register";

// Lazy loading secondary pages with retry recovery to split the bundle safely
const AdminAuth = lazyWithRetry(() => import("./pages/AdminAuth"), "AdminAuth");
const ChurchAdminDashboard = lazyWithRetry(() => import("./pages/ChurchAdminDashboard"), "ChurchAdminDashboard");
const SuperAdminDashboard = lazyWithRetry(() => import("./pages/SuperAdminDashboard"), "SuperAdminDashboard");
const NotFound = lazyWithRetry(() => import("./pages/NotFound"), "NotFound");
const LiveStream = lazyWithRetry(() => import("./pages/LiveStream"), "LiveStream");
const QrScanner = lazyWithRetry(() => import("./pages/QrScanner"), "QrScanner");
const Donate = lazyWithRetry(() => import("./pages/Donate"), "Donate");
const Resources = lazyWithRetry(() => import("./pages/Resources"), "Resources");
const Shop = lazyWithRetry(() => import("./pages/Shop"), "Shop");
const ShareTestimony = lazyWithRetry(() => import("./pages/ShareTestimony"), "ShareTestimony");
const VerifyEmail = lazyWithRetry(() => import("./pages/VerifyEmail"), "VerifyEmail");

const queryClient = new QueryClient();

const PageLoader = () => (
  <div className="h-screen w-full flex flex-col items-center justify-center bg-background">
    <Loader2 className="w-10 h-10 animate-spin text-gold" />
    <p className="mt-4 text-foreground/60 font-display animate-pulse">Loading Korle Bu Stands in Worship...</p>
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BackToTop />
      <OfflineIndicator />
      <BrowserRouter>
        <RouteErrorBoundary>
          <Suspense fallback={<PageLoader />}>
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
          </Suspense>
        </RouteErrorBoundary>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
