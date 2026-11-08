import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import React, { Suspense } from "react";
import { Loader2 } from "lucide-react";

import BackToTop from "./components/BackToTop";

// Lazy loading the pages to split the massive Javascript bundle
const Index = React.lazy(() => import("./pages/Index"));
const AdminAuth = React.lazy(() => import("./pages/AdminAuth"));
const ChurchAdminDashboard = React.lazy(() => import("./pages/ChurchAdminDashboard"));
const SuperAdminDashboard = React.lazy(() => import("./pages/SuperAdminDashboard"));
const NotFound = React.lazy(() => import("./pages/NotFound"));
const Register = React.lazy(() => import("./pages/Register"));
const LiveStream = React.lazy(() => import("./pages/LiveStream"));
const QrScanner = React.lazy(() => import("./pages/QrScanner"));
const Donate = React.lazy(() => import("./pages/Donate"));
const Resources = React.lazy(() => import("./pages/Resources"));
const ShareTestimony = React.lazy(() => import("./pages/ShareTestimony"));
const VerifyEmail = React.lazy(() => import("./pages/VerifyEmail"));

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
      <BrowserRouter>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/live" element={<LiveStream />} />
            <Route path="/donate" element={<Donate />} />
            <Route path="/resources" element={<Resources />} />
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
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
