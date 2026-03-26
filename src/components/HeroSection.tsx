import logo from "@/assets/logo.png";
import { Link } from "react-router-dom";

const HeroSection = () => {
  return (
    <div className="relative min-h-[70vh] flex items-center justify-center overflow-hidden bg-navy hero-bg">

      {/* Overlay gradient for readability */}
      <div className="absolute inset-0 bg-gradient-to-b from-navy/60 via-navy/30 to-background/90" />

      {/* Content */}
      <div className="relative z-10 text-center px-4 max-w-3xl mx-auto animate-fade-up hero-content">
        <div className="relative inline-block mb-6">
          {/* Logo Glow/Bloom Effect */}
          <div className="absolute inset-0 bg-gold blur-[40px] opacity-30 rounded-full scale-110 animate-pulse-slow"></div>
          <img src={logo} alt="100% Answered Prayer" className="relative w-64 md:w-80 mx-auto drop-shadow-2xl" />
        </div>

        <p className="text-lg md:text-xl text-primary-foreground/90 font-body max-w-xl mx-auto mb-8 drop-shadow-md">
          Register for the program, invite others, and be part of a movement
          that transforms lives through the power of prayer.
        </p>
        <div className="flex flex-wrap gap-4 justify-center">
          <Link
            to="/register"
            className="px-8 py-3 rounded-lg bg-gradient-gold text-accent-foreground font-semibold font-body shadow-[0_0_20px_rgba(255,215,0,0.3)] hover:shadow-[0_0_30px_rgba(255,215,0,0.5)] hover:-translate-y-1 transition-all duration-300"
          >
            Register Now
          </Link>
          <Link
            to="/admin"
            className="px-8 py-3 rounded-lg border border-gold/40 bg-navy/50 backdrop-blur-sm text-primary-foreground font-semibold font-body hover:bg-gold/10 hover:-translate-y-1 transition-all duration-300"
          >
            Admin Login
          </Link>
        </div>
      </div>
    </div>
  );
};

export default HeroSection;
