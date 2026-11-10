import React, { useState, useEffect, useRef } from "react";
import { Play, Pause, Music, Disc, Volume2, VolumeX } from "lucide-react";
import { motion, useScroll, useTransform } from "framer-motion";
import choristerCutout from "@/assets/images/chorister-cutout.webp";
import choristerImg from "@/assets/images/loveworld_chorister.webp";

const WORSHIP_SONGS = [
  {
    id: 1,
    title: "I'm Satisfied in Your Love",
    artist: "Loveworld Music & Arts",
    album: "Korle Bu Stands in Worship 2026",
    duration: "4:45",
    audioUrl: "/audio/track-1-satisfied-in-love.wav" 
  },
  {
    id: 2,
    title: "The Great I Am",
    artist: "Loveworld Singers",
    album: "Korle Bu Stands in Worship Live",
    duration: "5:20",
    audioUrl: "/audio/track-2-the-great-i-am.wav"
  },
  {
    id: 3,
    title: "You Are Great",
    artist: "Loveworld Classics",
    album: "Worship & Glory",
    duration: "6:10",
    audioUrl: "/audio/track-3-you-are-great.wav"
  },
  {
    id: 4,
    title: "Awesome God",
    artist: "Korle Bu Mass Choir",
    album: "Stands in Worship Hymns",
    duration: "4:55",
    audioUrl: "/audio/track-4-awesome-god.wav"
  },
  {
    id: 5,
    title: "Holy Are You Lord",
    artist: "Loveworld Worship Ministers",
    album: "Divine Encounter Anthem",
    duration: "5:12",
    audioUrl: "/audio/track-5-holy-are-you-lord.wav"
  }
];

