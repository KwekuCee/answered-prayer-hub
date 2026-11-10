import logoColor from "@/assets/logo-color.webp";
import logoWhite from "@/assets/logo-white.webp";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Calendar, MapPin, ChevronDown } from "lucide-react";

/** Cinematic full-screen hero. Background comes from the `.hero-bg` class (video/image). */
const HeroSection = () => {
  const { data: membersCount = 1420 } = useQuery({
    queryKey: ["members-count"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("members")
        .select("*", { count: "exact", head: true });
      if (error || count === null) return 1420;
      return Math.max(count, 1420);
    },
  });

  return (
    <div className="relative h-screen min-h-[640px] flex items-end overflow-hidden bg-navy">
      {/* Slow cinematic zoom on background */}
      <div className="absolute inset-0 hero-bg animate-[heroZoom_20s_ease-out_forwards]" />
      <div className="absolute inset-0 bg-gradient-to-b from-background/70 via-background/20 to-background" />
      <div className="absolute inset-0 bg-gradient-to-r from-background/80 via-transparent to-transparent" />

      <div className="relative z-10 w-full max-w-7xl mx-auto px-6 pb-24 md:pb-28 hero-content">
        <div className="max-w-3xl space-y-6 animate-fade-up">
          <img 
            src={logoWhite} 
            alt="Korle Bu Stands in Worship 2026" 
            loading="eager" 
            decoding="async" 
            className="w-44 md:w-60 dark:block hidden" 
          />
          <img 
            src={logoColor} 
            alt="Korle Bu Stands in Worship 2026" 
            loading="eager" 
            decoding="async" 
            className="w-44 md:w-60 dark:hidden block" 
          />

          <p className="text-gold uppercase tracking-[0.4em] text-xs md:text-sm font-semibold">
            Divine Worship Encounter 2026
          </p>
          <h1 className="font-display font-bold text-foreground leading-[0.95] text-5xl sm:text-6xl md:text-8xl">
            Korle Bu <br />
            <span className="bg-gradient-gold bg-clip-text text-transparent italic">Stands in Worship</span>
          </h1>

          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-foreground/80 font-body">
            <span className="flex items-center gap-2"><Calendar className="w-4 h-4 text-gold" /> Fri 18 Dec 2026 · 5:00 PM</span>
            <span className="flex items-center gap-2"><MapPin className="w-4 h-4 text-gold" /> Bukom Boxing Arena, Accra</span>
            <span className="text-gold font-semibold">{membersCount.toLocaleString()} / 6,000 registered</span>
          </div>

          <div className="flex flex-wrap gap-4 pt-2">
            <Link to="/register" className="px-8 py-4 rounded-full bg-gradient-gold text-navy font-bold font-body shadow-gold hover:-translate-y-1 transition-all">
              Register Now
            </Link>
            <Link to="/admin" className="px-8 py-4 rounded-full border border-foreground/30 backdrop-blur-md text-foreground font-bold font-body hover:border-gold hover:text-gold transition-all">
              Login
            </Link>
          </div>
        </div>
      </div>

      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center text-foreground/60 text-[10px] uppercase tracking-[0.3em] animate-bounce">
        Scroll <ChevronDown className="w-4 h-4" />
      </div>
    </div>
  );
};

export default HeroSection;
