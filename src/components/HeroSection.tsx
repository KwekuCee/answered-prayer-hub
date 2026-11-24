import { Link } from "react-router-dom";
import { ArrowRight, ChevronDown, LogIn } from "lucide-react";

/** Cinematic full-screen hero: venue background with centered call-to-action buttons only. */
const HeroSection = () => {
  return (
    <section className="relative min-h-[100svh] flex items-center md:items-end justify-center overflow-hidden bg-background">
      {/* Background with slow cinematic zoom */}
      <div className="absolute inset-0 hero-bg md:animate-[heroZoom_20s_ease-out_forwards]" />

      {/* Cinematic grading: top fade for navbar, vignette, bottom blend into page */}
      <div className="hidden md:block absolute inset-0 bg-gradient-to-b from-background/80 via-background/10 to-background" />
      <div className="hidden md:block absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_35%,hsl(var(--background)/0.85)_100%)]" />
      <div className="hidden md:block absolute left-1/2 top-[85%] -translate-x-1/2 -translate-y-1/2 w-[38rem] h-[14rem] bg-gold/15 rounded-full blur-[110px] pointer-events-none" />

      {/* Letterbox lines */}
      <div className="hidden md:block absolute top-24 inset-x-0 h-px bg-gradient-to-r from-transparent via-gold/30 to-transparent" />
      <div className="hidden md:block absolute bottom-20 inset-x-0 h-px bg-gradient-to-r from-transparent via-gold/30 to-transparent" />

      <div className="relative md:static z-10 w-full px-6 pt-[calc(50svh+225px)] md:pt-0 self-start md:self-auto pb-28 md:pb-32 flex flex-col items-center justify-center gap-8">
        <div className="flex flex-row items-center justify-center gap-3 sm:gap-5 p-3 rounded-full bg-background/30 border border-gold/20 backdrop-blur-md shadow-2xl animate-fade-up">
          <Link
            to="/register"
            className="group inline-flex items-center gap-2 px-6 sm:px-9 py-3.5 sm:py-4 rounded-full bg-gradient-gold text-navy font-bold font-body tracking-wide shadow-gold hover:-translate-y-0.5 hover:shadow-[0_0_40px_hsl(var(--gold)/0.5)] transition-all"
          >
            Register Now
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </Link>
          <Link
            to="/admin"
            className="inline-flex items-center gap-2 px-6 sm:px-9 py-3.5 sm:py-4 rounded-full border border-foreground/25 text-foreground font-bold font-body tracking-wide hover:border-gold hover:text-gold transition-all"
          >
            <LogIn className="w-4 h-4" />
            Login
          </Link>
        </div>
      </div>

      <a
        href="#about"
        aria-label="Scroll down"
        className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-1 text-foreground/60 hover:text-gold text-[10px] uppercase tracking-[0.35em] transition-colors"
      >
        Scroll
        <ChevronDown className="w-4 h-4 animate-bounce" />
      </a>
    </section>
  );
};

export default HeroSection;