export const WorshipStickySection = () => {
  const [activeSongIndex, setActiveSongIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isInSection, setIsInSection] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end end"]
  });

  // Map scroll progress to active song index (0 to 4)
  const songIndexTransform = useTransform(scrollYProgress, [0, 0.9], [0, WORSHIP_SONGS.length - 1]);

  // Monitor whether user is inside the section
  useEffect(() => {
    const handleScrollBounds = () => {
      if (!sectionRef.current) return;
      const rect = sectionRef.current.getBoundingClientRect();
      const inView = rect.top <= 80 && rect.bottom >= window.innerHeight * 0.2;
      
      setIsInSection(inView);
      if (!inView) {
        setIsPlaying(false);
        if (audioRef.current) audioRef.current.pause();
      }
    };

    window.addEventListener("scroll", handleScrollBounds, { passive: true });
    handleScrollBounds();
    return () => window.removeEventListener("scroll", handleScrollBounds);
  }, []);

  // Update song on scroll and auto-play when active in section
  useEffect(() => {
    return songIndexTransform.on("change", (latest) => {
      const idx = Math.min(WORSHIP_SONGS.length - 1, Math.max(0, Math.round(latest)));
      setActiveSongIndex((prev) => {
        if (prev !== idx) {
          return idx;
        }
        return prev;
      });

      if (!isPlaying && isInSection) {
        setIsPlaying(true);
      }
    });
  }, [songIndexTransform, isPlaying, isInSection]);

  // Handle audio playback when active song or playing state changes
  useEffect(() => {
    if (!audioRef.current) return;
    if (isPlaying && isInSection) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch((err) => {
        console.debug("Autoplay note:", err);
      });
    } else {
      audioRef.current.pause();
    }
  }, [isPlaying, activeSongIndex, isInSection]);

  const currentSong = WORSHIP_SONGS[activeSongIndex];

  const togglePlay = () => {
    setIsPlaying(!isPlaying);
  };

  const wheelPos = useTransform(scrollYProgress, [0, 0.9], [0, WORSHIP_SONGS.length - 1]);
  const [pos, setPos] = useState(0);
  useEffect(() => wheelPos.on("change", setPos), [wheelPos]);

  return (
    <section ref={sectionRef} style={{ height: `${(WORSHIP_SONGS.length + 1) * 100}vh` }} className="relative">
      <div className="sticky top-0 h-screen overflow-hidden">
        {/* Full-section photo background (WebP with lazy loading) */}
        <img 
          src={choristerImg} 
          alt="" 
          aria-hidden 
          loading="lazy"
          decoding="async"
          className="absolute inset-0 w-full h-full object-cover scale-110 blur-sm" 
        />
        <div className="absolute inset-0 bg-background/80" />
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/40 to-background/90" />

        <div className="relative max-w-7xl mx-auto h-full grid grid-cols-1 lg:grid-cols-2 items-end lg:items-center px-4 pt-20">
          {/* Singer cut-out (WebP with lazy loading) */}
          <div className="hidden lg:flex h-full items-end justify-center pointer-events-none">
            <img 
              src={choristerCutout} 
              alt="Loveworld chorister" 
              loading="lazy"
              decoding="async"
              className="max-h-[92%] w-auto object-contain drop-shadow-2xl" 
            />
          </div>

          <div className="space-y-6 pb-10 lg:pb-0">
            <div className="flex items-center justify-between">
              <div>
                <div className="inline-flex items-center gap-2 text-gold text-xs uppercase tracking-[0.3em] font-semibold">
                  <Music className="w-4 h-4" /> Live Scroll Worship Stream
                </div>
                <h2 className="text-4xl md:text-6xl font-display font-bold text-foreground mt-2">
                  Anointed <span className="bg-gradient-gold bg-clip-text text-transparent italic">Worship Anthems</span>
                </h2>
              </div>

              <button
                onClick={() => {
                  if (audioRef.current) {
                    audioRef.current.muted = !isMuted;
                    setIsMuted(!isMuted);
                  }
                }}
                className="p-3 rounded-full bg-zinc-900/80 border border-gold/30 text-gold hover:bg-gold/10 transition-colors"
                title={isMuted ? "Unmute audio" : "Mute audio"}
                aria-label={isMuted ? "Unmute audio" : "Mute audio"}
              >
                {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
              </button>
            </div>

            {/* Scroll wheel */}
            <div className="relative h-[380px]" style={{ perspective: 1000 }}>
              {WORSHIP_SONGS.map((song, idx) => {
                const d = idx - pos;
                const isActive = idx === activeSongIndex;
                const ad = Math.abs(d);
                return (
                  <div
                    key={song.id}
                    className={`absolute left-0 right-0 top-1/2 rounded-2xl border p-5 flex items-center gap-4 backdrop-blur-xl transition-colors ${isActive ? "border-gold bg-card/90 shadow-gold" : "border-border bg-card/50"}`}
                    style={{
                      transform: `translateY(calc(-50% + ${d * 110}px)) rotateX(${-d * 22}deg) scale(${1 - Math.min(ad, 3) * 0.08})`,
                      opacity: Math.max(0, 1 - ad * 0.35),
                      zIndex: 10 - Math.round(ad),
                      pointerEvents: isActive ? "auto" : "none",
                    }}
                  >
                    <div className={`w-14 h-14 rounded-full bg-gradient-gold flex items-center justify-center shrink-0 ${isActive && isPlaying ? "animate-spin" : ""}`} style={{ animationDuration: "6s" }}>
                      <Disc className="w-7 h-7 text-navy" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-[10px] font-semibold text-gold uppercase tracking-widest">Track {idx + 1} of {WORSHIP_SONGS.length} · {song.duration}</span>
                      <h3 className="text-lg md:text-xl font-display font-bold text-foreground truncate">{song.title}</h3>
                      <p className="text-xs text-muted-foreground font-body truncate">{song.artist} • {song.album}</p>
                    </div>
                    {isActive && (
                      <button onClick={togglePlay} aria-label={isPlaying ? "Pause" : "Play"} className="w-12 h-12 rounded-full bg-gold text-navy flex items-center justify-center shrink-0 active:scale-95">
                        {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex gap-2">
              {WORSHIP_SONGS.map((s, i) => (
                <div key={s.id} className={`h-1 rounded-full transition-all ${i === activeSongIndex ? "w-10 bg-gold" : "w-4 bg-muted"}`} />
              ))}
            </div>
          </div>
        </div>
      </div>

      <audio ref={audioRef} src={currentSong.audioUrl} loop />
    </section>
  );
};

export default WorshipStickySection;
