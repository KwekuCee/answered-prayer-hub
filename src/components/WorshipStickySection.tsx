import React, { useState, useEffect, useRef } from "react";
import { Play, Pause, Music, Sparkles, Disc } from "lucide-react";
import { motion, useScroll, useTransform } from "framer-motion";
import choristerImg from "@/assets/images/loveworld_chorister_1794092420351.jpg";

const WORSHIP_SONGS = [
  {
    id: 1,
    title: "I'm Satisfied in Your Love",
    artist: "Loveworld Music & Arts",
    album: "Korle Bu Stands in Worship 2026",
    duration: "4:45",
    audioUrl: "https://actions.google.com/sounds/v1/ambiences/coffee_shop.ogg" 
  },
  {
    id: 2,
    title: "The Great I Am",
    artist: "Loveworld Singers",
    album: "Korle Bu Stands in Worship Live",
    duration: "5:20",
    audioUrl: "https://actions.google.com/sounds/v1/weather/light_rain.ogg"
  },
  {
    id: 3,
    title: "You Are Great",
    artist: "Loveworld Classics",
    album: "Worship & Glory",
    duration: "6:10",
    audioUrl: "https://actions.google.com/sounds/v1/ambiences/daytime_forest_bonfire.ogg"
  },
  {
    id: 4,
    title: "Awesome God",
    artist: "Korle Bu Mass Choir",
    album: "Stands in Worship Hymns",
    duration: "4:55",
    audioUrl: "https://actions.google.com/sounds/v1/weather/wind_heavy.ogg"
  },
  {
    id: 5,
    title: "Holy Are You Lord",
    artist: "Loveworld Worship Ministers",
    album: "Divine Encounter Anthem",
    duration: "5:12",
    audioUrl: "https://actions.google.com/sounds/v1/ambiences/outdoor_ambience_train.ogg"
  }
];

