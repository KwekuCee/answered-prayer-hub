import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import AboutSection from "@/components/AboutSection";
import LaunchOutlineSection from "@/components/LaunchOutlineSection";
import LocationSection from "@/components/LocationSection";
import WorshipStickySection from "@/components/WorshipStickySection";
import SocialMediaSection from "@/components/SocialMediaSection";
import PrayerPointsSection from "@/components/PrayerPointsSection";
import BusPointsSection from "@/components/BusPointsSection";
import { TestimonialMarquee } from "@/components/TestimonialMarquee";

const Index = () => {
  return (
    <div className="min-h-screen bg-background relative selection:bg-gold/30 selection:text-gold-light">
      <Navbar />
      <HeroSection />

      <AboutSection />
      <LaunchOutlineSection />
      <LocationSection />
      <WorshipStickySection />
      <PrayerPointsSection />
      <BusPointsSection />

      {/* Testimonies Section */}
      <section id="testimonies" className="pt-24 pb-12 px-4 relative overflow-hidden bg-background">
        <div className="max-w-3xl mx-auto relative z-10 text-center animate-fade-up">
          <h2 className="text-3xl md:text-5xl font-display font-bold text-foreground mb-4">
            Real <span className="bg-gradient-gold bg-clip-text text-transparent">Testimonies</span>
          </h2>
          <p className="text-muted-foreground font-body text-lg">
            Read inspiring stories of answered prayers from our global community.
          </p>
        </div>
      </section>

      <div className="pb-16 bg-background">
        <TestimonialMarquee />
      </div>

      <SocialMediaSection />

      {/* Footer */}
      <footer className="py-10 border-t border-border text-center bg-background">
        <p className="text-sm text-muted-foreground font-body font-medium">
          © {new Date().getFullYear()} Korle Bu Stands in Worship. All rights reserved. | Developed by <a href="https://primehaven.tech" target="_blank" rel="noopener noreferrer" className="text-gold hover:text-gold-light hover:underline transition-colors font-semibold">Prime Haven</a>
        </p>
      </footer>
    </div>
  );
};

export default Index;
