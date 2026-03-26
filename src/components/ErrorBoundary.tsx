import React from "react";

type State = { hasError: boolean };

export default class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: any, info: any) {
    // Log to console; keep lightweight to avoid adding telemetry
    console.error("ErrorBoundary caught:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 bg-card/80 rounded-2xl border border-border/50 text-center">
          <p className="text-foreground font-semibold">Map failed to load.</p>
          <p className="text-muted-foreground text-sm">We're working on it — try reloading the page.</p>
        </div>
      );
    }

    return this.props.children as React.ReactElement;
  }
}
