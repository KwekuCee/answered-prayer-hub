import React, { Suspense } from "react";
import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import ScrollRevealSection from "@/components/ScrollRevealSection";

const AboutSection = React.lazy(() => import("@/components/AboutSection"));
const LaunchOutlineSection = React.lazy(() => import("@/components/LaunchOutlineSection"));
const LocationSection = React.lazy(() => import("@/components/LocationSection"));
const WorshipStickySection = React.lazy(() => import("@/components/WorshipStickySection"));
const PrayerPointsSection = React.lazy(() => import("@/components/PrayerPointsSection"));
const BusPointsSection = React.lazy(() => import("@/components/BusPointsSection"));
const TestimonyGrid = React.lazy(() => import("@/components/TestimonyGrid"));
const SocialMediaSection = React.lazy(() => import("@/components/SocialMediaSection"));

const SectionFallback = () => (
  <div className="py-20 flex items-center justify-center">
    <div className="h-8 w-8 rounded-full border-2 border-gold/40 border-t-gold animate-spin" />
  </div>
);

const Index = () => {
  return (
    <div className="min-h-screen bg-background relative selection:bg-gold/30 selection:text-gold-light">
      <Navbar />
      <HeroSection />

      <Suspense fallback={<SectionFallback />}>
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
      </Suspense>

      {/* Footer */}
      <footer className="py-10 border-t border-border text-center bg-background">
        <p className="text-sm text-muted-foreground font-body font-medium">
          © {new Date().getFullYear()} Korle Bu Stands in Worship. All rights reserved. | Developed by{" "}
          <a
            href="https://primehaven.tech"
            target="_blank"
            rel="noopener noreferrer"
            className="text-gold hover:text-gold-light hover:underline transition-colors font-semibold"
          >
            Prime Haven
          </a>
        </p>
      </footer>
    </div>
  );
};

export default Index;
