import { Link } from "react-router-dom";
import { ChevronDown } from "lucide-react";

/** Cinematic full-screen hero with only the call-to-action buttons. */
const HeroSection = () => {
  return (
    <div className="relative min-h-screen pt-32 md:pt-36 flex items-center overflow-hidden bg-navy">
      {/* Slow cinematic zoom on background */}
      <div className="absolute inset-0 hero-bg animate-[heroZoom_20s_ease-out_forwards]" />
      <div className="absolute inset-0 bg-gradient-to-b from-background/70 via-background/20 to-background" />
      <div className="absolute inset-0 bg-gradient-to-r from-background/80 via-transparent to-transparent" />

      <div className="relative z-10 w-full flex items-center justify-center">
        <div className="flex flex-wrap justify-center gap-4 animate-fade-up">
          <Link to="/register" className="px-8 py-4 rounded-full bg-gradient-gold text-navy font-bold font-body shadow-gold hover:-translate-y-1 transition-all">
            Register Now
          </Link>
          <Link to="/admin" className="px-8 py-4 rounded-full border border-foreground/30 backdrop-blur-md text-foreground font-bold font-body hover:border-gold hover:text-gold transition-all">
            Login
          </Link>
        </div>
      </div>

      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center text-foreground/60 text-[10px] uppercase tracking-[0.3em] animate-bounce">
        Scroll <ChevronDown className="w-4 h-4" />
      </div>
    </div>
  );
};

export default HeroSection;
