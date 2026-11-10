import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import AboutSection from "@/components/AboutSection";
import LaunchOutlineSection from "@/components/LaunchOutlineSection";
import LocationSection from "@/components/LocationSection";
import WorshipStickySection from "@/components/WorshipStickySection";
import PrayerPointsSection from "@/components/PrayerPointsSection";
import BusPointsSection from "@/components/BusPointsSection";
import TestimonyGrid from "@/components/TestimonyGrid";
import SocialMediaSection from "@/components/SocialMediaSection";
import ScrollRevealSection from "@/components/ScrollRevealSection";

const Index = () => {
  return (
    <div className="min-h-screen bg-background relative selection:bg-gold/30 selection:text-gold-light">
      <Navbar />
      <HeroSection />

      <ScrollRevealSection>
        <AboutSection />
      </ScrollRevealSection>

      <ScrollRevealSection>
        <LaunchOutlineSection />
      </ScrollRevealSection>

      <ScrollRevealSection>
        <LocationSection />
      </ScrollRevealSection>

      {/* Anointed Worship Anthems Section with interactive scroll-linked wheel */}
      <WorshipStickySection />
      
      {/* Confidential Prayer Points Submission */}
      <ScrollRevealSection>
        <PrayerPointsSection />
      </ScrollRevealSection>

      {/* Free Bus Services */}
      <ScrollRevealSection>
        <BusPointsSection />
      </ScrollRevealSection>

      {/* Approved Testimonies Grid */}
      <ScrollRevealSection>
        <TestimonyGrid />
      </ScrollRevealSection>

      <ScrollRevealSection>
        <SocialMediaSection />
      </ScrollRevealSection>

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
