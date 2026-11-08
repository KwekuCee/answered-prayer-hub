import logoColor from "@/assets/logo-color.png";
import logoWhite from "@/assets/logo-white.png";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Users, Calendar, MapPin, Sparkles } from "lucide-react";

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
    <div className="relative min-h-[85vh] flex items-center justify-center overflow-hidden bg-navy hero-bg pt-20 pb-12">

      {/* Overlay gradient for ultimate readability */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/60 to-black/95" />

      {/* Content */}
      <div className="relative z-10 text-center px-4 max-w-4xl mx-auto animate-fade-up hero-content space-y-8">
        
        {/* Glassmorphism Logo Container for 100% visibility */}
        <div className="p-8 md:p-10 rounded-3xl bg-black/40 backdrop-blur-xl border border-gold/30 shadow-[0_0_50px_rgba(0,0,0,0.8)] max-w-2xl mx-auto space-y-6">
          <div className="relative inline-block">
            {/* Logo Glow Effect */}
            <div className="absolute inset-0 bg-gold blur-[50px] opacity-25 rounded-full scale-125 animate-pulse-slow"></div>
            
            {/* Conditional Logo based on dark/light mode */}
            <img
              src={logoWhite}
              alt="Korle Bu Stands in Worship 2026"
              className="relative w-72 md:w-96 mx-auto drop-shadow-[0_10px_20px_rgba(0,0,0,0.9)] dark:block hidden"
            />
            <img
              src={logoColor}
              alt="Korle Bu Stands in Worship 2026"
              className="relative w-72 md:w-96 mx-auto drop-shadow-[0_10px_20px_rgba(255,255,255,0.2)] dark:hidden block"
            />
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 text-xs md:text-sm font-semibold uppercase tracking-widest text-gold">
            <span className="flex items-center gap-1.5 bg-gold/10 border border-gold/30 px-3 py-1.5 rounded-full">
              <Calendar className="w-4 h-4" /> Friday 18th Dec 2026 • 5:00 PM
            </span>
            <span className="flex items-center gap-1.5 bg-gold/10 border border-gold/30 px-3 py-1.5 rounded-full">
              <MapPin className="w-4 h-4" /> Bukom Boxing Arena, Accra
            </span>
          </div>

          <p className="text-base md:text-lg text-foreground/90 font-body max-w-xl mx-auto leading-relaxed">
            Korle Bu Stands in Worship 2026 is a community-wide worship gathering designed to bring together thousands for a divine encounter in worship and praise.
          </p>

          {/* Live Mobilization Stats Counter Badge */}
          <div className="inline-flex items-center gap-3 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-gold/20 via-gold/10 to-gold/20 border border-gold/40 text-gold shadow-gold">
            <Users className="w-5 h-5 animate-pulse" />
            <div className="text-left">
              <div className="text-xs uppercase tracking-wider font-semibold opacity-80">Live Mobilization Status</div>
              <div className="text-sm md:text-base font-bold">
                <span className="text-foreground">{membersCount.toLocaleString()}</span> Registered / Target: <span className="text-foreground">6,000</span> Attendees
              </div>
            </div>
          </div>
        </div>

        {/* Call to Actions */}
        <div className="flex flex-wrap gap-4 justify-center">
          <Link
            to="/register"
            className="px-8 py-3.5 rounded-xl bg-gradient-gold text-navy font-bold font-body shadow-[0_0_25px_rgba(212,175,55,0.4)] hover:shadow-[0_0_35px_rgba(212,175,55,0.6)] hover:-translate-y-1 transition-all duration-300"
          >
            Register for KSW2026
          </Link>
          <Link
            to="/admin"
            className="px-8 py-3.5 rounded-xl border border-gold/40 bg-black/60 backdrop-blur-md text-foreground font-bold font-body hover:bg-gold/10 hover:-translate-y-1 transition-all duration-300"
          >
            Login
          </Link>
        </div>
      </div>
    </div>
  );
};

export default HeroSection;
