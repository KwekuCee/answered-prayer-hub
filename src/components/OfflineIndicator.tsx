import React from "react";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { WifiOff } from "lucide-react";

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="fixed bottom-4 left-4 z-50 flex items-center gap-2 rounded-xl bg-zinc-900/90 border border-gold/40 backdrop-blur-md px-4 py-2.5 text-xs font-medium text-foreground shadow-2xl animate-fade-up">
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-gold opacity-75"></span>
        <span className="relative inline-flex rounded-full h-2 w-2 bg-gold"></span>
      </span>
      <WifiOff className="w-4 h-4 text-gold" />
      <span>Offline Mode — Showing cached resources & testimonies.</span>
    </div>
  );
};

export default OfflineIndicator;