export const WorshipStickySection = () => {
  const [activeSongIndex, setActiveSongIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end end"]
  });

  // Map scroll progress to active song index (0 to 4)
  const songIndexTransform = useTransform(scrollYProgress, [0, 1], [0, WORSHIP_SONGS.length - 1]);

  useEffect(() => {
    return songIndexTransform.onChange((latest) => {
      const idx = Math.min(WORSHIP_SONGS.length - 1, Math.max(0, Math.round(latest)));
      if (idx !== activeSongIndex) {
        setActiveSongIndex(idx);
        setIsPlaying(true);
      }
    });
  }, [songIndexTransform, activeSongIndex]);

  // Handle audio play/pause and auto-stop outside section bounds
  useEffect(() => {
    const handleScrollBounds = () => {
      if (!sectionRef.current) return;
      const rect = sectionRef.current.getBoundingClientRect();
      const inView = rect.top <= 0 && rect.bottom >= window.innerHeight;
      if (!inView && rect.top > 0) {
        setIsPlaying(false);
      } else if (rect.bottom < 0) {
        setIsPlaying(false);
      }
    };

    window.addEventListener("scroll", handleScrollBounds, { passive: true });
    return () => window.removeEventListener("scroll", handleScrollBounds);
  }, []);

  useEffect(() => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.play().catch((err) => {
        console.warn("Audio autoplay prevented or failed:", err);
        setIsPlaying(false);
      });
    } else {
      audioRef.current.pause();
    }
  }, [isPlaying, activeSongIndex]);

  const currentSong = WORSHIP_SONGS[activeSongIndex];

  const togglePlay = () => {
    setIsPlaying(!isPlaying);
  };

  return (
    <section ref={sectionRef} className="relative h-[500vh] bg-background">
      <div className="sticky top-20 h-[calc(100vh-5rem)] flex items-center justify-center overflow-hidden px-4 py-8">
        
        {/* Full Section Background Fill */}
        <div className="absolute inset-0 bg-black pointer-events-none -z-20"></div>
        <div className="absolute top-1/4 right-1/4 w-[600px] h-[600px] bg-gold/10 rounded-full blur-[180px] pointer-events-none -z-10"></div>

        <div className="max-w-7xl w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-center h-full">
          
          {/* Left Side: Chorister Standing in Background */}
          <div className="lg:col-span-5 relative h-full flex items-end justify-center pointer-events-none">
            <div className="relative w-full max-w-lg h-[90%] flex items-end justify-center">
              <div className="absolute inset-x-12 bottom-0 h-4/5 bg-gold/20 rounded-full blur-[100px]"></div>
              
              <img
                src={choristerImg}
                alt="Loveworld Chorister Worship Leader"
                className="relative z-10 w-full h-full object-cover object-top filter drop-shadow-[0_20px_40px_rgba(0,0,0,0.95)]"
                style={{
                  maskImage: "linear-gradient(to bottom, black 75%, transparent 100%)",
                  WebkitMaskImage: "linear-gradient(to bottom, black 75%, transparent 100%)"
                }}
              />

              <div className="absolute bottom-10 left-4 z-20 p-3.5 bg-black/70 backdrop-blur-md rounded-2xl border border-gold/40 shadow-gold flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gold/20 flex items-center justify-center shrink-0">
                  <Sparkles className="w-4 h-4 text-gold animate-pulse" />
                </div>
                <div>
                  <h4 className="font-display font-bold text-foreground text-xs">Loveworld Minister</h4>
                  <p className="text-[10px] text-gold uppercase tracking-wider font-semibold">Scroll-Linked Worship Stream</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Side: Framer Motion Scroll-Linked Soundtrack Cards */}
          <div className="lg:col-span-7 flex flex-col justify-center space-y-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-gold/10 border border-gold/30 rounded-full text-xs font-semibold uppercase tracking-wider text-gold">
                <Music className="w-3.5 h-3.5" /> Framer Motion Scroll-Linked Experience
              </div>
              <h2 className="text-3xl md:text-5xl font-display font-bold text-foreground">
                Anointed <span className="bg-gradient-gold bg-clip-text text-transparent">Worship Anthems</span>
              </h2>
              <p className="text-muted-foreground font-body text-sm md:text-base">
                Scroll to dynamically fade soundtrack cards in and out while triggering anointed audio streams automatically.
              </p>
            </div>

            {/* Soundtrack Cards Container */}
            <div className="relative w-full h-[320px] flex items-center justify-center">
              {WORSHIP_SONGS.map((song, idx) => {
                const isActive = activeSongIndex === idx;

                return (
                  <motion.div
                    key={song.id}
                    initial={{ opacity: 0, y: 30, scale: 0.95 }}
                    animate={{
                      opacity: isActive ? 1 : 0,
                      y: isActive ? 0 : idx < activeSongIndex ? -40 : 40,
                      scale: isActive ? 1 : 0.95,
                      zIndex: isActive ? 30 : 10
                    }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                    className={`absolute inset-0 bg-zinc-950/95 backdrop-blur-2xl border rounded-3xl p-6 md:p-8 shadow-[0_20px_50px_rgba(0,0,0,0.9)] space-y-6 ${
                      isActive ? "border-gold shadow-gold/20 pointer-events-auto" : "border-zinc-800 pointer-events-none"
                    }`}
                  >
                    <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-gold/15 rounded-full blur-3xl pointer-events-none"></div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`w-16 h-16 rounded-2xl bg-gradient-gold flex items-center justify-center shadow-gold ${isActive && isPlaying ? 'animate-spin' : ''}`} style={{ animationDuration: '6s' }}>
                          <Disc className="w-8 h-8 text-navy" />
                        </div>
                        <div>
                          <span className="text-xs font-semibold text-gold uppercase tracking-widest">Track {idx + 1} of {WORSHIP_SONGS.length}</span>
                          <h3 className="text-xl md:text-2xl font-display font-bold text-foreground mt-0.5">{song.title}</h3>
                          <p className="text-sm text-muted-foreground font-body">{song.artist} • {song.album}</p>
                        </div>
                      </div>

                      {isActive && (
                        <button
                          onClick={togglePlay}
                          className="w-14 h-14 rounded-full bg-gold text-navy hover:bg-gold-light flex items-center justify-center shadow-gold transition-transform active:scale-95 shrink-0"
                          aria-label={isPlaying ? "Pause" : "Play"}
                        >
                          {isPlaying ? <Pause className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current ml-0.5" />}
                        </button>
                      )}
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-2">
                      <div className="w-full bg-zinc-900 h-2 rounded-full overflow-hidden">
                        <motion.div
                          className="bg-gradient-gold h-full"
                          animate={{ width: isActive ? `${((idx + 1) / WORSHIP_SONGS.length) * 100}%` : '0%' }}
                          transition={{ duration: 0.5 }}
                        ></motion.div>
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground font-body">
                        <span>{isActive && isPlaying ? "Playing Automatically" : "Scroll to Trigger"}</span>
                        <span>{song.duration}</span>
                      </div>
                    </div>

                    <div className="pt-2 text-xs font-body text-muted-foreground flex items-center justify-between">
                      <span>Korle Bu Stands in Worship 2026</span>
                      <span className="text-gold font-semibold">Loveworld Music Ministry</span>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Scroll Indicator */}
            <div className="flex items-center gap-2 text-xs text-muted-foreground font-body animate-pulse pt-2">
              <div className="w-2 h-2 rounded-full bg-gold"></div>
              <span>Scroll down to trigger Framer Motion scroll-linked animations and auto-play</span>
            </div>

          </div>

        </div>
      </div>

      <audio
        ref={audioRef}
        src={currentSong.audioUrl}
        loop
      />
    </section>
  );
};

export default WorshipStickySection;
