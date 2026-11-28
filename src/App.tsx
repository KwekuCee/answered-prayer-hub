import { Suspense } from "react";
import { lazyWithRetry } from "./utils/lazyWithRetry";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import BackToTop from "./components/BackToTop";
import OfflineIndicator from "./components/OfflineIndicator";
import DeploymentUpdatePrompt from "./components/DeploymentUpdatePrompt";
import LiveQueryRefresh from "./components/LiveQueryRefresh";
import RouteErrorBoundary from "./components/RouteErrorBoundary";

const Index = lazyWithRetry(() => import("./pages/Index"), "Index");
const Register = lazyWithRetry(() => import("./pages/Register"), "Register");
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

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 10_000,
      gcTime: 5 * 60 * 1000,
      refetchOnWindowFocus: true,
      refetchOnReconnect: "always",
      retry: 1,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BackToTop />
      <OfflineIndicator />
      <DeploymentUpdatePrompt />
      <LiveQueryRefresh />
      <BrowserRouter>
        <RouteErrorBoundary>
          <Suspense
            fallback={
              <div role="status" aria-live="polite" className="grid min-h-[50vh] place-items-center bg-background">
                <span className="sr-only">Loading page</span>
                <span aria-hidden="true" className="h-8 w-8 animate-spin rounded-full border-2 border-gold/30 border-t-gold" />
              </div>
            }
          >
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
