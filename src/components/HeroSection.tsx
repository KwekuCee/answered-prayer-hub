import { Link } from "react-router-dom";
import { ArrowRight, ChevronDown, LogIn } from "lucide-react";
import HeroCountdown from "./HeroCountdown";

/** Cinematic full-screen hero: venue background with countdown and call-to-action buttons. */
const HeroSection = () => {
  return (
    <section className="relative min-h-[100svh] flex items-end justify-center overflow-hidden bg-background">
      {/* Background with slow cinematic zoom */}
      <div className="absolute inset-0 hero-bg md:animate-[heroZoom_20s_ease-out_forwards]" />

      {/* Cinematic grading: top fade for navbar, vignette, bottom blend into page */}
      <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/10 to-background pointer-events-none" />
      <div className="absolute inset-x-0 bottom-0 h-[42%] bg-gradient-to-t from-background via-background/80 to-transparent pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_35%,hsl(var(--background)/0.85)_100%)] pointer-events-none" />
      <div className="absolute left-1/2 top-[85%] -translate-x-1/2 -translate-y-1/2 w-[24rem] md:w-[38rem] h-[12rem] md:h-[14rem] bg-gold/15 rounded-full blur-[110px] pointer-events-none" />

      {/* Letterbox lines */}
      <div className="absolute top-24 inset-x-0 h-px bg-gradient-to-r from-transparent via-gold/30 to-transparent pointer-events-none" />
      <div className="absolute bottom-14 md:bottom-12 inset-x-0 h-px bg-gradient-to-r from-transparent via-gold/30 to-transparent pointer-events-none" />

      <div className="relative z-10 w-full px-4 sm:px-6 pt-32 pb-20 md:pb-16 flex flex-col items-center justify-center gap-3.5 sm:gap-4">
        <HeroCountdown />

        <div className="flex flex-row items-center justify-center gap-3 sm:gap-4 p-2 sm:p-2.5 rounded-full bg-background/50 border border-gold/25 backdrop-blur-md shadow-2xl animate-fade-up">
          <Link
            to="/register"
            className="group inline-flex items-center gap-2 px-5 sm:px-8 py-3 sm:py-3.5 rounded-full bg-gradient-gold text-navy font-bold font-body tracking-wide shadow-gold hover:-translate-y-0.5 hover:shadow-[0_0_40px_hsl(var(--gold)/0.5)] transition-all whitespace-nowrap"
          >
            Register Now
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </Link>
          <Link
            to="/admin"
            className="inline-flex items-center gap-2 px-5 sm:px-8 py-3 sm:py-3.5 rounded-full border border-foreground/25 text-foreground font-bold font-body tracking-wide hover:border-gold hover:text-gold transition-all whitespace-nowrap"
          >
            <LogIn className="w-4 h-4" />
            Login
          </Link>
        </div>
      </div>

      <a
        href="#about"
        aria-label="Scroll down"
        className="absolute bottom-3.5 md:bottom-3 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-0.5 text-foreground/60 hover:text-gold text-[10px] uppercase tracking-[0.35em] transition-colors"
      >
        Scroll
        <ChevronDown className="w-4 h-4 animate-bounce" />
      </a>
    </section>
  );
};

export default HeroSection;
