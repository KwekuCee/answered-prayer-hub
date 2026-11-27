import React from "react";
import { Button } from "@/components/ui/button";

interface RouteErrorBoundaryState {
  hasError: boolean;
}

class RouteErrorBoundary extends React.Component<
  { children: React.ReactNode },
  RouteErrorBoundaryState
> {
  state: RouteErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): RouteErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    console.error("Route loading error:", error);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleHome = () => {
    window.location.assign("/");
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen w-full flex flex-col items-center justify-center bg-background px-6 text-center">
          <div className="max-w-md w-full rounded-3xl border border-gold/30 bg-card/85 backdrop-blur-xl p-8 shadow-2xl space-y-4">
            <h1 className="font-display text-2xl font-bold text-foreground">
              Page Refresh Needed
            </h1>
            <p className="font-body text-sm text-muted-foreground leading-relaxed">
              A newer version of this page is available or your connection was interrupted while loading it.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
              <Button
                onClick={this.handleReload}
                className="bg-gradient-gold text-navy font-semibold shadow-gold hover:opacity-90"
              >
                Reload Page
              </Button>
              <Button variant="outline" onClick={this.handleHome}>
                Back to Home
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default RouteErrorBoundary;
