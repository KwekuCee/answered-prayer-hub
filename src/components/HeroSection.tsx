import heroBg from "@/assets/hero-bg.jpg";
import logo from "@/assets/logo.png";

const HeroSection = () => {
  return (
    <div className="relative min-h-[70vh] flex items-center justify-center overflow-hidden">
      {/* Background image (replace with video element when video is available) */}
      <div className="absolute inset-0">
        <img
          src={heroBg}
          alt="Prayer background"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-navy/80 via-navy/60 to-background" />
      </div>

      {/* Content */}
      <div className="relative z-10 text-center px-4 max-w-3xl mx-auto animate-fade-up">
        <img src={logo} alt="100% Answered Prayer" className="w-64 md:w-80 mx-auto mb-6" />
        <p className="text-lg md:text-xl text-primary-foreground/80 font-body max-w-xl mx-auto mb-8">
          Register for the program, invite others, and be part of a movement
          that transforms lives through the power of prayer.
        </p>
        <div className="flex flex-wrap gap-4 justify-center">
          <a
            href="#register"
            className="px-8 py-3 rounded-lg bg-gradient-gold text-accent-foreground font-semibold font-body shadow-gold hover:opacity-90 transition-opacity"
          >
            Register Now
          </a>
          <a
            href="/admin"
            className="px-8 py-3 rounded-lg border border-gold/30 text-primary-foreground font-semibold font-body hover:bg-gold/10 transition-colors"
          >
            Admin Login
          </a>
        </div>
      </div>

      {/* Video placeholder note */}
      {/* To use a video instead, replace the <img> above with:
        <video autoPlay muted loop playsInline className="w-full h-full object-cover">
          <source src="/your-video.mp4" type="video/mp4" />
        </video>
      */}
    </div>
  );
};

export default HeroSection;
