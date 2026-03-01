import heroBg from "@/assets/hero-bg.jpg";

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
        <div className="inline-block mb-4 px-4 py-1.5 rounded-full border border-gold/30 bg-gold/10">
          <span className="text-sm font-medium text-gold-light font-body tracking-wide">
            ✦ Join the Movement ✦
          </span>
        </div>
        <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold font-display text-primary-foreground mb-6 leading-tight">
          100% Answered{" "}
          <span className="text-gradient-gold">Prayer</span>
        </h1>
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
